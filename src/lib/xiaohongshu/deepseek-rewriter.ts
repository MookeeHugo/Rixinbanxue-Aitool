/**
 * DeepSeek内容重写器
 *
 * 使用DeepSeek根据用户人设重写小红书内容
 */

import { jsonrepair } from 'jsonrepair';
import { UserPersona, GeneratedDraft, AIMetadata, ViralAnalysis } from './types';

// ============================================================================
// DeepSeek配置
// ============================================================================

const DEEPSEEK_CONFIG = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  timeout: 30000,
  maxRetries: 3,
} as const;

// ============================================================================
// 错误类
// ============================================================================

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'DeepSeekError';
  }
}

// ============================================================================
// DeepSeek重写器类
// ============================================================================

export class DeepSeekRewriter {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeout: number;
  private maxRetries: number;

  constructor() {
    this.apiKey = DEEPSEEK_CONFIG.apiKey;
    this.baseUrl = DEEPSEEK_CONFIG.baseUrl;
    this.model = DEEPSEEK_CONFIG.model;
    this.timeout = DEEPSEEK_CONFIG.timeout;
    this.maxRetries = DEEPSEEK_CONFIG.maxRetries;

    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY 环境变量未设置');
    }
  }

  /**
   * 根据用户人设重写内容
   */
  async rewriteContent(
    originalPost: {
      title: string;
      content: string;
      tags: string[];
    },
    viralAnalysis: ViralAnalysis,
    userPersona: UserPersona
  ): Promise<{ draft: GeneratedDraft; metadata: AIMetadata }> {
    const startTime = Date.now();

    // Codex建议：重试机制（3次）
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`[DeepSeekRewriter] 尝试生成 (${attempt + 1}/${this.maxRetries})`);

        // 构建prompt
        const prompt = this._buildRewritePrompt(originalPost, viralAnalysis, userPersona);

        // 调用DeepSeek
        const response = await this._callAPI(prompt);

        // 解析响应
        const draft = this._parseDraft(response.content);

        // 计算成本（DeepSeek: $0.14/1M input, $0.28/1M output）
        const inputTokens = response.usage.prompt_tokens;
        const outputTokens = response.usage.completion_tokens;
        const costUsd =
          (inputTokens / 1_000_000) * 0.14 + (outputTokens / 1_000_000) * 0.28;

        const metadata: AIMetadata = {
          model: this.model,
          tokens_used: inputTokens + outputTokens,
          cost_usd: parseFloat(costUsd.toFixed(6)),
          generation_time_ms: Date.now() - startTime,
        };

        console.log(
          `[DeepSeekRewriter] 生成完成，耗时 ${metadata.generation_time_ms}ms，成本 $${metadata.cost_usd}`
        );
        console.log(`[DeepSeekRewriter] Token使用: input=${inputTokens}, output=${outputTokens}`);

        return { draft, metadata };
      } catch (error: any) {
        console.error(`[DeepSeekRewriter] 尝试 ${attempt + 1} 失败:`, error.message);

        // 最后一次尝试
        if (attempt === this.maxRetries - 1) {
          throw new DeepSeekError(`DeepSeek生成失败: ${error.message}`);
        }

        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw new DeepSeekError('DeepSeek生成失败：所有重试均失败');
  }

  /**
   * 构建重写prompt
   */
  private _buildRewritePrompt(
    originalPost: {
      title: string;
      content: string;
      tags: string[];
    },
    viralAnalysis: ViralAnalysis,
    userPersona: UserPersona
  ): string {
    return `
你是一位专业的小红书内容创作者，需要根据用户的身份人设，参考爆款帖子重写一篇新的小红书内容。

**用户身份人设：**
- 姓名：${userPersona.name}
- 描述：${userPersona.description}
- 专业领域：${userPersona.expertise}
- 从业年限：${userPersona.years_experience}年
- 教学风格：${userPersona.teaching_style}
- 语气：${userPersona.tone}

**原始爆款帖子：**
标题：${originalPost.title}
正文：${originalPost.content}
标签：${originalPost.tags.join(', ')}

**爆款因素分析：**
- 标题策略：${viralAnalysis.title_strategy}
- 内容结构：${viralAnalysis.content_structure}
- 互动驱动：${viralAnalysis.engagement_drivers.join(', ')}
- 目标受众：${viralAnalysis.target_audience}
- 情感诉求：${viralAnalysis.emotional_appeal}
- 行动号召：${viralAnalysis.call_to_action}

---

**任务要求：**
1. 根据用户的身份人设，以第一人称重写这篇内容
2. 保留原帖的爆款因素（标题策略、内容结构、互动驱动等）
3. 内容要符合用户的专业领域和教学风格
4. 语气要符合用户的人设特点
5. 内容要有足够的创意和原创性，避免简单复制
6. 标题要吸引人，但不要过于夸张
7. 标签要与内容相关，3-5个即可

**输出格式：**
请以JSON格式输出，不要使用Markdown代码块标记：

{
  "title": "重写的标题",
  "content": "重写的正文内容",
  "tags": ["标签1", "标签2", "标签3"]
}

请开始重写：
`.trim();
  }

  /**
   * 调用DeepSeek API
   */
  private async _callAPI(prompt: string): Promise<{
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number };
  }> {
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            '你是一位专业的小红书内容创作者。只输出有效的JSON格式，不要使用Markdown代码块标记。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8, // Codex建议：较高温度提升创意
      max_tokens: 2000,
      stream: false,
    };

    // 超时处理
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new DeepSeekError(`请求超时（${this.timeout}ms）`)),
        this.timeout
      );
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
        `DeepSeek API返回错误: ${response.status} ${response.statusText}\n${errorBody}`,
        response.status
      );
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new DeepSeekError('DeepSeek响应中没有choices');
    }

    const message = data.choices[0].message;
    if (!message || !message.content) {
      throw new DeepSeekError('DeepSeek响应中没有message content');
    }

    return {
      content: message.content,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * 解析生成的草稿
   */
  private _parseDraft(content: string): GeneratedDraft {
    try {
      // 清理文本（移除Markdown代码块标记）
      let cleaned = content.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      // Codex建议：使用jsonrepair处理格式问题
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        console.warn('[DeepSeekRewriter] JSON解析失败，尝试修复...');
        const repaired = jsonrepair(cleaned);
        parsed = JSON.parse(repaired);
      }

      // 验证字段
      if (!parsed.title || typeof parsed.title !== 'string') {
        throw new Error('缺少或无效的 title 字段');
      }
      if (!parsed.content || typeof parsed.content !== 'string') {
        throw new Error('缺少或无效的 content 字段');
      }
      if (!Array.isArray(parsed.tags)) {
        throw new Error('缺少或无效的 tags 字段');
      }

      return {
        title: parsed.title,
        content: parsed.content,
        tags: parsed.tags,
      };
    } catch (error) {
      console.error('[DeepSeekRewriter] 解析草稿失败:', error);
      console.error('[DeepSeekRewriter] 原始响应:', content);
      throw new DeepSeekError(`解析草稿失败: ${error}`);
    }
  }
}
