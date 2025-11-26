/**
 * 测试阿里云OCR API调用
 * 用于诊断API调用问题
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { Readable } from 'stream';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

async function testOCRAPI() {
  console.log('\n========================================');
  console.log('阿里云OCR API测试');
  console.log('========================================\n');

  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const regionId = process.env.OCR_REGION || 'cn-hangzhou';

  if (!accessKeyId || !accessKeySecret) {
    console.error('❌ 缺少环境变量');
    process.exit(1);
  }

  console.log('✅ 环境变量已加载');
  console.log(`   Region: ${regionId}`);
  console.log(`   AccessKey: ${accessKeyId.substring(0, 8)}...\n`);

  // 检查测试图片
  const testImagePaths = [
    'test-images/sample.png',
    'test-images/geometry.png',
    'test-images/questions.png'
  ];

  let testImagePath: string | null = null;
  for (const path of testImagePaths) {
    if (existsSync(path)) {
      testImagePath = path;
      break;
    }
  }

  if (!testImagePath) {
    console.error('❌ 未找到测试图片');
    console.log('请在以下路径之一放置测试图片：');
    testImagePaths.forEach(p => console.log(`   - ${p}`));
    process.exit(1);
  }

  console.log(`✅ 找到测试图片: ${testImagePath}\n`);

  try {
    // 动态导入SDK
    console.log('[1/5] 加载OCR SDK...');
    const OCR = await import('@alicloud/ocr-api20210707');
    const OpenApiUtil = await import('@alicloud/openapi-util');

    const Client = OCR.default;
    console.log('✅ SDK加载成功');
    console.log(`   Client类型: ${typeof Client}`);
    console.log(`   OpenApiUtil类型: ${typeof OpenApiUtil}`);

    // 读取测试图片
    console.log('\n[2/5] 读取测试图片...');
    const imageBuffer = readFileSync(testImagePath);
    console.log(`✅ 图片读取成功: ${Math.round(imageBuffer.length / 1024)}KB`);

    // 创建客户端
    console.log('\n[3/5] 创建OCR客户端...');
    const endpoint = `ocr-api.${regionId}.aliyuncs.com`;

    const config = new OpenApiUtil.Config({
      accessKeyId,
      accessKeySecret,
      regionId,
      endpoint,
    });

    const client = new Client(config);
    console.log('✅ 客户端创建成功');
    console.log(`   Endpoint: ${endpoint}`);

    // 检查client的可用方法
    console.log('\n[4/5] 检查可用的API方法...');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(client));
    console.log('   可用方法:');
    methods.filter(m => m.includes('recognize')).forEach(m => console.log(`     - ${m}`));

    // 调用OCR API
    console.log('\n[5/5] 调用OCR API...');
    console.log('   方法: recognizeAdvanced');
    console.log('   正在识别...');

    const startTime = Date.now();

    const response = await client.recognizeAdvanced({
      body: Readable.from(imageBuffer),
      outputCharInfo: true,
      needRotate: false,
      noStamp: true,
      paragraph: true,
      row: true,
    });

    const duration = Date.now() - startTime;

    console.log(`✅ API调用成功 (耗时: ${duration}ms)`);
    console.log('\n响应结构:');
    console.log(`   body类型: ${typeof response.body}`);
    console.log(`   statusCode: ${response.statusCode}`);

    if (response.body) {
      console.log(`   body.data类型: ${typeof response.body.data}`);

      if (response.body.data) {
        const data = response.body.data;
        console.log(`   content长度: ${data.content?.length || 0}`);
        console.log(`   width: ${data.width}`);
        console.log(`   height: ${data.height}`);
        console.log(`   prismWordsInfo数量: ${data.prismWordsInfo?.length || data.prism_wordsInfo?.length || 0}`);

        if (data.content) {
          console.log(`\n   识别文本预览:\n   ${data.content.substring(0, 100)}...`);
        }
      }
    }

    console.log('\n========================================');
    console.log('✅ 测试通过！OCR API工作正常');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ 测试失败');
    console.error('========================================\n');

    console.error('错误类型:', error?.constructor?.name);
    console.error('错误消息:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\n错误堆栈:');
      console.error(error.stack);
    }

    console.error('\n完整错误对象:');
    console.error(error);

    process.exit(1);
  }
}

testOCRAPI();
