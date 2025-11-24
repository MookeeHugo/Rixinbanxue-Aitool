/**
 * AI题库系统 - Qwen3-VL-Flash API 客户端
 * @description 封装 Qwen FlashScope API 调用，支持结构化输出
 */

import axios from 'axios';
import { getQwenPromptMessages } from './prompts';
import { QwenParseResultSchema } from './schemas';
import type { ParsedQuestion, QwenFlashConfig } from './types';

/**
 * Qwen3-VL-Flash 默认配置
 */
const DEFAULT_CONFIG: Omit<QwenFlashConfig, 'apiKey'> = {
  apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen3-vl-flash',
  temperature: 0.1, // 低温度确保输出更稳定
  maxTokens: 4096
};

/**
 * Qwen API 响应类型
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
 * 尝试从模型响应中提取 JSON（兼容 Markdown 代码块）
 */
function extractJSON(content: string): string {
  const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const generalCodeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
  if (generalCodeBlockMatch) {
    return generalCodeBlockMatch[1].trim();
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  throw new Error('无法从模型响应中提取 JSON');
}

/**
 * 调用 Qwen3-VL-Flash 解析题目，支持 Base64 或 URL 输入
 */
type ParseConfig = Partial<QwenFlashConfig> & {
  mimeType?: string;
  imageUrl?: string;
};

export async function parseQuestions(
  imageBase64: string | null,
  config?: ParseConfig
): Promise<ParsedQuestion[]> {
  const apiKey = config?.apiKey || process.env.QWEN_API_KEY;

  if (!apiKey) {
    throw new Error('缺少 QWEN_API_KEY 环境变量');
  }

  const { mimeType, imageUrl, ...restConfig } = config || {};
  const sanitizedBase64 = imageBase64?.replace(/\s+/g, '');

  if (!sanitizedBase64 && !imageUrl) {
    throw new Error('必须提供 Base64 编码数据或图片 URL');
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...restConfig, apiKey };
  const imageMime = mimeType || 'image/jpeg';
  const apiUrl = `${finalConfig.apiUrl}/chat/completions`;
  const promptMessages = getQwenPromptMessages({
    base64: sanitizedBase64 ?? undefined,
    mimeType: imageMime,
    imageUrl: imageUrl ?? undefined
  });

  if (sanitizedBase64) {
    console.log('Qwen parse request preview', {
      mimeType: imageMime,
      base64Length: sanitizedBase64.length,
      dataUrlLength: sanitizedBase64.length + `data:${imageMime};base64,`.length,
      base64Head: sanitizedBase64.slice(0, 32),
      base64Tail: sanitizedBase64.slice(-32)
    });
  } else if (imageUrl) {
    console.log('Qwen parse request preview (url)', {
      mimeType: imageMime,
      imageUrl
    });
  } else {
    console.log('Qwen parse request preview', {
      mimeType: imageMime,
      base64Present: false,
      imageUrlPresent: false
    });
  }

  try {
    const response = await axios.post<QwenAPIResponse>(
      apiUrl,
      {
        model: finalConfig.model,
        messages: promptMessages,
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        maxBodyLength: Infinity
      }
    );

    const data = response.data;

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Qwen API 返回为空');
    }

    const jsonString = extractJSON(content);
    const parsed = JSON.parse(jsonString);

    const validationResult = QwenParseResultSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error('Qwen 返回格式不合法', validationResult.error.format());
      throw new Error(`AI 返回格式不正确: ${validationResult.error.message}`);
    }

    return validationResult.data.questions;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 'unknown';
      const payload =
        typeof error.response?.data === 'string'
          ? error.response?.data
          : JSON.stringify(error.response?.data || {});
      console.error('Qwen API 调用失败', { status, payload, message: error.message });
      throw new Error(`题目解析失败: Qwen API 错误 (${status}): ${payload}`);
    }
    if (error instanceof Error) {
      console.error('Qwen API 调用失败', { error: error.message, stack: error.stack });
      throw new Error(`题目解析失败: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 批量解析多页 PDF（逐页串行调用）
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
 * 粗略估算调用成本（人民币）
 */
export function estimateCost(questionCount: number): number {
  const COST_PER_QUESTION = 0.002; // 约 ¥0.002/题
  return questionCount * COST_PER_QUESTION;
}

/**
 * 测试 API 连通性
 */
export async function checkAPIConnection(apiKey?: string): Promise<boolean> {
  try {
    const key = apiKey || process.env.QWEN_API_KEY;
    if (!key) return false;

    const sampleImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg';
    await parseQuestions(null, { apiKey: key, imageUrl: sampleImageUrl });
    return true;
  } catch {
    return false;
  }
}
