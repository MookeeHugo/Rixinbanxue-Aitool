/**
 * DeepSeek API 客户端
 * - 提示收紧：系统提示 + 禁止 markdown
 * - JSON 解析与坐标校验
 * - 超时、重试、错误分类
 */

import type {
  DeepSeekRequest,
  DeepSeekResponse,
  DeepSeekGenerationResult,
  GenerationParameters,
  CoordinateData,
} from './types';

// ============================================================================
// 配置
// ============================================================================

const DEEPSEEK_CONFIG = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  timeout: parseInt(process.env.DEEPSEEK_REQUEST_TIMEOUT || '30000', 10),
  maxRetries: parseInt(process.env.DEEPSEEK_MAX_RETRIES || '2', 10),
} as const;

const SYSTEM_PROMPT = `
你是数学出题与安全编码助手，只输出严格的 JSON：
- 必须包含 question_text、python_code、coordinates 三个字段
- python_code 必须定义 generate_diagram()，只允许导入 matplotlib、numpy、base64、io、json、math
- 禁止任何文件/网络/系统调用，禁止导入白名单之外的模块
- 不要输出 Markdown、解释或额外文本
`.trim();

// ============================================================================
// 错误类
// ============================================================================

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: any
  ) {
    super(message);
    this.name = 'DeepSeekError';
  }
}

export class DeepSeekTimeoutError extends DeepSeekError {
  constructor(timeoutMs: number) {
    super(`DeepSeek 请求超时（${timeoutMs}ms）`);
    this.name = 'DeepSeekTimeoutError';
  }
}

export class DeepSeekParseError extends DeepSeekError {
  constructor(message: string, public readonly rawResponse?: string) {
    super(message);
    this.name = 'DeepSeekParseError';
  }
}

// ============================================================================
// 客户端
// ============================================================================

export class DeepSeekClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config?: Partial<typeof DEEPSEEK_CONFIG>) {
    this.apiKey = config?.apiKey || DEEPSEEK_CONFIG.apiKey;
    this.baseUrl = config?.baseUrl || DEEPSEEK_CONFIG.baseUrl;
    this.model = config?.model || DEEPSEEK_CONFIG.model;
    this.timeout = config?.timeout || DEEPSEEK_CONFIG.timeout;
    this.maxRetries = config?.maxRetries || DEEPSEEK_CONFIG.maxRetries;

    if (!this.apiKey) {
      throw new Error('DeepSeek API Key 未配置，请设置 DEEPSEEK_API_KEY 环境变量');
    }
  }

  /**
   * 生成数学题 Python 代码
   */
  async generateMathQuestion(
    prompt: string,
    parameters: GenerationParameters
  ): Promise<{
    result: DeepSeekGenerationResult;
    tokens_used: number;
    latency_ms: number;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.callWithRetry(prompt);
      const latency_ms = Date.now() - startTime;
      const result = this.parseResponse(response);
      return {
        result,
        tokens_used: response.usage?.total_tokens || 0,
        latency_ms,
      };
    } catch (error) {
      if (error instanceof DeepSeekError) {
        throw error;
      }
      throw new DeepSeekError(
        `DeepSeek API 调用失败: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error
      );
    }
  }

  /**
   * 带重试的调用
   */
  private async callWithRetry(
    prompt: string,
    retryCount = 0
  ): Promise<DeepSeekResponse> {
    try {
      return await this.callAPI(prompt);
    } catch (error) {
      const shouldRetry =
        retryCount < this.maxRetries &&
        (error instanceof DeepSeekTimeoutError ||
          (error instanceof DeepSeekError &&
            error.statusCode &&
            error.statusCode >= 500));

      if (shouldRetry) {
        const delayMs = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.callWithRetry(prompt, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * 调用 DeepSeek API
   */
  private async callAPI(prompt: string): Promise<DeepSeekResponse> {
    const request: DeepSeekRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${prompt}\n\n只返回 JSON 对象，不要使用 markdown 代码块。`,
        },
      ],
      temperature: 0.2,
      max_tokens: 2500,
      stream: false,
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new DeepSeekTimeoutError(this.timeout)), this.timeout);
    });

    const fetchPromise = fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new DeepSeekError(
        `DeepSeek API 返回错误: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    const data = (await response.json()) as DeepSeekResponse;
    return data;
  }

  /**
   * 解析 DeepSeek 响应
   */
  private parseResponse(response: DeepSeekResponse): DeepSeekGenerationResult {
    if (!response.choices || response.choices.length === 0) {
      throw new DeepSeekParseError('DeepSeek 响应中没有 choices');
    }

    const message = response.choices[0].message;
    if (!message || !message.content) {
      throw new DeepSeekParseError('DeepSeek 响应中没有 message content');
    }

    const content = message.content.trim();
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : content;

    if (!jsonMatch) {
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) jsonStr = objectMatch[0];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      throw new DeepSeekParseError(
        `JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`,
        content
      );
    }

    if (!parsed.question_text || typeof parsed.question_text !== 'string') {
      throw new DeepSeekParseError('缺少或无效的 question_text 字段', content);
    }
    if (!parsed.python_code || typeof parsed.python_code !== 'string') {
      throw new DeepSeekParseError('缺少或无效的 python_code 字段', content);
    }

    const coordinates = this.validateCoordinates(parsed.coordinates);

    return {
      question_text: parsed.question_text,
      python_code: parsed.python_code,
      coordinates,
    };
  }

  /**
   * 坐标数据验证
   */
  private validateCoordinates(raw: any): CoordinateData {
    if (!raw || typeof raw !== 'object') return {};
    const clean: CoordinateData = {};

    for (const [label, value] of Object.entries(raw)) {
      if (Array.isArray(value) && value.length === 2) {
        const [x, y] = value;
        if (Number.isFinite(x) && Number.isFinite(y)) {
          clean[label] = [Number(x), Number(y)];
        }
      }
    }

    return clean;
  }
}

// 单例导出
export const deepseekClient = new DeepSeekClient();

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 替换模板变量
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;

  // 先替换数组访问 {{key[0]}}
  result = result.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]\}\}/g, (match, key, index) => {
    const value = variables[key];
    if (Array.isArray(value)) {
      const idx = parseInt(index, 10);
      if (idx >= 0 && idx < value.length) {
        return String(value[idx]);
      }
    }
    return match;
  });

  // 再替换简单变量 {{key}}
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const replacement = typeof value === 'object' ? JSON.stringify(value) : String(value);
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
  }

  return result;
}

/**
 * 估算 DeepSeek 成本（美元）
 */
export function estimateDeepSeekCost(
  promptTokens: number,
  completionTokens: number
): number {
  const inputCost = (promptTokens / 1_000_000) * 0.14;
  const outputCost = (completionTokens / 1_000_000) * 0.28;
  return inputCost + outputCost;
}
