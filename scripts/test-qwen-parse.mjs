#!/usr/bin/env node

/**
 * 测试 Qwen3-VL-Flash 图片解析功能
 * 用于调试 base64 decode fail 问题
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

if (!QWEN_API_KEY) {
  console.error('❌ 缺少 QWEN_API_KEY 环境变量');
  process.exit(1);
}

// 读取测试图片
const testImagePath = process.argv[2] || resolve('tests/fixtures/test-image.png');
console.log(`📖 读取测试图片: ${testImagePath}`);

let fileBuffer;
try {
  fileBuffer = readFileSync(testImagePath);
  console.log(`✅ 文件读取成功: ${fileBuffer.length} bytes`);
} catch (error) {
  console.error('❌ 文件读取失败:', error.message);
  process.exit(1);
}

// 转换为 Base64
const base64 = fileBuffer.toString('base64');
console.log(`✅ Base64 转换完成: ${base64.length} 字符`);
console.log(`   前50字符: ${base64.substring(0, 50)}...`);
console.log(`   后50字符: ...${base64.substring(base64.length - 50)}`);

// 检查是否包含空白字符
const hasWhitespace = /\s/.test(base64);
console.log(`   包含空白字符: ${hasWhitespace ? '❌ 是' : '✅ 否'}`);

// 清理空白字符
const sanitizedBase64 = base64.replace(/\s+/g, '');
console.log(`✅ Base64 清理完成: ${sanitizedBase64.length} 字符`);

// 推断 MIME 类型
const ext = testImagePath.toLowerCase().split('.').pop();
let mimeType;
switch (ext) {
  case 'png':
    mimeType = 'image/png';
    break;
  case 'jpg':
  case 'jpeg':
    mimeType = 'image/jpeg';
    break;
  default:
    mimeType = 'image/jpeg';
}
console.log(`✅ MIME 类型: ${mimeType}`);

// 构造 Data URL
const dataUrl = `data:${mimeType};base64,${sanitizedBase64}`;
console.log(`✅ Data URL 长度: ${dataUrl.length} 字符`);
console.log(`   前100字符: ${dataUrl.substring(0, 100)}...`);

// 构造请求
const requestBody = {
  model: 'qwen3-vl-flash',
  messages: [
    {
      role: 'system',
      content: [
        {
          type: 'text',
          text: '你是专业的初中数学题目识别专家。请仔细分析图片中的题目，提取题号、题型、题干、选项、答案和解析。'
        }
      ]
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: '请分析图片中的题目，严格按照 JSON 格式输出。'
        },
        {
          type: 'image_url',
          image_url: {
            url: dataUrl
          }
        }
      ]
    }
  ],
  temperature: 0.1,
  max_tokens: 4096
};

console.log('\n🚀 发送请求到 Qwen API...');
console.log(`   Model: ${requestBody.model}`);
console.log(`   Messages: ${requestBody.messages.length}`);
console.log(`   Temperature: ${requestBody.temperature}`);

try {
  const response = await fetch(QWEN_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QWEN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log(`\n📥 响应状态: ${response.status} ${response.statusText}`);

  const responseData = await response.json();

  if (!response.ok) {
    console.error('\n❌ API 请求失败:');
    console.error(JSON.stringify(responseData, null, 2));

    if (responseData.error?.message?.includes('base64 decode fail')) {
      console.error('\n🔍 Base64 解码失败分析:');
      console.error('   1. 检查 Data URL 格式是否正确');
      console.error('   2. 检查 Base64 字符串是否包含非法字符');
      console.error('   3. 检查图片文件是否损坏');
      console.error('   4. 尝试使用更小的图片（<2MB）');
    }

    process.exit(1);
  }

  console.log('\n✅ API 请求成功!');
  console.log('\n📄 响应内容:');
  console.log(JSON.stringify(responseData, null, 2));

  if (responseData.choices?.[0]?.message?.content) {
    console.log('\n📝 模型输出:');
    console.log(responseData.choices[0].message.content);
  }

  if (responseData.usage) {
    console.log('\n📊 Token 使用量:');
    console.log(`   Prompt tokens: ${responseData.usage.prompt_tokens}`);
    console.log(`   Completion tokens: ${responseData.usage.completion_tokens}`);
    console.log(`   Total tokens: ${responseData.usage.total_tokens}`);
  }

} catch (error) {
  console.error('\n❌ 请求异常:', error.message);
  if (error.cause) {
    console.error('   原因:', error.cause);
  }
  process.exit(1);
}

console.log('\n✅ 测试完成!');
