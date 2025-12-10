/**
 * Gemini爆款分析器
 *
 * 使用Gemini 2.5 Flash分析小红书帖子为什么会爆款
 */

import { jsonrepair } from 'jsonrepair';
import { ViralAnalysis, AIMetadata } from './types';

// ============================================================================
// Gemini配置
// ============================================================================

const GEMINI_CONFIG = {
  apiKey: process.env.GEMINI_API_KEY || '',
  baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
  timeout: parseInt(process.env.GEMINI_REQUEST_TIMEOUT || '120000', 10),
} as const;

// ============================================================================
// Gemini分析器类
// ============================================================================

export class GeminiAnalyzer {
  private readonly MAX_RETRIES = 3;
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor() {
    this.apiKey = GEMINI_CONFIG.apiKey;
    this.baseUrl = GEMINI_CONFIG.baseUrl;
    this.model = GEMINI_CONFIG.model;
    this.timeout = GEMINI_CONFIG.timeout;

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY 环境变量未设置');
    }
  }

  /**
   * 分析帖子为什么会爆款
   */
  async analyzeViralPost(post: {
    title: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    tags: string[];
  }): Promise<{ analysis: ViralAnalysis; metadata: AIMetadata }> {
    const startTime = Date.now();

    // Codex建议：重试机制（3次）
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[GeminiAnalyzer] 尝试分析 (${attempt + 1}/${this.MAX_RETRIES})`);

        // 构建prompt
        const prompt = this._buildAnalysisPrompt(post);

        // 调用Gemini API
        const response = await this._callGeminiAPI(prompt);

        // 解析JSON
        const analysis = this._parseAnalysisResult(response.text);

        // 计算成本（Gemini 2.5 Flash: $0.075/1M input, $0.30/1M output）
        const inputTokens = response.usage.prompt_tokens || 0;
        const outputTokens = response.usage.completion_tokens || 0;
        const costUsd =
          (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.3;

        const metadata: AIMetadata = {
          model: this.model,
          tokens_used: inputTokens + outputTokens,
          cost_usd: parseFloat(costUsd.toFixed(6)),
          generation_time_ms: Date.now() - startTime,
        };

        console.log(
          `[GeminiAnalyzer] 分析完成，耗时 ${metadata.generation_time_ms}ms，成本 $${metadata.cost_usd}`
        );
        console.log(`[GeminiAnalyzer] Token使用: input=${inputTokens}, output=${outputTokens}`);

        return { analysis, metadata };
      } catch (error: any) {
        console.error(`[GeminiAnalyzer] 尝试 ${attempt + 1} 失败:`, error.message);

        // 最后一次尝试
        if (attempt === this.MAX_RETRIES - 1) {
          throw new Error(`Gemini分析失败: ${error.message}`);
        }

        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw new Error('Gemini分析失败：所有重试均失败');
  }

  /**
   * 调用Gemini API
   */
  private async _callGeminiAPI(prompt: string): Promise<{
    text: string;
    usage: { prompt_tokens: number; completion_tokens: number };
  }> {
    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    // 构建URL（支持自定义baseURL）
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    // 超时处理
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Gemini请求超时（${this.timeout}ms）`)),
        this.timeout
      );
    });

    const fetchPromise = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Gemini API返回错误: ${response.status} ${response.statusText}\n${errorBody}`
      );
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini响应中没有candidates');
    }

    const candidate = data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Gemini响应中没有content parts');
    }

    const text = candidate.content.parts[0].text;

    // 估算token使用（Gemini API返回格式可能不同）
    const promptTokens = data.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
    const completionTokens = data.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

    return {
      text,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      },
    };
  }

  /**
   * 构建分析prompt
   */
  private _buildAnalysisPrompt(post: {
    title: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    tags: string[];
  }): string {
    return `
你是一位专业的小红书内容分析师，擅长分析爆款帖子的成功因素。

请分析以下小红书帖子为什么会爆款（获得了 ${post.likes} 个点赞、${post.comments} 条评论、${post.shares} 次分享）：

**标题：** ${post.title}

**正文：**
${post.content}

**标签：** ${post.tags.join(', ')}

---

请从以下维度分析这个帖子的成功因素，并以JSON格式输出：

{
  "title_strategy": "标题策略（如何吸引点击）",
  "content_structure": "内容结构（如何组织内容）",
  "engagement_drivers": ["互动驱动因素1", "互动驱动因素2", "..."],
  "target_audience": "目标受众分析",
  "emotional_appeal": "情感诉求分析",
  "call_to_action": "行动号召分析"
}

**要求：**
1. 输出必须是有效的UTF-8编码JSON
2. 每个字段都要详细分析，不少于50字
3. engagement_drivers至少列出3个因素
4. 分析要具体、实用，能够指导内容创作
5. 不要输出Markdown代码块标记，直接输出JSON

请开始分析：
`.trim();
  }

  /**
   * 解析分析结果
   */
  private _parseAnalysisResult(text: string): ViralAnalysis {
    try {
      // 清理文本（移除Markdown代码块标记）
      let cleaned = text.trim();
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
        console.warn('[GeminiAnalyzer] JSON解析失败，尝试修复...');
        const repaired = jsonrepair(cleaned);
        parsed = JSON.parse(repaired);
      }

      // Codex建议：JSON验证
      if (
        !parsed.title_strategy ||
        !parsed.content_structure ||
        !Array.isArray(parsed.engagement_drivers) ||
        !parsed.target_audience ||
        !parsed.emotional_appeal ||
        !parsed.call_to_action
      ) {
        throw new Error('JSON结构不完整');
      }

      return parsed as ViralAnalysis;
    } catch (error) {
      console.error('[GeminiAnalyzer] 解析分析结果失败:', error);
      console.error('[GeminiAnalyzer] 原始响应:', text);
      throw new Error(`解析分析结果失败: ${error}`);
    }
  }
}
