#!/usr/bin/env node

/**
 * 日志与黑匣子归档脚本
 * 功能：
 * 1. logs/failures：仅保留最近 N 天（默认 2 天），其余移动到 logs/archive/failures。
 * 2. logs/metrics/ingest-baseline.log：当文件超过阈值（默认 512KB）时滚动到 logs/archive/metrics。
 *
 * 可用环境变量：
 * - FAILURE_ACTIVE_DAYS：保留的天数，默认 2
 * - METRICS_ROTATE_BYTES：ingest-baseline.log 触发滚动的大小，默认 524288
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const LOG_ROOT = path.join(rootDir, 'logs');
const FAILURE_DIR = path.join(LOG_ROOT, 'failures');
const METRICS_FILE = path.join(LOG_ROOT, 'metrics', 'ingest-baseline.log');
const ARCHIVE_ROOT = path.join(LOG_ROOT, 'archive');
const FAILURE_ARCHIVE_DIR = path.join(ARCHIVE_ROOT, 'failures');
const METRICS_ARCHIVE_DIR = path.join(ARCHIVE_ROOT, 'metrics');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_FAILURE_DAYS = Number.isNaN(Number(process.env.FAILURE_ACTIVE_DAYS))
  ? 2
  : Number(process.env.FAILURE_ACTIVE_DAYS);
const FAILURE_ACTIVE_DAYS = Math.max(0, DEFAULT_FAILURE_DAYS);
const DEFAULT_METRICS_THRESHOLD = Number.isNaN(Number(process.env.METRICS_ROTATE_BYTES))
  ? 512 * 1024
  : Number(process.env.METRICS_ROTATE_BYTES);
const METRICS_ROTATE_BYTES = Math.max(16 * 1024, DEFAULT_METRICS_THRESHOLD); // 至少 16KB，避免频繁滚动

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function rotateFailureLogs() {
  if (!(await pathExists(FAILURE_DIR))) {
    return { archived: [] };
  }

  const dirEntries = await fs.readdir(FAILURE_DIR, { withFileTypes: true });
  const dateFolders = dirEntries
    .filter(entry => entry.isDirectory() && DATE_REGEX.test(entry.name))
    .map(entry => entry.name)
    .sort(); // 旧日期在前

  if (dateFolders.length <= FAILURE_ACTIVE_DAYS) {
    return { archived: [] };
  }

  const keepCount = FAILURE_ACTIVE_DAYS;
  const archiveTargets = dateFolders.slice(0, dateFolders.length - keepCount);
  const archived = [];

  await ensureDir(FAILURE_ARCHIVE_DIR);

  for (const folderName of archiveTargets) {
    const src = path.join(FAILURE_DIR, folderName);
    let dest = path.join(FAILURE_ARCHIVE_DIR, folderName);
    let suffix = 1;

    while (await pathExists(dest)) {
      dest = path.join(FAILURE_ARCHIVE_DIR, `${folderName}-${suffix.toString().padStart(2, '0')}`);
      suffix += 1;
    }

    await fs.rename(src, dest);
    archived.push({ date: folderName, target: dest });
  }

  return { archived };
}

function buildTimestamp() {
  const now = new Date();
  const pad = value => value.toString().padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
}

async function rotateMetricsLog() {
  if (!(await pathExists(METRICS_FILE))) {
    return { rotated: false };
  }

  const stats = await fs.stat(METRICS_FILE);
  if (stats.size < METRICS_ROTATE_BYTES) {
    return { rotated: false };
  }

  await ensureDir(METRICS_ARCHIVE_DIR);
  const archiveName = `ingest-baseline-${buildTimestamp()}.log`;
  const dest = path.join(METRICS_ARCHIVE_DIR, archiveName);

  await fs.rename(METRICS_FILE, dest);
  await fs.writeFile(METRICS_FILE, '', 'utf8');

  return { rotated: true, archivePath: dest, bytes: stats.size };
}

async function main() {
  const failureResult = await rotateFailureLogs();
  const metricsResult = await rotateMetricsLog();

  console.log(
    `[log-maintenance] failuresArchived=${failureResult.archived.length}, metricsRotated=${
      metricsResult.rotated ? 1 : 0
    }`
  );

  if (failureResult.archived.length > 0) {
    console.log('  → Archived failure dates:', failureResult.archived.map(item => item.date).join(', '));
  }

  if (metricsResult.rotated) {
    console.log(
      `  → ingest-baseline.log rotated (${metricsResult.bytes} bytes) → ${metricsResult.archivePath}`
    );
  }
}

main().catch(error => {
  console.error('[log-maintenance] 运行失败', error);
  process.exit(1);
});
