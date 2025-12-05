#!/usr/bin/env node
/**
 * 基准图片批量测试脚本
 * 默认将 tests/image-samples.json 中的每张图片上传至 python 预处理服务。
 *
 * 用法：
 *   node scripts/run-image-baseline.mjs --endpoint http://127.0.0.1:8000/api/preprocess/upload
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const repoRoot = resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const result = {
    endpoint: 'http://127.0.0.1:8000/api/preprocess/upload',
    limit: Infinity,
    jsonOutput: resolve(repoRoot, 'tmp', 'baseline', `baseline-${timestamp}.json`),
    csvOutput: resolve(repoRoot, 'tmp', 'baseline', `baseline-${timestamp}.csv`),
    compareFile: undefined
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--endpoint' && args[i + 1]) {
      result.endpoint = args[i + 1];
      i += 1;
    } else if (arg === '--limit' && args[i + 1]) {
      result.limit = Number(args[i + 1]);
      i += 1;
    } else if (arg === '--json' && args[i + 1]) {
      result.jsonOutput = resolve(process.cwd(), args[i + 1]);
      i += 1;
    } else if (arg === '--csv' && args[i + 1]) {
      result.csvOutput = resolve(process.cwd(), args[i + 1]);
      i += 1;
    } else if (arg === '--compare' && args[i + 1]) {
      result.compareFile = resolve(process.cwd(), args[i + 1]);
      i += 1;
    }
  }
  return result;
}

async function run() {
  const {
    endpoint,
    limit,
    jsonOutput,
    csvOutput,
    compareFile
  } = parseArgs();
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

  const summary = summarizeResults(results);
  const payload = {
    metadata: {
      endpoint,
      limit,
      generated_at: new Date().toISOString(),
      stats: summary
    },
    results
  };

  if (jsonOutput) {
    ensureDir(jsonOutput);
    writeFileSync(jsonOutput, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[baseline] JSON written -> ${jsonOutput}`);
  }

  if (csvOutput) {
    ensureDir(csvOutput);
    writeFileSync(csvOutput, toCsv(results), 'utf-8');
    console.log(`[baseline] CSV written -> ${csvOutput}`);
  }

  console.log('[baseline] summary', summary);

  if (compareFile) {
    compareWithHistorical(compareFile, results, summary);
  }
}

run().catch(error => {
  console.error('[baseline] unexpected error', error);
  process.exitCode = 1;
});

function summarizeResults(results) {
  const ok = results.filter(r => r.status === 'ok' && typeof r.elapsed_ms === 'number');
  if (ok.length === 0) {
    return { ok: 0, fail: results.length, avg_ms: null, min_ms: null, max_ms: null, p95_ms: null };
  }
  const latencies = ok.map(r => r.elapsed_ms).sort((a, b) => a - b);
  const sum = latencies.reduce((acc, cur) => acc + cur, 0);
  const average = Number((sum / latencies.length).toFixed(2));
  const min = latencies[0];
  const max = latencies[latencies.length - 1];
  const p95Index = Math.floor(0.95 * (latencies.length - 1));
  const p95 = latencies[p95Index];
  return {
    ok: ok.length,
    fail: results.length - ok.length,
    avg_ms: average,
    min_ms: min,
    max_ms: max,
    p95_ms: p95
  };
}

function toCsv(results) {
  const header = 'id,status,elapsed_ms,width,height,error';
  const lines = results.map(result => {
    const width = result.meta?.width ?? '';
    const height = result.meta?.height ?? '';
    const error = result.error ? `"${result.error.replace(/"/g, '""')}"` : '';
    return [result.id, result.status, result.elapsed_ms ?? '', width, height, error].join(',');
  });
  return [header, ...lines].join('\n');
}

function ensureDir(targetPath) {
  const dir = dirname(targetPath);
  mkdirSync(dir, { recursive: true });
}

function compareWithHistorical(filePath, currentResults, currentSummary) {
  if (!existsSync(filePath)) {
    console.warn(`[baseline] compare file not found: ${filePath}`);
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.warn('[baseline] failed to parse compare file', error);
    return;
  }
  const historicalResults = Array.isArray(parsed) ? parsed : parsed.results ?? [];
  const historicalSummary = Array.isArray(parsed)
    ? summarizeResults(parsed)
    : parsed.metadata?.stats ?? summarizeResults(historicalResults);

  const previousMap = new Map(
    historicalResults
      .filter(item => item && typeof item.id === 'string')
      .map(item => [item.id, item])
  );

  const deltas = [];
  for (const result of currentResults) {
    if (result.status !== 'ok' || typeof result.elapsed_ms !== 'number') continue;
    const oldValue = previousMap.get(result.id);
    if (!oldValue || oldValue.status !== 'ok' || typeof oldValue.elapsed_ms !== 'number') continue;
    deltas.push({
      id: result.id,
      previous_ms: oldValue.elapsed_ms,
      current_ms: result.elapsed_ms,
      delta_ms: Number((result.elapsed_ms - oldValue.elapsed_ms).toFixed(2))
    });
  }

  if (deltas.length > 0) {
    deltas.sort((a, b) => Math.abs(b.delta_ms) - Math.abs(a.delta_ms));
    console.log('[baseline] 当前与历史耗时对比（按差值排序）');
    console.table(deltas.slice(0, 10));
  } else {
    console.log('[baseline] 历史文件无可对比记录或 ID 不匹配');
  }

  console.log('[baseline] 历史统计 vs 当前统计');
  console.table([
    { metric: 'avg_ms', previous: historicalSummary.avg_ms, current: currentSummary.avg_ms },
    { metric: 'p95_ms', previous: historicalSummary.p95_ms, current: currentSummary.p95_ms },
    { metric: 'min_ms', previous: historicalSummary.min_ms, current: currentSummary.min_ms },
    { metric: 'max_ms', previous: historicalSummary.max_ms, current: currentSummary.max_ms },
    { metric: 'ok', previous: historicalSummary.ok, current: currentSummary.ok },
    { metric: 'fail', previous: historicalSummary.fail, current: currentSummary.fail }
  ]);
}
