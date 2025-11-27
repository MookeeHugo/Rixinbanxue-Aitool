/**
 * Gemini 坐标可视化调试工具
 * 在原图上画出Gemini识别的边界框，用于验证定位准确性
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// 测试图片路径
const testImages = [
  '测试试卷5.png',
  '测试试卷6.png',
  '测试试卷7.png',
  '测试试卷9.png',
  '测试试卷10.png'
];

async function visualizeBoxes(imageName: string) {
  console.log(`\n处理: ${imageName}`);

  const imagePath = join(process.cwd(), imageName);
  const resultDir = join(process.cwd(), 'tmp', 'gemini-test-results', imageName.replace('.png', ''));
  const resultJsonPath = join(resultDir, 'gemini-result.json');

  // 读取Gemini解析结果
  const geminiResult = JSON.parse(readFileSync(resultJsonPath, 'utf-8'));

  // 读取原图
  const imageBuffer = readFileSync(imagePath);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  console.log(`图片尺寸: ${metadata.width}x${metadata.height}`);

  // 创建SVG overlay来画框
  const boxes: string[] = [];

  geminiResult.questions.forEach((question: any, index: number) => {
    if (question.image_regions && question.image_regions.length > 0) {
      question.image_regions.forEach((region: any, regionIndex: number) => {
        const { x, y, width, height } = region;

        console.log(`  题${question.number} 区域${regionIndex + 1}: x=${x}, y=${y}, w=${width}, h=${height}`);

        // 画红色边框
        boxes.push(`
          <rect
            x="${x}" y="${y}"
            width="${width}" height="${height}"
            fill="none"
            stroke="red"
            stroke-width="3"
          />
        `);

        // 添加标签
        boxes.push(`
          <text
            x="${x + 5}" y="${y + 20}"
            font-size="16"
            font-weight="bold"
            fill="red"
            style="text-shadow: 1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white, -1px 1px 2px white;"
          >题${question.number}</text>
        `);
      });
    }
  });

  if (boxes.length === 0) {
    console.log('  ⚠️ 没有检测到图像区域');
    return;
  }

  // 创建SVG overlay
  const svgOverlay = `
    <svg width="${metadata.width}" height="${metadata.height}">
      ${boxes.join('\n')}
    </svg>
  `;

  // 合成图片
  const outputPath = join(resultDir, 'debug-boxes.png');
  await image
    .composite([{
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0
    }])
    .toFile(outputPath);

  console.log(`  ✅ 可视化结果已保存: ${outputPath}`);
}

async function main() {
  console.log('====================================');
  console.log('Gemini 坐标可视化调试工具');
  console.log('====================================');

  for (const imageName of testImages) {
    try {
      await visualizeBoxes(imageName);
    } catch (error) {
      console.error(`  ❌ 处理失败:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n====================================');
  console.log('✅ 处理完成！');
  console.log('====================================');
  console.log('\n请查看各测试结果目录下的 debug-boxes.png 文件');
  console.log('红色框应该精准地框住几何图形/函数图像');
  console.log('如果框选了文字公式，说明Prompt需要进一步优化');
}

main().catch(console.error);
