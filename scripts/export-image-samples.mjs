#!/usr/bin/env node
/**
 * 将 tests/image-samples.json 导出为 CSV。
 * 用法：node scripts/export-image-samples.mjs [output=tests/image-samples.csv]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const jsonPath = resolve(repoRoot, 'tests', 'image-samples.json');
const outputPath = resolve(repoRoot, process.argv[2] ?? 'tests/image-samples.csv');

const samples = JSON.parse(readFileSync(jsonPath, 'utf-8'));
const headers = [
  'id',
  'file_name',
  'relative_path',
  'resolution',
  'width',
  'height',
  'manual_label',
  'qa_notes',
  'last_verified'
];

const csvLines = [
  headers.join(',')
];

for (const record of samples) {
  csvLines.push(
    headers
      .map(key => {
        const value = record[key] ?? '';
        if (value == null) return '';
        const normalized = String(value).replace(/"/g, '""');
        return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
      })
      .join(',')
  );
}

writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');
console.log(`已导出 CSV：${outputPath}`);
