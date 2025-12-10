#!/usr/bin/env node
/**
 * 直接测试图片裁剪功能
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testCrop() {
  // 动态导入 ES 模块
  const { cropAndUploadQuestionImages } = await import('../src/lib/ai-question-bank/crop-question-images.ts');

  const imagePath = path.join(__dirname, '../logs/test-reports/2025test/2025test01.jpg');
  const imageBuffer = fs.readFileSync(imagePath);

  const questions = [
    {
      number: '4',
      image_regions: [
        { x: 645, y: 116, width: 488, height: 262 }
      ]
    },
    {
      number: '5',
      image_regions: [
        { x: 717, y: 514, width: 377, height: 261 }
      ]
    }
  ];

  console.log('🧪 测试裁剪功能...');
  console.log('图片路径:', imagePath);
  console.log('图片大小:', imageBuffer.length, 'bytes');
  console.log('题目数:', questions.length);

  try {
    const result = await cropAndUploadQuestionImages(
      'test-task-id',
      imageBuffer,
      questions
    );

    console.log('\n✅ 裁剪结果:');
    console.log('  totalRegions:', result.totalRegions);
    console.log('  succeededRegions:', result.succeededRegions);
    console.log('  failedRegions:', result.failedRegions);
    console.log('\n  assetsByQuestion:');
    Object.entries(result.assetsByQuestion).forEach(([qNum, assets]) => {
      console.log(`    题号 ${qNum}: ${assets.length} 个资源`);
      assets.forEach(asset => {
        console.log(`      - URL: ${asset.url}`);
      });
    });
  } catch (error) {
    console.error('\n❌ 裁剪失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

testCrop();
