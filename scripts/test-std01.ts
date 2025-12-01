import { promises as fs } from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const targetFile = 'tests/dataset/01_standard/STD-01-linear-equations.jpg';
  console.log(`🚀 开始单兵测试: ${targetFile}`);
  console.log(`🤖 使用模型: ${process.env.GEMINI_MODEL}`);

  try {
    const buffer = await fs.readFile(path.resolve(process.cwd(), targetFile));
    const { parseQuestionWithCascadingFromBuffer } = await import('../src/lib/ai-question-bank/gemini-vision-client');
    process.env.CURRENT_REGRESSION_FILE = path.basename(targetFile);

    const start = Date.now();
    const result = await parseQuestionWithCascadingFromBuffer(buffer);
    process.env.CURRENT_REGRESSION_FILE = '';

    console.log(`✅ 解析成功! 耗时: ${(Date.now() - start) / 1000}s`);
    console.log(`📦 识别题目数量: ${result.questions.length}`);
    if (result.questions.length > 0) {
      console.log(`🔍 第一题内容预览: ${result.questions[0].content.slice(0, 50)}...`);
      console.log('🎉 验证通过：extractJsonFromStream 成功提取完整 JSON。');
    } else {
      console.warn('⚠️ 警告：未报错但问题数组为空，需继续排查。');
    }
  } catch (error) {
    process.env.CURRENT_REGRESSION_FILE = '';
    console.error('❌ 测试失败');
    console.error(error);
  }
}

run();
