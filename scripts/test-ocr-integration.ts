/**
 * 阿里云OCR集成测试脚本
 * @description 测试OCR识别、图像区域检测、智能匹配等功能
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

async function testOCRIntegration() {
  console.log('\n========================================');
  console.log('阿里云OCR集成测试');
  console.log('========================================\n');

  // Step 1: 检查环境变量配置
  console.log('[Step 1] 检查环境变量配置...');
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const region = process.env.OCR_REGION || 'cn-hangzhou';

  if (!accessKeyId || !accessKeySecret) {
    console.error('❌ 阿里云AccessKey未配置');
    console.log('\n请在 .env.local 中配置：');
    console.log('  ALIYUN_ACCESS_KEY_ID=your-access-key-id');
    console.log('  ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret');
    console.log('  OCR_REGION=cn-hangzhou');
    process.exit(1);
  }

  console.log('✅ 环境变量配置完整');
  console.log(`   Region: ${region}`);
  console.log(`   AccessKeyId: ${accessKeyId.substring(0, 8)}...`);

  // Step 2: 检查依赖是否已安装
  console.log('\n[Step 2] 检查依赖包...');
  try {
    // 检查node_modules是否存在SDK包
    const { existsSync } = await import('fs');
    const { join } = await import('path');

    const ocrPath = join(process.cwd(), 'node_modules', '@alicloud', 'ocr-api20210707');
    if (!existsSync(ocrPath)) {
      console.error('❌ 阿里云OCR SDK未安装');
      console.log('\n请运行: npm install');
      process.exit(1);
    }

    console.log('✅ 阿里云OCR SDK已安装');
  } catch (error) {
    console.error('❌ 依赖包检查失败:', error);
    process.exit(1);
  }

  // Step 3: 测试OCR客户端功能
  console.log('\n[Step 3] 测试OCR客户端...');

  try {
    const { checkOCRConfig } = await import('../src/lib/ai-question-bank/aliyun-ocr-client');
    const isConfigured = checkOCRConfig();

    if (!isConfigured) {
      console.error('❌ OCR配置检查失败');
      process.exit(1);
    }

    console.log('✅ OCR配置检查通过');
  } catch (error) {
    console.error('❌ OCR客户端加载失败:', error);
    process.exit(1);
  }

  // Step 4: 检查测试图片（可选）
  console.log('\n[Step 4] 检查测试图片...');
  const testImagePaths = [
    'test-images/sample.png',
    'test-images/geometry.png',
    'test-images/questions.png'
  ];

  let testImagePath: string | null = null;
  for (const path of testImagePaths) {
    if (existsSync(path)) {
      testImagePath = path;
      console.log(`✅ 找到测试图片: ${path}`);
      break;
    }
  }

  if (!testImagePath) {
    console.log('⚠️  未找到测试图片（可选）');
    console.log('   你可以在 test-images/ 目录下放置测试图片');
    console.log('   支持格式: PNG, JPG, JPEG');
  }

  // Step 5: 如果有测试图片，执行OCR识别
  if (testImagePath) {
    console.log('\n[Step 5] 执行OCR识别测试...');
    try {
      const { recognizeImage } = await import('../src/lib/ai-question-bank/aliyun-ocr-client');
      const { detectImageRegions } = await import('../src/lib/ai-question-bank/image-region-detector');

      const imageBuffer = readFileSync(testImagePath);
      console.log(`   图片大小: ${Math.round(imageBuffer.length / 1024)} KB`);

      console.log('   正在调用阿里云OCR API...');
      const startTime = Date.now();
      const ocrResult = await recognizeImage(imageBuffer);
      const duration = Date.now() - startTime;

      console.log(`✅ OCR识别成功 (耗时: ${duration}ms)`);
      console.log(`   图片尺寸: ${ocrResult.Width}x${ocrResult.Height}`);
      console.log(`   识别文字块: ${ocrResult.PrismWordsInfo.length}个`);
      console.log(`   文本内容长度: ${ocrResult.Content.length}字符`);

      // 显示识别的前100个字符
      if (ocrResult.Content) {
        const preview = ocrResult.Content.substring(0, 100);
        console.log(`\n   识别内容预览:\n   ${preview}${ocrResult.Content.length > 100 ? '...' : ''}`);
      }

      // 测试图像区域检测
      console.log('\n[Step 6] 测试图像区域检测...');
      const { imageRegions, questionRegions } = detectImageRegions(ocrResult);
      console.log(`✅ 区域检测完成`);
      console.log(`   配图区域: ${imageRegions.length}个`);
      console.log(`   题目区域: ${questionRegions.length}个`);

      if (imageRegions.length > 0) {
        console.log('\n   检测到的配图区域:');
        imageRegions.forEach((region, index) => {
          console.log(`   [${index + 1}] (${region.x}, ${region.y}) ${region.width}x${region.height}`);
        });
      }

      if (questionRegions.length > 0) {
        console.log('\n   检测到的题目区域:');
        questionRegions.forEach((region, index) => {
          console.log(`   [${index + 1}] 题号 ${region.questionNumber}: Y=${region.bbox.y} 高度=${region.bbox.height}`);
        });
      }

    } catch (error) {
      console.error('❌ OCR识别失败:', error);
      if (error instanceof Error) {
        console.error('   错误详情:', error.message);
      }
      process.exit(1);
    }
  } else {
    console.log('\n[Step 5-6] 跳过OCR识别测试（无测试图片）');
  }

  // 测试完成
  console.log('\n========================================');
  console.log('✅ 所有测试通过！');
  console.log('========================================\n');
  console.log('下一步：');
  console.log('1. 准备测试图片放在 test-images/ 目录下');
  console.log('2. 运行 npm run dev:legacy 启动开发服务器');
  console.log('3. 通过前端界面上传图片测试完整流程');
  console.log('');
}

// 运行测试
testOCRIntegration().catch(error => {
  console.error('\n❌ 测试执行失败:', error);
  process.exit(1);
});
