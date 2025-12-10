#!/usr/bin/env node
/**
 * AI 创作功能 API 测试脚本
 *
 * 功能：
 * - 测试6种题型（线性、二次、直方图、条形图、三角形、圆）
 * - 收集成功率、失败原因统计
 * - 生成详细测试报告
 *
 * 使用方法：
 *   node scripts/test-ai-creator.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env.local') });

// ============================================================================
// 配置
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'teacher@test.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'test123456';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 缺少必需的环境变量：NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// 测试用例
// ============================================================================

const TEST_CASES = [
  {
    id: 'test-01-linear-easy',
    name: '线性函数（简单）',
    category: '函数类',
    parameters: {
      question_type: 'function',
      diagram_type: 'linear',
      coef_a: 2,
      coef_b: 3,
      domain: [-10, 10],
      difficulty: 'easy',
    },
  },
  {
    id: 'test-02-linear-hard',
    name: '线性函数（困难）',
    category: '函数类',
    parameters: {
      question_type: 'function',
      diagram_type: 'linear',
      coef_a: -0.5,
      coef_b: 7,
      domain: [-20, 20],
      difficulty: 'hard',
    },
  },
  {
    id: 'test-03-quadratic-medium',
    name: '二次函数（中等）',
    category: '函数类',
    parameters: {
      question_type: 'function',
      diagram_type: 'quadratic',
      coef_a: 1,
      coef_b: -4,
      coef_c: 3,
      domain: [-5, 5],
      difficulty: 'medium',
    },
  },
  {
    id: 'test-04-histogram',
    name: '统计直方图',
    category: '统计类',
    parameters: {
      question_type: 'statistics',
      diagram_type: 'histogram',
      sample_size: 100,
      distribution: 'normal',
      distribution_params: { mean: 0, std: 1 },
      random_seed: 42,
      difficulty: 'medium',
    },
  },
  {
    id: 'test-05-bar',
    name: '统计条形图',
    category: '统计类',
    parameters: {
      question_type: 'statistics',
      diagram_type: 'bar',
      categories: ['A', 'B', 'C', 'D'],
      values: [12, 7, 15, 9],
      difficulty: 'easy',
    },
  },
  {
    id: 'test-06-triangle',
    name: '几何三角形',
    category: '几何类',
    parameters: {
      question_type: 'geometry',
      diagram_type: 'triangle',
      shape_params: {
        vertices: [[0, 0], [3, 0], [1.5, 2.5]],
      },
      annotations: ['vertices', 'sides'],
      difficulty: 'medium',
    },
  },
];

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 登录测试用户
 */
async function loginTestUser() {
  console.log(`\n🔐 正在登录测试用户: ${TEST_USER_EMAIL}`);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (error) {
    console.error('❌ 登录失败:', error.message);
    console.log('💡 提示：请确保测试用户已创建，或设置 TEST_USER_EMAIL 和 TEST_USER_PASSWORD 环境变量');
    throw error;
  }

  console.log('✅ 登录成功');
  return data.session;
}

/**
 * 调用 AI 创作 API（测试端点）
 */
async function callAICreatorAPI(parameters) {
  const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${API_URL}/api/test/ai-creator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
    },
    body: JSON.stringify({ parameters }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `API 请求失败 (${response.status})`);
  }

  return result;
}

/**
 * 执行单个测试用例
 */
async function runTestCase(testCase, index, total) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 测试用例 ${index + 1}/${total}: ${testCase.name} [${testCase.category}]`);
  console.log(`   ID: ${testCase.id}`);
  console.log(`${'='.repeat(80)}`);

  const startTime = Date.now();

  try {
    console.log(`⏳ 正在生成题目...`);
    const result = await callAICreatorAPI(testCase.parameters);
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ 生成成功 (${(duration / 1000).toFixed(2)}秒)`);
      console.log(`   题目ID: ${result.question?.id}`);
      console.log(`   题目文本: ${result.question?.question_text?.substring(0, 100)}...`);
      console.log(`   PNG URL: ${result.question?.diagram_url_png ? '✓' : '✗'}`);
      console.log(`   SVG URL: ${result.question?.diagram_url_svg ? '✓' : '✗'}`);

      return {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        success: true,
        duration,
        questionId: result.question?.id,
        error: null,
      };
    } else {
      console.log(`❌ 生成失败 (${(duration / 1000).toFixed(2)}秒)`);
      console.log(`   错误代码: ${result.code}`);
      console.log(`   错误信息: ${result.error}`);

      return {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        success: false,
        duration,
        questionId: null,
        error: result.error,
        errorCode: result.code,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`💥 测试异常 (${(duration / 1000).toFixed(2)}秒)`);
    console.log(`   异常信息: ${error.message}`);

    return {
      testId: testCase.id,
      testName: testCase.name,
      category: testCase.category,
      success: false,
      duration,
      questionId: null,
      error: error.message,
      errorCode: 'EXCEPTION',
    };
  }
}

