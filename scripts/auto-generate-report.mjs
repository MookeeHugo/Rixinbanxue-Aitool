#!/usr/bin/env node
/**
 * 自动化测试报告生成脚本
 * - 读取批量测试与验证结果
 * - 生成简单 HTML 汇总
 *
 * 用法：
 * node scripts/auto-generate-report.mjs --input logs/test-reports/<目录> --output report.html
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join, basename } from 'path';

const CONFIG = {
  input: null,
  output: null
};

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input') CONFIG.input = args[++i];
  else if (args[i] === '--output') CONFIG.output = args[++i];
}

if (!CONFIG.input) {
  console.error('❌ 缺少 --input 参数');
  console.log('\n用法:');
  console.log('  node scripts/auto-generate-report.mjs --input <results-dir> --output <report.html>');
  process.exit(1);
}

async function main() {
  printBanner();

  console.log(`📂 扫描目录: ${CONFIG.input}`);
  const files = await readdir(CONFIG.input);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  let batchResults = null;
  let validationResults = null;

  for (const file of jsonFiles) {
    const content = JSON.parse(await readFile(join(CONFIG.input, file), 'utf-8'));

    if (file.includes('validation')) {
      validationResults = content;
      console.log(`   ✅ 验证结果: ${file}`);
    } else if (file.includes('batch')) {
      batchResults = content;
      console.log(`   ✅ 批量测试结果: ${file}`);
    }
  }

  if (!batchResults) {
    throw new Error('未找到批量测试结果文件');
  }

  const html = buildHtmlReport(batchResults, validationResults);

  if (!CONFIG.output) {
    CONFIG.output = join(CONFIG.input, 'report.html');
  }

  await writeFile(CONFIG.output, html, 'utf-8');
  console.log(`\n✅ 报告已生成: ${CONFIG.output}`);
}

function printBanner() {
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│           RixinMath 测试报告生成             │');
  console.log('└──────────────────────────────────────────────┘\n');
}

function buildHtmlReport(batchResults, validationResults) {
  const successRate = ((batchResults.success / batchResults.total) * 100).toFixed(2);
  const title = 'RixinMath 自动化测试报告';

  const validationSummary = validationResults?.summary;
  const validationSection = validationResults
    ? `
    <section>
      <h2>验证结果 (${validationResults.level})</h2>
      <ul>
        <li>通过: ${validationSummary?.passed ?? 0}</li>
        <li>失败: ${validationSummary?.failed ?? 0}</li>
        <li>跳过: ${validationSummary?.skipped ?? 0}</li>
      </ul>
    </section>
  `
    : '<section><h2>验证结果</h2><p>未提供验证文件</p></section>';

  return `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      body { font-family: "Inter", "PingFang SC", "Helvetica Neue", Arial, sans-serif; margin: 24px; color: #111; }
      h1 { margin-bottom: 8px; }
      section { margin-bottom: 24px; padding: 16px; border: 1px solid #eee; border-radius: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f8f8f8; }
      .success { color: #16a34a; }
      .fail { color: #dc2626; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p>生成时间: ${new Date().toLocaleString()}</p>

    <section>
      <h2>批量测试概况</h2>
      <ul>
        <li>样本总数: ${batchResults.total}</li>
        <li>成功: ${batchResults.success}</li>
        <li>失败: ${batchResults.failed}</li>
        <li>超时: ${batchResults.timeout}</li>
        <li>成功率: ${successRate}%</li>
        <li>总耗时: ${(batchResults.totalTime / 1000).toFixed(1)} s</li>
      </ul>
    </section>

    ${validationSection}

    <section>
      <h2>明细</h2>
      <table>
        <thead>
          <tr>
            <th>文件</th>
            <th>分类</th>
            <th>状态</th>
            <th>耗时(ms)</th>
            <th>题数</th>
            <th>配图成功率</th>
            <th>错误</th>
          </tr>
        </thead>
        <tbody>
          ${batchResults.details
            .map(
              d => `
                <tr>
                  <td>${d.file}</td>
                  <td>${d.category}</td>
                  <td class="${d.status === 'completed' ? 'success' : 'fail'}">${d.status}</td>
                  <td>${d.duration}</td>
                  <td>${d.questionCount ?? ''}</td>
                  <td>${d.imageSuccessRate ?? ''}</td>
                  <td>${d.error ?? ''}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </section>
  </body>
  </html>`;
}

main().catch(err => {
  console.error('生成报告失败:', err);
  process.exit(1);
});
