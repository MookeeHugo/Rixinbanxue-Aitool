/**
 * AI题库系统 - Qwen3-VL-Flash API客户端
 * @description 封装阿里云DashScope API调用，支持结构化输出
 */

import { getQwenPromptMessages } from './prompts';
import { QwenParseResultSchema } from './schemas';
import type { ParsedQuestion, QwenFlashConfig } from './types';

/**
 * Qwen3-VL-Flash默认配置
 */
const DEFAULT_CONFIG: Omit<QwenFlashConfig, 'apiKey'> = {
  apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen3-vl-flash',
  temperature: 0.1, // 低温度保证输出稳定
  maxTokens: 4096
};

/**
 * Qwen API响应类型
 */
interface QwenAPIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  id: string;
  model: string;
}

/**
 * 解析Qwen返回的JSON（可能包含Markdown代码块）
 */
function extractJSON(content: string): string {
  // 尝试1: 匹配```json...```代码块
  const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 尝试2: 匹配```...```代码块（无json标记）
  const generalCodeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
  if (generalCodeBlockMatch) {
    return generalCodeBlockMatch[1].trim();
  }

  // 尝试3: 匹配纯JSON对象
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  throw new Error('无法从响应中提取JSON');
}

/**
 * 调用Qwen3-VL-Flash解析题目
 * @param imageBase64 Base64编码的图片（不含data:image前缀）
 * @param config 可选配置（覆盖默认值）
 * @returns 解析的题目数组
 */
type ParseConfig = Partial<QwenFlashConfig> & { mimeType?: string };

export async function parseQuestions(
  imageBase64: string,
  config?: ParseConfig
): Promise<ParsedQuestion[]> {
  const apiKey = config?.apiKey || process.env.QWEN_API_KEY;

  if (!apiKey) {
    throw new Error('缺少QWEN_API_KEY环境变量');
  }

  const { mimeType, ...restConfig } = config || {};
  const sanitizedBase64 = imageBase64.replace(/\s+/g, '');
  const finalConfig = { ...DEFAULT_CONFIG, ...restConfig, apiKey };
  const imageMime = mimeType || 'image/jpeg';
  const apiUrl = `${finalConfig.apiUrl}/chat/completions`;

  try {
    // 1. 调用Qwen API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: finalConfig.model,
        messages: getQwenPromptMessages(sanitizedBase64, imageMime),
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API错误 (${response.status}): ${errorText}`);
    }

    const data: QwenAPIResponse = await response.json();

    // 2. 提取内容
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Qwen API返回空内容');
    }

    // 3. 解析JSON
    const jsonString = extractJSON(content);
    const parsed = JSON.parse(jsonString);

    // 4. Zod验证
    const validationResult = QwenParseResultSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error('Qwen返回格式错误', validationResult.error.format());
      throw new Error(`AI返回格式不正确: ${validationResult.error.message}`);
    }

    // 5. 返回验证后的数据
    return validationResult.data.questions;

  } catch (error) {
    if (error instanceof Error) {
      console.error('Qwen API调用失败', { error: error.message, stack: error.stack });
      throw new Error(`题目解析失败: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 批量解析多页PDF（分页调用）
 * @param pageImages Base64数组（每页一个）
 * @param config 配置
 * @param onProgress 进度回调
 * @returns 所有页的题目
 */
export async function parseQuestionsFromPages(
  pageImages: string[],
  config?: ParseConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<ParsedQuestion[]> {
  const allQuestions: ParsedQuestion[] = [];

  for (let i = 0; i < pageImages.length; i++) {
    const pageQuestions = await parseQuestions(pageImages[i], config);
    allQuestions.push(...pageQuestions);

    if (onProgress) {
      onProgress(i + 1, pageImages.length);
    }
  }

  return allQuestions;
}

/**
 * 获取API调用成本（估算）
 * @param questionCount 题目数量
 * @returns 成本（人民币）
 */
export function estimateCost(questionCount: number): number {
  const COST_PER_QUESTION = 0.002; // ¥0.002/题
  return questionCount * COST_PER_QUESTION;
}

/**
 * 检查API连通性
 */
export async function checkAPIConnection(apiKey?: string): Promise<boolean> {
  try {
    const key = apiKey || process.env.QWEN_API_KEY;
    if (!key) return false;

    // 使用小图片测试API
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // 1x1透明PNG

    await parseQuestions(testImage, { apiKey: key, mimeType: 'image/png' });
    return true;
  } catch {
    return false;
  }
}