/**
 * 查询监控日志统计
 */
async function fetchMonitoringStats() {
  console.log('\n📊 正在查询监控日志...');

  const { data, error } = await supabase
    .from('ai_creation_monitor_logs')
    .select('status, error_message')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ 查询监控日志失败:', error.message);
    return null;
  }

  // 统计状态分布
  const statusCount = {};
  const errorCount = {};

  data.forEach(log => {
    statusCount[log.status] = (statusCount[log.status] || 0) + 1;

    if (log.status !== 'success' && log.error_message) {
      const errorKey = log.error_message.substring(0, 50);
      errorCount[errorKey] = (errorCount[errorKey] || 0) + 1;
    }
  });

  return {
    total: data.length,
    statusCount,
    errorCount,
  };
}

/**
 * 生成测试报告
 */
function generateReport(results, stats) {
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const successRate = ((successCount / results.length) * 100).toFixed(2);
  const avgDuration = (results.reduce((sum, r) => sum + r.duration, 0) / results.length / 1000).toFixed(2);

  const report = `
╔════════════════════════════════════════════════════════════════════════════╗
║                      AI 创作功能测试报告                                    ║
║                     测试时间: ${new Date().toLocaleString('zh-CN')}                            ║
╚════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 总体统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  总测试数:        ${results.length} 个
  成功数:          ${successCount} 个
  失败数:          ${failCount} 个
  成功率:          ${successRate}%
  平均耗时:        ${avgDuration} 秒

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 详细结果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${results.map((r, i) => `
  ${i + 1}. ${r.testName} [${r.category}]
     状态:    ${r.success ? '✅ 成功' : '❌ 失败'}
     耗时:    ${(r.duration / 1000).toFixed(2)}秒
     ${r.success ? `题目ID:  ${r.questionId}` : `错误:    ${r.error}`}
`).join('')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 分类统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${Object.entries(
  results.reduce((acc, r) => {
    acc[r.category] = acc[r.category] || { total: 0, success: 0 };
    acc[r.category].total++;
    if (r.success) acc[r.category].success++;
    return acc;
  }, {})
).map(([category, stats]) => `
  ${category}:
     成功率:  ${((stats.success / stats.total) * 100).toFixed(2)}% (${stats.success}/${stats.total})
`).join('')}

${stats ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗂️  监控日志统计 (最近100条)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  总记录数:    ${stats.total} 条

  状态分布:
${Object.entries(stats.statusCount).map(([status, count]) =>
  `    ${status.padEnd(20)} ${count} (${((count / stats.total) * 100).toFixed(1)}%)`
).join('\n')}

${Object.keys(stats.errorCount).length > 0 ? `
  常见错误 (Top 5):
${Object.entries(stats.errorCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([error, count]) => `    ${count}次: ${error}...`)
  .join('\n')}
` : '  🎉 无错误记录'}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 结论
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${successRate >= 95
  ? `✅ 测试通过！成功率达到 ${successRate}%，满足 95%+ 的目标要求。`
  : successRate >= 85
    ? `⚠️  测试基本通过！成功率 ${successRate}%，接近但未达到 95% 目标。`
    : `❌ 测试未通过！成功率仅 ${successRate}%，需要进一步优化。`
}

${failCount > 0 ? `
建议：
  - 检查失败的测试用例，分析失败原因
  - 查看监控日志中的错误分布
  - 优化失败率较高的题型
` : ''}

╚════════════════════════════════════════════════════════════════════════════╝
`;

  return report;
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    AI 创作功能 API 测试                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');

  try {
    // 1. 登录
    await loginTestUser();

    // 2. 运行测试用例
    console.log(`\n🚀 开始执行 ${TEST_CASES.length} 个测试用例...\n`);
    const results = [];

    for (let i = 0; i < TEST_CASES.length; i++) {
      const result = await runTestCase(TEST_CASES[i], i, TEST_CASES.length);
      results.push(result);

      // 每个测试之间间隔2秒，避免触发速率限制
      if (i < TEST_CASES.length - 1) {
        console.log('\n⏸️  等待2秒...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 3. 查询监控统计
    const stats = await fetchMonitoringStats();

    // 4. 生成报告
    const report = generateReport(results, stats);
    console.log(report);

    // 5. 保存报告到文件
    const reportPath = join(__dirname, '../test-reports', `ai-creator-test-${Date.now()}.txt`);
    const reportDir = dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`\n💾 测试报告已保存到: ${reportPath}`);

    // 6. 退出码
    const successRate = (results.filter(r => r.success).length / results.length) * 100;
    process.exit(successRate >= 95 ? 0 : 1);

  } catch (error) {
    console.error('\n💥 测试执行失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main().catch(console.error);
