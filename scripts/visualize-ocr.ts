import { config } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname, resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

type QuestionRegion = Awaited<
  ReturnType<typeof import('../src/lib/ai-question-bank/image-region-detector')['detectImageRegions']>
>['questionRegions'][number];

async function visualize(imagePath: string) {
  const absolutePath = resolve(process.cwd(), imagePath);
  if (!existsSync(absolutePath)) {
    console.error(`❌ 文件不存在: ${absolutePath}`);
    return;
  }

  const name = basename(imagePath, extname(imagePath));
  const outputDir = resolve(process.cwd(), 'tmp', 'ocr-debug', name);
  mkdirSync(outputDir, { recursive: true });

  const buffer = readFileSync(absolutePath);

  const { recognizeImage } = await import('../src/lib/ai-question-bank/aliyun-ocr-client');
  const { detectImageRegions } = await import('../src/lib/ai-question-bank/image-region-detector');
  const sharp = (await import('sharp')).default;

  console.log(`\n📄 ${name}: 开始 OCR`);
  const ocrResult = await recognizeImage(buffer);
  const { imageRegions, questionRegions } = detectImageRegions(ocrResult);

  const debugJsonPath = resolve(outputDir, 'ocr-debug.json');
  writeFileSync(
    debugJsonPath,
    JSON.stringify(
      {
        width: ocrResult.Width,
        height: ocrResult.Height,
        wordCount: ocrResult.PrismWordsInfo.length,
        questionRegions,
        imageRegions
      },
      null,
      2
    )
  );
  console.log(`   ✅ 调试 JSON 已输出: ${debugJsonPath}`);

  const svg = buildSvgOverlay(
    ocrResult.Width,
    ocrResult.Height,
    questionRegions,
    imageRegions
  );
  const svgBuffer = Buffer.from(svg);

  const composed = await sharp(buffer)
    .composite([{ input: svgBuffer, blend: 'over' }])
    .png()
    .toBuffer();
  const overlayPath = resolve(outputDir, `${name}-overlay.png`);
  writeFileSync(overlayPath, composed);
  console.log(`   ✅ 题目框图已输出: ${overlayPath}`);
}

function buildSvgOverlay(
  width: number,
  height: number,
  questionRegions: QuestionRegion[],
  imageRegions: Array<{ x: number; y: number; width: number; height: number }>
) {
  const rects: string[] = [];

  imageRegions.forEach((region, idx) => {
    rects.push(`
      <rect x="${region.x}" y="${region.y}" width="${region.width}" height="${region.height}" fill="rgba(0,128,255,0.15)" stroke="rgba(0,128,255,0.9)" stroke-width="2" />
      <text x="${region.x + 4}" y="${Math.max(region.y + 16, 16)}" font-size="18" fill="#0066cc">Img#${idx + 1}</text>
    `);
  });

  questionRegions.forEach(region => {
    const label = region.questionNumber || '?';
    rects.push(`
      <rect x="${region.bbox.x}" y="${region.bbox.y}" width="${region.bbox.width}" height="${region.bbox.height}" fill="rgba(255,0,0,0.12)" stroke="rgba(255,0,0,0.9)" stroke-width="3" />
      <text x="${region.bbox.x + 6}" y="${Math.max(region.bbox.y + 22, 22)}" font-size="26" font-weight="bold" fill="#ff0000">Q${label}</text>
    `);
  });

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${rects.join('\n')}
    </svg>
  `;
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : ['测试试卷1.png', '测试试卷2.png'];
  for (const target of targets) {
    try {
      await visualize(target);
    } catch (error) {
      console.error(`❌ 可视化 ${target} 失败:`, error);
    }
  }
  console.log('\n🎯 可视化完成，请查看 tmp/ocr-debug/<试卷名> 目录。');
}

main();
