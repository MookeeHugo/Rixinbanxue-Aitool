import { config } from 'dotenv';
import { mkdirSync, readFileSync, existsSync } from 'fs';
import { resolve, basename, extname, join } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

type TestImage = {
  name: string;
  file: string;
};

const testImages: TestImage[] = [
  { name: '\u6d4b\u8bd5\u8bd5\u53771', file: '\u6d4b\u8bd5\u8bd5\u53771.png' },
  { name: '\u6d4b\u8bd5\u8bd5\u53772', file: '\u6d4b\u8bd5\u8bd5\u53772.png' },
  { name: '\u6d4b\u8bd5\u8bd5\u53775', file: '\u6d4b\u8bd5\u8bd5\u53775.png' }
];

async function run() {
  const { recognizeImage } = await import('../src/lib/ai-question-bank/aliyun-ocr-client');
  const { detectImageRegions } = await import('../src/lib/ai-question-bank/image-region-detector');
  const { parseQuestions } = await import('../src/lib/ai-question-bank/qwen-flash');
  const { matchQuestionImages, validateImageMapping } = await import('../src/lib/ai-question-bank/question-image-matcher');
  const { guessImageMimeType } = await import('../src/lib/ai-question-bank/utils');
  const sharp = (await import('sharp')).default;

  for (const testImage of testImages) {
    const absolutePath = resolve(process.cwd(), testImage.file);
    if (!existsSync(absolutePath)) {
      console.error(`\u672a\u627e\u5230\u6d4b\u8bd5\u6587\u4ef6: ${absolutePath}`);
      continue;
    }

    console.log('\n====================================================');
    console.log(`\u6d4b\u8bd5\uff1a${testImage.name} (${testImage.file})`);
    console.log('====================================================');

    const imageBuffer = readFileSync(absolutePath);
    const mimeType = guessImageMimeType(testImage.file);

    console.log('1) \u8c03\u7528\u963f\u91cc\u4e91 OCR...');
    const ocrStart = Date.now();
    const ocrResult = await recognizeImage(imageBuffer);
    console.log(`   \u5b8c\u6210\uff0c\u8017\u65f6 ${Date.now() - ocrStart} ms`);
    console.log(`   \u6587\u672c\u6846\u6570\u91cf: ${ocrResult.PrismWordsInfo.length}`);

    console.log('\n2) \u68c0\u6d4b\u9898\u76ee\u4e0e\u914d\u56fe\u533a\u57df...');
    const detection = detectImageRegions(ocrResult);
    console.log(`   \u9898\u76ee\u533a\u57df: ${detection.questionRegions.length}\uff0c\u914d\u56fe\u5019\u9009: ${detection.imageRegions.length}`);

    console.log('\n3) \u8c03\u7528 Qwen \u89e3\u6790\u9898\u76ee...');
    const base64 = imageBuffer.toString('base64');
    const parseStart = Date.now();
    const questions = await parseQuestions(base64, { mimeType });
    console.log(`   \u5b8c\u6210\uff0c\u8017\u65f6 ${Date.now() - parseStart} ms`);
    console.log(`   Qwen \u8bc6\u522b\u9898\u76ee\u6570: ${questions.length}`);

    console.log('\n4) \u5339\u914d\u9898\u76ee\u4e0e\u914d\u56fe...');
    const mapping = matchQuestionImages(
      questions,
      detection.imageRegions,
      detection.questionRegions,
      ocrResult.PrismWordsInfo,
      ocrResult.Width,
      ocrResult.Height
    );
    const validatedMapping = validateImageMapping(mapping, ocrResult.Width, ocrResult.Height);
    const matchedCount = Object.keys(validatedMapping).length;
    const unmatched = questions
      .map(q => q.number)
      .filter(number => !validatedMapping[number]);
    console.log(`   \u6210\u529f\u5339\u914d: ${matchedCount}/${questions.length}`);
    if (unmatched.length > 0) {
      console.log(`   \u672a\u80fd\u5339\u914d\u7684\u9898\u53f7: ${unmatched.join(', ')}`);
    } else {
      console.log('   \u6240\u6709\u9898\u76ee\u5747\u5df2\u5339\u914d\u5230\u914d\u56fe\u6216\u786e\u8ba4\u65e0\u9700\u914d\u56fe');
    }

    console.log('\n5) \u88c1\u526a\u5e76\u4fdd\u5b58\u9898\u76ee\u914d\u56fe\uff08\u672c\u5730\u8c03\u8bd5\uff09...');
    const outputDir = resolve(process.cwd(), 'tmp', 'test-results', basename(testImage.file, extname(testImage.file)));
    mkdirSync(outputDir, { recursive: true });
    let cropSuccess = 0;

    for (const question of questions) {
      const region = question.number ? validatedMapping[question.number] : undefined;
      if (!region) continue;

      const filePath = join(outputDir, `question-${question.number}.png`);
      try {
        await sharp(imageBuffer)
          .extract({
            left: Math.max(0, Math.round(region.x)),
            top: Math.max(0, Math.round(region.y)),
            width: Math.round(region.width),
            height: Math.round(region.height)
          })
          .png()
          .toFile(filePath);
        cropSuccess += 1;
      } catch (error) {
        console.error(`   \u88c1\u526a\u9898\u76ee ${question.number} \u5931\u8d25:`, error instanceof Error ? error.message : error);
      }
    }

    console.log(`   \u88c1\u526a\u6210\u529f: ${cropSuccess}`);
    console.log(`   \u7ed3\u679c\u5df2\u4fdd\u5b58\u5230: ${outputDir}`);
  }

  console.log('\n\u6d4b\u8bd5\u5b8c\u6210\uff0c\u8bf7\u67e5\u770b tmp/test-results \u76ee\u5f55\u4e2d\u7684\u88c1\u526a\u7ed3\u679c\u3002');
}

run().catch(error => {
  console.error('\u6d4b\u8bd5\u6267\u884c\u5931\u8d25:', error);
  process.exit(1);
});
