#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function runGit(args) {
  return spawnSync('git', args, { encoding: 'utf-8' });
}

const repoCheck = runGit(['rev-parse', '--is-inside-work-tree']);

if (repoCheck.status !== 0) {
  // 在非 Git 环境运行(例如 CI 安装依赖)，直接跳过。
  process.exit(0);
}

const desiredPath = '.githooks';
const current = runGit(['config', '--get', 'core.hooksPath']);

if (current.status === 0) {
  const value = current.stdout.trim();
  if (value === desiredPath) {
    console.log(`[hooks] core.hooksPath 已设置为 ${value}`);
    process.exit(0);
  }
}

const setResult = runGit(['config', 'core.hooksPath', desiredPath]);

if (setResult.status !== 0) {
  console.error('[hooks] 设置 core.hooksPath 失败:');
  console.error(setResult.stderr);
  process.exit(setResult.status ?? 1);
}

console.log(`[hooks] 已将 core.hooksPath 设置为 ${desiredPath}`);
