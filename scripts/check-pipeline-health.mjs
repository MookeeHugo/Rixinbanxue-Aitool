#!/usr/bin/env node
/**
 * 简易健康检查脚本，供 PM2/Supervisor 定时调用
 */

const endpoint =
  process.env.RIXINMATH_PIPELINE_HEALTH_URL || 'http://127.0.0.1:8000/health';

async function main() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[health-check] HTTP ${response.status}`);
      process.exitCode = 1;
      return;
    }

    const body = await response.json();
    if (body.status !== 'ok') {
      console.error('[health-check] unexpected payload', body);
      process.exitCode = 1;
      return;
    }

    console.log('[health-check] ok', body);
  } catch (error) {
    console.error('[health-check] failed', error.message || error);
    process.exitCode = 1;
  }
}

main();
