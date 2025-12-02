#!/usr/bin/env node
/**
 * 基准图片批量测试脚本
 * 默认将 tests/image-samples.json 中的每张图片上传至 python 预处理服务。
 *
 * 用法：
 *   node scripts/run-image-baseline.mjs --endpoint http://127.0.0.1:8000/api/preprocess/upload
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const repoRoot = resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    endpoint: 'http://127.0.0.1:8000/api/preprocess/upload',
    limit: Infinity
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--endpoint' && args[i + 1]) {
      result.endpoint = args[i + 1];
      i += 1;
    } else if (arg === '--limit' && args[i + 1]) {
      result.limit = Number(args[i + 1]);
      i += 1;
    }
  }
  return result;
}

async function run() {
  const { endpoint, limit } = parseArgs();
  const samples = JSON.parse(
    readFileSync(resolve(repoRoot, 'tests', 'image-samples.json'), 'utf-8')
  );

  const results = [];

  for (const [index, sample] of samples.entries()) {
    if (index >= limit) break;

    const filePath = resolve(repoRoot, sample.relative_path);
    const form = new FormData();
    form.append('task_id', sample.id);
    const buffer = readFileSync(filePath);
    form.append('file', new Blob([buffer], { type: 'image/jpeg' }), sample.file_name);

    const startedAt = Date.now();
    try {
      const headers = typeof form.getHeaders === 'function' ? form.getHeaders() : undefined;
      const requestInit = {
        method: 'POST',
        body: form,
        ...(headers ? { headers } : {})
      };
      const response = await fetch(endpoint, requestInit);

      const elapsed = Date.now() - startedAt;
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      results.push({
        id: sample.id,
        status: 'ok',
        elapsed_ms: elapsed,
        meta: payload.meta ?? null
      });
      console.log(
        `[baseline] ${sample.id} -> ${elapsed}ms (${
          payload.meta ? `${payload.meta.width}x${payload.meta.height}` : 'no meta'
        })`
      );
    } catch (error) {
      results.push({
        id: sample.id,
        status: 'fail',
        error: error instanceof Error ? error.message : String(error)
      });
      console.error(`[baseline] ${sample.id} failed`, error);
    }
  }

  console.table(results);
}

run().catch(error => {
  console.error('[baseline] unexpected error', error);
  process.exitCode = 1;
});
