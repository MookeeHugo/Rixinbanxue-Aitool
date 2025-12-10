#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const patterns = [
  {
    label: 'Unicode 替换字符 (实际字符)',
    pattern: '\uFFFD'
  },
  {
    label: '常见 Windows 控制台乱码 (三连 U+FFFD)',
    pattern: '\uFFFD\uFFFD\uFFFD'
  }
];

const globIgnores = [
  '!node_modules/**',
  '!.git/**',
  '!.next/**',
  '!tmp/**',
  '!coverage/**',
  '!dist/**'
];

const violations = [];

function runRipgrep(pattern, label) {
  const args = [
    '--hidden',
    '--line-number',
    '--color',
    'never'
  ];

  globIgnores.forEach((glob) => {
    args.push('--glob');
    args.push(glob);
  });

  args.push(pattern);
  args.push('.');

  const result = spawnSync('rg', args, {
    encoding: 'utf-8'
  });

  if (result.error) {
    console.warn('[encoding-check] ⚠️  ripgrep 未安装，跳过编码检查');
    console.warn('[encoding-check] 提示：安装 ripgrep 以启用完整的编码验证');
    console.warn('[encoding-check] 安装方法: https://github.com/BurntSushi/ripgrep#installation');
    return; // 优雅降级：继续执行而不阻止提交
  }

  if (result.status === 0) {
    violations.push({ label, output: result.stdout.trim() });
    return;
  }

  if (result.status === 1) {
    return;
  }

  console.error(`[encoding-check] rg 执行失败(label=${label})，退出码: ${result.status}`);
  console.error(result.stderr);
  process.exit(result.status ?? 3);
}

patterns.forEach(({ pattern, label }) => runRipgrep(pattern, label));

if (violations.length > 0) {
  console.error('⛔ 检测到以下潜在乱码/替换字符，请先修复再提交:\n');
  violations.forEach(({ label, output }) => {
    console.error(`== ${label} ==`);
    console.error(output);
    console.error('');
  });
  console.error('提示: 请参考 docs/project-governance/project-status-tracker.md 的“乱码巡检”步骤进行修复。');
  process.exit(1);
}

console.log('[encoding-check] 未发现乱码或替换字符。');
