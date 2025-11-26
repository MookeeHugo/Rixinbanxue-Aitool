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
  maxTokens: 8000  // 增加到8000以避免长题目被截断
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
 * 尝试修复常见的JSON格式错误
 */
function escapeInlineNewlines(jsonString: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (const char of jsonString) {
    if (char === '\\') {
      result += char;
      escapeNext = !escapeNext;
      continue;
    }

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && (char === '\n' || char === '\r')) {
      result += '\\n';
      continue;
    }

    result += char;
  }

  return result;
}

function tryFixJSON(jsonString: string): string {
  // 移除BOM和零宽字符
  let fixed = jsonString.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 移除控制字符（保留换行符和制表符）
  fixed = fixed.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

  // 转义字符串中的裸换行符
  fixed = escapeInlineNewlines(fixed);

  // 尝试修复未闭合的JSON结构
  // 1. 检查是否有未闭合的字符串（最后一个引号后没有闭合）
  const lastQuoteIndex = fixed.lastIndexOf('"');
  if (lastQuoteIndex !== -1) {
    // 计算引号数量是否为偶数
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // 奇数个引号，添加闭合引号
      console.log('[JSON修复] 检测到未闭合的字符串，尝试添加引号');
      fixed = fixed + '"';
    }
  }

  // 2. 检查并补全缺失的结束大括号和方括号
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < fixed.length; i++) {
    const char = fixed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }

  // 补全缺失的闭合符号
  if (openBraces > 0 || openBrackets > 0) {
    console.log(`[JSON修复] 检测到未闭合的结构: ${openBraces}个大括号, ${openBrackets}个方括号`);

    // 补全方括号
    for (let i = 0; i < openBrackets; i++) {
      fixed += ']';
    }

    // 补全大括号
    for (let i = 0; i < openBraces; i++) {
      fixed += '}';
    }
  }

  return fixed;
}

/**
 * 获取JSON解析错误的上下文信息
 */
function getJSONErrorContext(jsonString: string, position: number): string {
  const start = Math.max(0, position - 100);
  const end = Math.min(jsonString.length, position + 100);
  const context = jsonString.substring(start, end);
  const relativePosition = position - start;

  return `...${context}...\n${' '.repeat(relativePosition + 3)}^ 错误位置`;
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

    console.log('[Qwen] 原始响应长度:', content.length);
    console.log('[Qwen] 响应预览:', content.substring(0, 500));

    let jsonString: string;
    try {
      jsonString = extractJSON(content);
      console.log('[Qwen] 提取的JSON长度:', jsonString.length);
    } catch (error) {
      console.error('[Qwen] JSON提取失败，完整响应:', content);
      throw error;
    }

    // 尝试修复常见的JSON格式问题
    const fixedJSON = tryFixJSON(jsonString);

    let parsed: any;
    try {
      parsed = JSON.parse(fixedJSON);
    } catch (parseError) {
      // 解析失败，记录详细信息
      console.error('[Qwen] JSON解析失败');
      console.error('[Qwen] 原始JSON长度:', jsonString.length);
      console.error('[Qwen] 修复后JSON长度:', fixedJSON.length);
      console.error('[Qwen] JSON前500字符:', fixedJSON.substring(0, 500));
      console.error('[Qwen] JSON后500字符:', fixedJSON.substring(Math.max(0, fixedJSON.length - 500)));

      if (parseError instanceof SyntaxError && parseError.message.includes('position')) {
        // 提取错误位置
        const positionMatch = parseError.message.match(/position (\d+)/);
        if (positionMatch) {
          const position = parseInt(positionMatch[1], 10);
          const errorContext = getJSONErrorContext(fixedJSON, position);
          console.error('[Qwen] 错误上下文:\n', errorContext);
        }
      }

      throw new Error(`JSON解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    const validationResult = QwenParseResultSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error('Qwen 返回格式不合法', JSON.stringify(validationResult.error.issues, null, 2));
      throw new Error(`AI 返回格式不正确: ${validationResult.error.message}`);
    }

    console.log('[Qwen] 成功解析题目数量:', validationResult.data.questions.length);
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
