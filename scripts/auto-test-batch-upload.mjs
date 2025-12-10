#!/usr/bin/env node
/**
 * 自动化批量上传测试脚本
 * - 仅使用 Supabase anon key + 用户会话，不再暴露 service role key
 * - 文件上传通过受控的 Next.js API /api/upload，服务端持有密钥
 * - 任务处理支持超时重触发，避免长期 pending
 *
 * 用法：
 * node scripts/auto-test-batch-upload.mjs \
 *   --dataset tests/dataset/01_standard \
 *   --email teacher@test.com \
 *   --password test123456 \
 *   --output logs/test-reports/$(date +%Y%m%d-%H%M%S)/batch.json \
 *   --timeout 120000 \
 *   --concurrent 1 \
 *   --api http://localhost:3002
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const CONFIG = {
  email: 'teacher@test.com',
  password: 'test123456',
  dataset: 'tests/dataset',
  output: null,
  resumeFrom: null,
  timeout: 120000,
  concurrent: 1,
  pollInterval: 2000,
  apiBase: process.env.TEST_API_BASE || 'http://localhost:3002'
};

// 解析命令行参数
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dataset') CONFIG.dataset = args[++i];
  else if (args[i] === '--email') CONFIG.email = args[++i];
  else if (args[i] === '--password') CONFIG.password = args[++i];
  else if (args[i] === '--output') CONFIG.output = args[++i];
  else if (args[i] === '--resume-from') CONFIG.resumeFrom = args[++i];
  else if (args[i] === '--timeout') CONFIG.timeout = Number.parseInt(args[++i], 10);
  else if (args[i] === '--concurrent') CONFIG.concurrent = Number.parseInt(args[++i], 10);
  else if (args[i] === '--api') CONFIG.apiBase = args[++i];
}

// 生成默认输出路径
if (!CONFIG.output) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  CONFIG.output = `logs/test-reports/${timestamp}/batch-results.json`;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 缺少 Supabase 配置，请检查 .env.local');
  process.exit(1);
}

async function main() {
  printBanner();

  const { supabase, session, user } = await login();
  const authCookie = buildAuthCookie(session);

  const skipFiles = await loadResumeSet(CONFIG.resumeFrom);

  const testFiles = await scanDataset(CONFIG.dataset);
  if (testFiles.length === 0) {
    console.error('⚠️ 未找到测试文件，退出');
    return;
  }

  printTestFiles(testFiles);

  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    total: testFiles.length,
    success: 0,
    failed: 0,
    timeout: 0,
    details: []
  };

  if (CONFIG.concurrent <= 1) {
    for (let i = 0; i < testFiles.length; i++) {
      const file = testFiles[i];
      if (skipFiles.has(file.name)) {
        console.log(`[${i + 1}/${testFiles.length}] 跳过(已完成): ${file.name}`);
        results.success++;
        continue;
      }
      console.log(`[${i + 1}/${testFiles.length}] 测试: ${file.name}`);
      const testResult = await uploadAndWaitForResult({ supabase, authCookie, userId: user.id, file });
      processTestResult(results, file, testResult);
      logProgress(results, i + 1, testFiles.length);
    }
  } else {
    for (let i = 0; i < testFiles.length; i += CONFIG.concurrent) {
      const batch = testFiles.slice(i, i + CONFIG.concurrent);
      const filteredBatch = batch.filter(file => !skipFiles.has(file.name));
      if (filteredBatch.length === 0) {
        console.log(`\n批次 ${Math.floor(i / CONFIG.concurrent) + 1}: 全部跳过(已完成)`);
        continue;
      }
      console.log(`\n批次 ${Math.floor(i / CONFIG.concurrent) + 1}: 并发上传 ${batch.length} 个文件`);

      const batchResults = await Promise.all(
        filteredBatch.map(file => uploadAndWaitForResult({ supabase, authCookie, userId: user.id, file }))
      );

      for (let j = 0; j < filteredBatch.length; j++) {
        processTestResult(results, filteredBatch[j], batchResults[j]);
      }

      console.log(
        `   批次完成 | 累计成功: ${results.success} | 失败: ${results.failed} | 超时: ${results.timeout}`
      );
    }
  }

  results.totalTime = Date.now() - startTime;

  console.log('\n💾 正在保存测试结果...');
  await saveResults(results);
  console.log(`✅ 结果已保存至: ${CONFIG.output}\n`);

  displaySummary(results);
}

function printBanner() {
  console.log('┌───────────────────────────────────────────────────────────────┐');
  console.log('│        RixinMath 自动化批量上传测试                           │');
  console.log('└───────────────────────────────────────────────────────────────┘\n');

  console.log('📋 测试配置:');
  console.log(`   账号: ${CONFIG.email}`);
  console.log(`   数据集: ${CONFIG.dataset}`);
  console.log(`   输出: ${CONFIG.output}`);
  console.log(`   超时: ${CONFIG.timeout}ms`);
  console.log(`   并发: ${CONFIG.concurrent}`);
  console.log(`   API: ${CONFIG.apiBase}\n`);
}

async function login() {
  console.log('🔐 正在登录...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: CONFIG.email,
    password: CONFIG.password
  });

  if (error || !data.session || !data.user) {
    console.error('❌ 登录失败:', error?.message || '未知错误');
    process.exit(1);
  }

  console.log(`✅ 登录成功! 用户ID: ${data.user.id}\n`);
  return { supabase, session: data.session, user: data.user };
}

function buildAuthCookie(session) {
  const encoded = encodeURIComponent(JSON.stringify(session));
  return `sb-auth-token=${encoded}`;
}

async function scanDataset(datasetPath) {
  const files = [];

  if (!existsSync(datasetPath)) {
    console.error(`❌ 数据集路径不存在: ${datasetPath}`);
    return files;
  }

  const entries = await readdir(datasetPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const categoryPath = join(datasetPath, entry.name);
      const categoryFiles = await readdir(categoryPath);

      for (const file of categoryFiles) {
        if (/\.(jpg|jpeg|png|pdf)$/i.test(file)) {
          files.push({
            name: file,
            path: join(categoryPath, file),
            category: entry.name,
            size: 0
          });
        }
      }
    } else if (/\.(jpg|jpeg|png|pdf)$/i.test(entry.name)) {
      files.push({
        name: entry.name,
        path: join(datasetPath, entry.name),
        category: 'root',
        size: 0
      });
    }
  }

  return files.sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
}

function printTestFiles(testFiles) {
  const categoryCounts = {};
  for (const file of testFiles) {
    categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;
  }

  console.log('📊 测试文件分布:');
  for (const [category, count] of Object.entries(categoryCounts)) {
    console.log(`   ${category}: ${count}个`);
  }
  console.log();
}

async function uploadAndWaitForResult({ supabase, authCookie, userId, file }) {
  const startTime = Date.now();
  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 1. 读取文件
      const fileBuffer = await readFile(file.path);
      file.size = fileBuffer.length;

      // 2. 通过受控 API 上传文件（服务器持有密钥）
      const uploadResult = await uploadViaApi({
        file,
        fileBuffer,
        authCookie,
        userId
      });

      if (!uploadResult || !uploadResult.key) {
        throw new Error('上传接口返回空结果');
      }

      const fileKey = uploadResult.key;

      // 3. 创建 upload_task 记录（RLS 限制为当前用户）
      const { data: taskData, error: taskError } = await supabase
        .from('upload_tasks')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_url: fileKey,
          status: 'pending',
          progress: 0
        })
        .select()
        .single();

      if (taskError) {
        throw new Error(`创建任务失败: ${taskError.message}`);
      }

      const taskId = taskData.id;

      // 4. 触发处理（防止开发环境未自动消费队列）
      await triggerProcessing({ authCookie, taskId });

      // 5. 轮询任务状态，若长时间 pending 会自动重触发一次
      const result = await pollTaskStatus(supabase, authCookie, taskData, CONFIG.timeout);

      return {
        status: result.status,
        taskId,
        duration: Date.now() - startTime,
        questionCount: result.total_questions || 0,
        imageSuccessRate: result.image_success_rate || 0,
        error: result.error_message
      };
    } catch (error) {
      lastError = error;
      const isLast = attempt === maxAttempts;
      const message = error instanceof Error ? error.message : String(error);
      const transient =
        message.includes('503') ||
        message.includes('Gemini') ||
        message.includes('网络') ||
        message.includes('timeout');
      if (isLast || !transient) {
        return {
          status: 'error',
          error: message,
          duration: Date.now() - startTime
        };
      }
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`⚠️ 重试第 ${attempt} 次失败，${delay}ms 后重试: ${message}`);
      await sleep(delay);
    }
  }

  return {
    status: 'error',
    error:
      lastError && lastError instanceof Error
        ? lastError.message
        : lastError
          ? String(lastError)
          : '未知错误',
    duration: Date.now() - startTime
  };
}

async function uploadViaApi({ file, fileBuffer, authCookie, userId }) {
  const formData = new FormData();
  const contentType = file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

  formData.append('file', new Blob([fileBuffer], { type: contentType }), file.name);
  formData.append('prefix', `ai-question-bank/${userId}`);
  formData.append('access_level', 'public');

  const response = await fetch(`${CONFIG.apiBase}/api/upload`, {
    method: 'POST',
    headers: {
      Cookie: authCookie
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`文件上传失败: ${response.status} ${text}`);
  }

  const data = await response.json();
  if (!data?.key) {
    throw new Error('上传接口未返回 key');
  }

  return data;
}

async function triggerProcessing({ authCookie, taskId }) {
  try {
    const res = await fetch(`${CONFIG.apiBase}/api/test/process-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie
      },
      body: JSON.stringify({ taskId })
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`⚠️ 触发处理失败: ${res.status} ${text}`);
    }
  } catch (err) {
    console.warn('⚠️ 触发处理出现异常:', err.message);
  }
}

async function pollTaskStatus(supabase, authCookie, task, maxWaitMs) {
  const startTime = Date.now();
  let attempts = 0;
  let retriggered = false;

  while (Date.now() - startTime < maxWaitMs) {
    attempts++;

    const { data: current, error } = await supabase
      .from('upload_tasks')
      .select('*')
      .eq('id', task.id)
      .single();

    if (error) {
      console.error(`   ⚠️ 查询任务状态失败(第 ${attempts} 次):`, error.message);
      await sleep(CONFIG.pollInterval);
      continue;
    }

    if (current.progress > 0) {
      process.stdout.write(`\r   ⏳ 处理中 ${current.progress}%`);
    }

    if (current.status === 'completed') {
      console.log(`\r   ✅ 完成! 解析 ${current.total_questions ?? 0} 题，配图成功率 ${current.image_success_rate ?? 0}%`);
      return current;
    }

    if (current.status === 'failed') {
      console.log(`\r   ❌ 失败: ${current.error_message || '未知错误'}`);
      return current;
    }

    // 超过一半时间仍 pending，尝试重触发一次
    if (
      !retriggered &&
      current.status === 'pending' &&
      Date.now() - startTime > maxWaitMs / 2
    ) {
      retriggered = true;
      console.log('\n   ♻️  检测到长时间 pending，尝试重新触发处理...');
      await triggerProcessing({ authCookie, taskId: task.id });
    }

    await sleep(CONFIG.pollInterval);
  }

  console.log(`\r   ⏰ 超时 (等待 ${maxWaitMs}ms)`);
  return { status: 'timeout', id: task.id };
}

function processTestResult(results, file, testResult) {
  results.details.push({
    file: file.name,
    category: file.category,
    size: file.size,
    ...testResult
  });

  if (testResult.status === 'completed') {
    results.success++;
  } else if (testResult.status === 'timeout') {
    results.timeout++;
  } else {
    results.failed++;
  }
}

async function saveResults(results) {
  const outputDir = dirname(CONFIG.output);
  await mkdir(outputDir, { recursive: true });

  await writeFile(CONFIG.output, JSON.stringify(results, null, 2), 'utf-8');

  const csvPath = CONFIG.output.replace('.json', '.csv');
  const csvLines = ['File,Category,Status,Duration(ms),Questions,ImageSuccessRate(%),Error'];

  for (const detail of results.details) {
    csvLines.push(
      [
        detail.file,
        detail.category,
        detail.status,
        detail.duration,
        detail.questionCount || '',
        detail.imageSuccessRate || '',
        (detail.error || '').replace(/,/g, ';')
      ].join(',')
    );
  }

  await writeFile(csvPath, csvLines.join('\n'), 'utf-8');
}

function displaySummary(results) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         测试汇总                               ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const successRate = (results.success / results.total * 100).toFixed(2);
  const avgDuration =
    results.details.reduce((sum, d) => sum + d.duration, 0) / results.total;
  const avgQuestions =
    results.details.filter(d => d.questionCount).reduce((sum, d) => sum + d.questionCount, 0) /
      (results.success || 1);

  console.log(`📊 总测试数: ${results.total}`);
  console.log(`✅ 成功: ${results.success} (${successRate}%)`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`⏱️  超时: ${results.timeout}`);
  console.log(`⏰ 总耗时: ${(results.totalTime / 1000).toFixed(1)} 秒`);
  console.log(`📈 平均处理时间: ${avgDuration.toFixed(1)} ms`);
  console.log(`📝 平均题数(成功样本): ${Number.isFinite(avgQuestions) ? avgQuestions.toFixed(1) : 0}`);

  const categoryStats = {};
  for (const detail of results.details) {
    const stat = categoryStats[detail.category] || { total: 0, success: 0, failed: 0, timeout: 0 };
    stat.total += 1;
    if (detail.status === 'completed') stat.success += 1;
    else if (detail.status === 'timeout') stat.timeout += 1;
    else stat.failed += 1;
    categoryStats[detail.category] = stat;
  }

  console.log('\n📂 分类统计:');
  for (const [category, stat] of Object.entries(categoryStats)) {
    const rate = (stat.success / stat.total * 100).toFixed(1);
    console.log(
      `   ${category}: ${stat.success}/${stat.total} (${rate}%) | 失败:${stat.failed} 超时:${stat.timeout}`
    );
  }
}

function logProgress(results, done, total) {
  const progress = ((done / total) * 100).toFixed(1);
  console.log(
    `   进度: ${progress}% | 成功: ${results.success} | 失败: ${results.failed} | 超时: ${results.timeout}\n`
  );
}

async function loadResumeSet(resumeFromPath) {
  const set = new Set();
  if (!resumeFromPath || !existsSync(resumeFromPath)) {
    return set;
  }
  try {
    const data = JSON.parse(await readFile(resumeFromPath, 'utf-8'));
    for (const d of data.details || []) {
      if (d.status === 'completed' && d.file) {
        set.add(d.file);
      }
    }
    console.log(`🔄 断点续跑：已跳过 ${set.size} 个已完成文件`);
  } catch (error) {
    console.warn('⚠️ 读取 resume 文件失败，忽略续跑', { resumeFromPath, error: error.message });
  }
  return set;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('脚本异常退出:', err);
  process.exit(1);
});
