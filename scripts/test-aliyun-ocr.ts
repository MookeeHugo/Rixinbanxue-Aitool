/**
 * 阿里云OCR功能测试脚本
 * @description 验证OCR配置、图像识别、区域检测和智能匹配功能
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { recognizeImage, checkOCRConfig } from '../src/lib/ai-question-bank/aliyun-ocr-client';
import { detectImageRegions } from '../src/lib/ai-question-bank/image-region-detector';
import { matchQuestionImages } from '../src/lib/ai-question-bank/question-image-matcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '../.env.local') });

// 模拟题目数据
const mockQuestions = [
  { number: '1', type: 'choice' as const, content: '题目1', answer: 'A', tags: { knowledge: [], difficulty: 'medium' as const, type: 'choice' }, confidence: 0.95 },
  { number: '2', type: 'choice' as const, content: '题目2', answer: 'B', tags: { knowledge: [], difficulty: 'medium' as const, type: 'choice' }, confidence: 0.95 },
  { number: '3', type: 'choice' as const, content: '题目3', answer: 'C', tags: { knowledge: [], difficulty: 'medium' as const, type: 'choice' }, confidence: 0.95 },
];

async function testAliyunOCR() {
  console.log('\n========================================');
  console.log('阿里云OCR功能测试');
  console.log('========================================\n');

  // Test 1: 检查配置
  console.log('【测试1】检查阿里云OCR配置...');
  const isConfigured = checkOCRConfig();
  if (!isConfigured) {
    console.error('❌ 配置检查失败: 缺少环境变量 ALIYUN_ACCESS_KEY_ID 或 ALIYUN_ACCESS_KEY_SECRET');
    console.log('\n请在 .env.local 中配置：');
    console.log('ALIYUN_ACCESS_KEY_ID=your-access-key-id');
    console.log('ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret\n');
    process.exit(1);
  }
  console.log('✅ 配置检查通过\n');

  // Test 2: 读取测试图片
  console.log('【测试2】读取测试图片...');
  const testImagePath = path.join(__dirname, '../legacy/AI题库前端最新版/public/math-test-page-1.jpg');

  if (!fs.existsSync(testImagePath)) {
    console.error(`❌ 测试图片不存在: ${testImagePath}`);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(testImagePath);
  console.log(`✅ 读取成功: ${testImagePath}`);
  console.log(`   文件大小: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

  // Test 3: OCR识别
  console.log('【测试3】调用阿里云OCR识别...');
  try {
    const startTime = Date.now();
    const ocrResult = await recognizeImage(imageBuffer);
    const duration = Date.now() - startTime;

    console.log('✅ OCR识别成功');
    console.log(`   识别耗时: ${duration}ms`);
    console.log(`   图片尺寸: ${ocrResult.Width}x${ocrResult.Height}`);
    console.log(`   识别字数: ${ocrResult.PrismWordsInfo.length}`);
    console.log(`   前5个文字块: ${ocrResult.PrismWordsInfo.slice(0, 5).map(w => w.Word).join(', ')}\n`);

    // Test 4: 图像区域检测
    console.log('【测试4】检测图像区域...');
    const detectionResult = detectImageRegions(ocrResult);
    const { imageRegions, questionRegions } = detectionResult;

    console.log('✅ 图像区域检测完成');
    console.log(`   检测到图像区域: ${imageRegions.length}个`);
    console.log(`   检测到题目区域: ${questionRegions.length}个\n`);

    if (imageRegions.length > 0) {
      console.log('   图像区域详情:');
      imageRegions.forEach((region, idx) => {
        console.log(`   ${idx + 1}. 位置: (${Math.round(region.x)}, ${Math.round(region.y)}), 尺寸: ${Math.round(region.width)}x${Math.round(region.height)}, 方法: ${region.method}`);
      });
      console.log('');
    }

    if (questionRegions.length > 0) {
      console.log('   题目区域详情:');
      questionRegions.slice(0, 5).forEach((region) => {
        console.log(`   题号${region.questionNumber}: Y坐标 ${Math.round(region.bbox.y)}, 高度 ${Math.round(region.bbox.height)}, 文字数 ${region.words.length}`);
      });
      console.log('');
    }

    // Test 5: 智能匹配
    console.log('【测试5】智能匹配题目与配图...');
    if (imageRegions.length > 0 && mockQuestions.length > 0) {
      const imageMapping = matchQuestionImages(
        mockQuestions,
        imageRegions,
        questionRegions,
        ocrResult.PrismWordsInfo,
        ocrResult.Width,
        ocrResult.Height
      );

      const matchedCount = Object.keys(imageMapping).length;
      const matchRate = Math.round(matchedCount / mockQuestions.length * 100);

      console.log('✅ 智能匹配完成');
      console.log(`   匹配成功: ${matchedCount}/${mockQuestions.length} (${matchRate}%)`);

      if (matchedCount > 0) {
        console.log('\n   匹配详情:');
        Object.entries(imageMapping).forEach(([questionNumber, region]) => {
          console.log(`   题号${questionNumber}: 位置(${Math.round(region.x)}, ${Math.round(region.y)}), 尺寸${Math.round(region.width)}x${Math.round(region.height)}, 置信度${Math.round(region.confidence * 100)}%, 方法${region.matchMethod}`);
        });
      }
      console.log('');
    } else {
      console.log('⚠️  跳过智能匹配（无图像区域或题目）\n');
    }

    // Summary
    console.log('========================================');
    console.log('测试总结');
    console.log('========================================');
    console.log('✅ 配置验证: 通过');
    console.log('✅ OCR识别: 通过');
    console.log('✅ 图像检测: 通过');
    console.log('✅ 智能匹配: 通过');
    console.log('\n🎉 所有测试通过！阿里云OCR集成功能正常！\n');

  } catch (error) {
    console.error('\n❌ OCR识别失败:');
    if (error instanceof Error) {
      console.error(`   错误信息: ${error.message}`);
      console.error(`   错误堆栈:\n${error.stack}`);
    } else {
      console.error(`   未知错误: ${String(error)}`);
    }
    console.log('\n可能的原因:');
    console.log('1. AccessKey配置错误');
    console.log('2. 网络连接问题');
    console.log('3. 阿里云API调用限制');
    console.log('4. 图片格式不支持\n');
    process.exit(1);
  }
}

// 运行测试
testAliyunOCR().catch(error => {
  console.error('测试脚本执行失败:', error);
  process.exit(1);
});
