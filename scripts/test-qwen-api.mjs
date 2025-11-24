/**
 * Qwen API 连通性测试脚本
 * 运行: node scripts/test-qwen-api.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载项目根目录的.env.local文件
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function testQwenAPI() {
  console.log('\n🧪 测试Qwen3-VL-Flash API连通性...\n');

  // 1. 检查环境变量
  const apiKey = process.env.QWEN_API_KEY;

  if (!apiKey) {
    console.error('❌ 错误: 缺少QWEN_API_KEY环境变量');
    console.error('📝 请在.env.local中设置: QWEN_API_KEY=sk-your-api-key\n');
    process.exit(1);
  }

  if (apiKey === 'sk-your-qwen-api-key-here') {
    console.error('❌ 错误: QWEN_API_KEY仍为占位符');
    console.error('📝 请将.env.local中的QWEN_API_KEY替换为您的实际API Key\n');
    process.exit(1);
  }

  console.log('✅ 环境变量已配置');
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}\n`);

  // 2. 调用Qwen API（简单文本测试）
  try {
    console.log('📡 发送测试请求到Qwen3-VL-Flash...');

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen3-vl-flash',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: '你好，请回复"连接成功"' }]
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API调用失败 (HTTP ${response.status})`);
      console.error('错误信息:', errorText);

      if (response.status === 401) {
        console.error('\n💡 提示: API Key可能无效，请检查：');
        console.error('   1. 是否已在阿里云DashScope控制台创建API Key');
        console.error('   2. 是否已完成实名认证');
        console.error('   3. API Key是否正确复制（包含sk-前缀）');
      } else if (response.status === 429) {
        console.error('\n💡 提示: 请求频率超限或余额不足');
      }

      process.exit(1);
    }

    const data = await response.json();

    // 3. 验证响应
    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      console.log('\n✅ Qwen API连接成功！');
      console.log('📝 AI响应:', content);

      if (data.usage) {
        console.log('\n📊 Token使用情况:');
        console.log(`   - 输入: ${data.usage.prompt_tokens} tokens`);
        console.log(`   - 输出: ${data.usage.completion_tokens} tokens`);
        console.log(`   - 总计: ${data.usage.total_tokens} tokens`);
      }

      console.log('\n🎉 测试通过！您可以开始使用AI题库系统了。');
      console.log('📚 下一步: 运行 npm run dev 启动开发服务器\n');

      return true;
    } else {
      console.error('\n❌ 响应格式异常');
      console.error('响应数据:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ 网络错误或未知异常');
    console.error('错误详情:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 提示: 无法连接到DashScope服务器，请检查网络');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 提示: 请求超时，请重试');
    }

    process.exit(1);
  }
}

// 运行测试
testQwenAPI();
