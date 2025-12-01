import { config } from 'dotenv';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { basename, resolve, join } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function run() {
  const targetImage = process.argv[2] || '测试试卷7.png';
  const imagePath = resolve(process.cwd(), targetImage);
  const outputDir = resolve(process.cwd(), 'tmp', 'gemini-stream');

  const { parseQuestionWithCascadingFromBuffer } = await import(
    '../src/lib/ai-question-bank/gemini-vision-client'
  );

  console.log('开始执行 Gemini 流式调试脚本', { imagePath });
  const buffer = readFileSync(imagePath);
  const start = Date.now();
  const result = await parseQuestionWithCascadingFromBuffer(buffer);
  const duration = Date.now() - start;

  console.log('解析完成', {
    requestId: result.requestId,
    costMs: duration,
    questionCount: result.questions.length,
    hasImages: result.questions.filter(q => q.image_regions?.length).length
  });

  for (const question of result.questions) {
    console.log(`题号 ${question.number} | 配图 ${question.image_regions?.length ?? 0}`);
    if (question.options?.length) {
      const invalid = question.options.filter(option => !option.startsWith('$') || !option.endsWith('$'));
      if (invalid.length) {
        console.warn(`  ⚠️  发现 ${invalid.length} 个未包裹 LaTeX 的选项`);
      }
    }
  }

  mkdirSync(outputDir, { recursive: true });
  const outputFile = join(
    outputDir,
    `${Date.now()}-${basename(targetImage).replace(/\.[^.]+$/, '')}.json`
  );
  writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');
  console.log('结果已保存', { outputFile });
}

run().catch(error => {
  console.error('调试脚本执行失败', error);
  process.exit(1);
});
