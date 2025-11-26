/**
 * 阿里云OCR诊断脚本
 * 用于排查403 "Not Purchased" 错误
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

// 加载环境变量
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface DiagnosticResult {
  step: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

function addResult(step: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
  results.push({ step, status, message, details });

  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${step}: ${message}`);
  if (details) {
    console.log('   详情:', JSON.stringify(details, null, 2));
  }
  console.log('');
}

async function checkEnvironmentVariables() {
  console.log('=== 步骤 1: 检查环境变量配置 ===\n');

  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const regionId = process.env.OCR_REGION || 'cn-hangzhou';

  if (!accessKeyId) {
    addResult(
      '环境变量检查',
      'fail',
      'ALIYUN_ACCESS_KEY_ID 未配置',
      { hint: '请在 .env.local 中添加 ALIYUN_ACCESS_KEY_ID=your-key-id' }
    );
    return false;
  }

  if (!accessKeySecret) {
    addResult(
      '环境变量检查',
      'fail',
      'ALIYUN_ACCESS_KEY_SECRET 未配置',
      { hint: '请在 .env.local 中添加 ALIYUN_ACCESS_KEY_SECRET=your-key-secret' }
    );
    return false;
  }

  addResult(
    '环境变量检查',
    'pass',
    '所有必需的环境变量已配置',
    {
      accessKeyId: `${accessKeyId.slice(0, 8)}...${accessKeyId.slice(-4)}`,
      accessKeySecret: '***已隐藏***',
      regionId
    }
  );

  return true;
}

async function checkAccessKeyFormat() {
  console.log('=== 步骤 2: 验证AccessKey格式 ===\n');

  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID!;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET!;

  // AccessKey ID 通常是 24 个字符
  if (accessKeyId.length < 16 || accessKeyId.length > 30) {
    addResult(
      'AccessKey格式',
      'warning',
      'AccessKey ID 长度异常',
      { length: accessKeyId.length, expected: '16-30字符' }
    );
  } else {
    addResult(
      'AccessKey格式',
      'pass',
      'AccessKey ID 格式正确',
      { length: accessKeyId.length }
    );
  }

  // AccessKey Secret 通常是 30 个字符
  if (accessKeySecret.length < 20 || accessKeySecret.length > 50) {
    addResult(
      'AccessKey Secret格式',
      'warning',
      'AccessKey Secret 长度异常',
      { length: accessKeySecret.length, expected: '20-50字符' }
    );
  } else {
    addResult(
      'AccessKey Secret格式',
      'pass',
      'AccessKey Secret 格式正确',
      { length: accessKeySecret.length }
    );
  }
}

async function checkNetworkConnectivity() {
  console.log('=== 步骤 3: 检查网络连接 ===\n');

  const regionId = process.env.OCR_REGION || 'cn-hangzhou';
  const endpoint = `ocr-api.${regionId}.aliyuncs.com`;

  try {
    // 尝试DNS解析
    const url = `https://${endpoint}`;
    await axios.get(url, {
      timeout: 5000,
      validateStatus: () => true // 接受任何状态码
    });

    addResult(
      '网络连接',
      'pass',
      `成功连接到 ${endpoint}`,
      { endpoint, regionId }
    );
    return true;
  } catch (error: any) {
    if (error.code === 'ENOTFOUND') {
      addResult(
        '网络连接',
        'fail',
        `无法解析域名 ${endpoint}`,
        { error: error.message, hint: '请检查网络连接和地域配置' }
      );
    } else if (error.code === 'ETIMEDOUT') {
      addResult(
        '网络连接',
        'fail',
        `连接超时 ${endpoint}`,
        { error: error.message, hint: '请检查防火墙或代理设置' }
      );
    } else {
      addResult(
        '网络连接',
        'warning',
        `网络请求异常: ${error.message}`,
        { error: error.code }
      );
    }
    return false;
  }
}

async function testOCRAPICall() {
  console.log('=== 步骤 4: 测试OCR API调用 ===\n');

  try {
    // 动态导入SDK
    const OCR = await import('@alicloud/ocr20191230');
    const Client = OCR.default;
    const { RecognizeCharacterAdvanceRequest } = OCR;

    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID!;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET!;
    const regionId = process.env.OCR_REGION || 'cn-hangzhou';

    // 创建客户端配置（华东1杭州使用 ocr-api 格式）
    const config: any = {
      accessKeyId,
      accessKeySecret,
      regionId,
      endpoint: `ocr-api.${regionId}.aliyuncs.com`,
    };

    const client = new Client(config);

    addResult(
      'OCR客户端初始化',
      'pass',
      '客户端初始化成功',
      { regionId, endpoint: config.endpoint }
    );

    // 创建测试图片（1x1像素的白色PNG）
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    // 测试API调用
    const { Readable } = await import('stream');
    const request = new RecognizeCharacterAdvanceRequest({
      imageURLObject: Readable.from(testImageBuffer),
      outputProbability: true,
      minHeight: 10,
    });

    const runtime: any = {};

    console.log('正在调用OCR API（使用测试图片）...\n');

    const response = await client.recognizeCharacterAdvance(request, runtime);

    if (response.body?.data) {
      addResult(
        'OCR API调用',
        'pass',
        '✨ API调用成功！服务已正常激活',
        {
          requestId: response.body.requestId || 'N/A',
          imageSize: `${response.body.data.width}x${response.body.data.height}`,
          textLength: response.body.data.content?.length || 0
        }
      );
      return true;
    } else {
      addResult(
        'OCR API调用',
        'warning',
        'API返回数据为空',
        { response: response.body }
      );
      return false;
    }

  } catch (error: any) {
    console.error('API调用失败，错误详情:\n', error);

    if (error.code === 'InvalidApi.NotPurchase' || error.message?.includes('not purchased')) {
      addResult(
        'OCR API调用',
        'fail',
        '❌ 服务未开通 (403 Not Purchased)',
        {
          errorCode: error.code || 'InvalidApi.NotPurchase',
          message: error.message,
          solution: [
            '1. 访问 https://ocr.console.aliyun.com/',
            '2. 点击"立即开通"按钮',
            '3. 同意服务协议',
            '4. 等待 5-10 分钟后重试',
            '5. 确认开通的是"通用文字识别"产品'
          ]
        }
      );
    } else if (error.code === 'InvalidAccessKeyId.NotFound') {
      addResult(
        'OCR API调用',
        'fail',
        '❌ AccessKey ID 无效',
        {
          errorCode: error.code,
          solution: [
            '1. 检查 .env.local 中的 ALIYUN_ACCESS_KEY_ID',
            '2. 确认Key是否被禁用或删除',
            '3. 访问 https://ram.console.aliyun.com/manage/ak 重新创建'
          ]
        }
      );
    } else if (error.code === 'SignatureDoesNotMatch') {
      addResult(
        'OCR API调用',
        'fail',
        '❌ AccessKey Secret 错误',
        {
          errorCode: error.code,
          solution: [
            '1. 检查 .env.local 中的 ALIYUN_ACCESS_KEY_SECRET',
            '2. 确认Secret没有复制错误（注意空格）',
            '3. 如有必要，重新创建AccessKey'
          ]
        }
      );
    } else if (error.code === 'Forbidden.RAM') {
      addResult(
        'OCR API调用',
        'fail',
        '❌ RAM用户权限不足',
        {
          errorCode: error.code,
          solution: [
            '1. 访问 https://ram.console.aliyun.com/users',
            '2. 为RAM用户添加 "AliyunOCRFullAccess" 权限策略',
            '3. 或使用主账号的AccessKey进行测试'
          ]
        }
      );
    } else {
      addResult(
        'OCR API调用',
        'fail',
        `API调用失败: ${error.message || error.code || '未知错误'}`,
        {
          errorCode: error.code,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3)
        }
      );
    }

    return false;
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 诊断结果汇总');
  console.log('='.repeat(60) + '\n');

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  console.log(`总检查项: ${results.length}`);
  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⚠️  警告: ${warningCount}`);
  console.log('');

  if (failCount === 0 && warningCount === 0) {
    console.log('🎉 所有检查通过！OCR服务配置正确。\n');
    console.log('如果上传时仍有问题，请检查:');
    console.log('1. 开发服务器是否已重启');
    console.log('2. 浏览器缓存是否已清除');
    console.log('3. 查看完整的服务器日志');
  } else if (failCount > 0) {
    console.log('⚠️  检测到严重问题，请根据上述提示解决。\n');
    console.log('常见解决方案:');
    console.log('1. 访问 https://ocr.console.aliyun.com/ 开通服务');
    console.log('2. 检查 .env.local 中的配置是否正确');
    console.log('3. 确认AccessKey具有OCR权限');
    console.log('4. 等待服务激活生效（5-10分钟）');
  } else {
    console.log('⚠️  配置基本正常，但有一些警告项需要注意。\n');
  }

  console.log('='.repeat(60));
  console.log('详细排查指南: docs/AI题库-阿里云OCR 403错误排查指南.md');
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        阿里云OCR服务诊断工具 v1.0                     ║');
  console.log('║        Aliyun OCR Service Diagnostic Tool              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n');

  const envOk = await checkEnvironmentVariables();
  if (!envOk) {
    console.log('\n❌ 环境变量配置不完整，无法继续诊断。\n');
    printSummary();
    process.exit(1);
  }

  await checkAccessKeyFormat();
  await checkNetworkConnectivity();
  const apiOk = await testOCRAPICall();

  printSummary();

  process.exit(apiOk ? 0 : 1);
}

main().catch(error => {
  console.error('\n❌ 诊断脚本执行失败:\n', error);
  process.exit(1);
});
