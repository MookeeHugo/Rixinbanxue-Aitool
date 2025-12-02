import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import sharp from 'sharp';
import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';

import type {
  GeminiImageRegion,
  GeminiParseResult,
  GeminiQuestion,
  GeminiValidationResult,
  NormalizedBox,
  QuestionData
} from './types';
import type { ImageMeta, PixelRect } from './coordinates';

const KNOWLEDGE_TAGS = [
  '有理数',
  '整式的加减',
  '一元一次方程',
  '几何图形初步',
  '相交线与平行线',
  '实数',
  '平面直角坐标系',
  '二元一次方程组',
  '不等式与不等式组',
  '三角形',
  '全等三角形',
  '轴对称',
  '勾股定理',
  '一次函数',
  '二次函数',
  '圆',
  '概率与统计'
] as const;

const GEMINI_PROMPT = `
You are a professional math content digitizer working on exam papers.
Each page contains a 20x20 red grid with axes labeled 0-100 (step 5). Use the grid lines as your ruler.
Read the entire math page image and output STRICT JSON in UTF-8.

Rules:
1. OCR all math expressions into LaTeX and wrap them with $...$.
2. For multiple-choice questions, every option must be in LaTeX form (e.g. $
rac{1}{2}$). Never leave math symbols as plain text.
3. Detect diagrams/figures precisely. Use normalized coordinates [ymin, xmin, ymax, xmax] in the 0-100 space (one decimal precision, example: [12.5, 30.0, 36.2, 55.1]). Provide generous rough boxes with at least 10% padding (err on the larger side; downstream CV will shrink them).
4. Always capture anchor_text_prev and anchor_text_next (10 UTF-8 chars immediately above/below the figure) for coordinate validation and later inclusion-rejection trimming.
5. JSON must match the provided schema exactly. Do not output Markdown fences or explanations.
`.trim();

const QUESTION_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  description: 'Structured math exam output',
  properties: {
    meta: {
      type: SchemaType.OBJECT,
      properties: {
        page_summary: { type: SchemaType.STRING, nullable: true },
        reasoning: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
      }
    },
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          number: { type: SchemaType.STRING },
          content: {
            type: SchemaType.STRING,
            description: '题干内容，所有数学表达式需转换成 LaTeX 并包裹在 $...$ 中'
          },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: '选择题选项，必须统一使用 $...$ 包裹的 LaTeX'
          },
          answer: { type: SchemaType.STRING, nullable: true },
          images: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                anchor_id: { type: SchemaType.STRING, nullable: true },
                box_2d: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.NUMBER },
                  description: '[ymin, xmin, ymax, xmax], normalized 0-100 with max one decimal'
                },
                label: { type: SchemaType.STRING, nullable: true },
                description: { type: SchemaType.STRING, nullable: true },
                position: { type: SchemaType.STRING, nullable: true }
              }
            }
          },
          meta: {
            type: SchemaType.OBJECT,
            properties: {
              difficulty: { type: SchemaType.INTEGER, description: '1-5 难度等级（1=简单，5=困难）' },
              type: {
                type: SchemaType.STRING
              },
              tags: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              }
            }
          }
        },
        required: ['number', 'content'] as string[]
      }
    }
  },
  required: ['questions'] as string[]
} as const;

const GEMINI_BASE_URL =
  (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(
    /\/$/,
    ''
  );
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT || 120000);
const GEMINI_TIMEOUT_BAD = Number(process.env.GEMINI_TIMEOUT_BAD || GEMINI_TIMEOUT_MS);
const MIN_PADDING_PX = 20;
const PADDING_RATIO = 0.02;
const ENABLE_BLACKBOX_LOGGING = process.env.ENABLE_BLACKBOX_LOGGING === 'true';
const IS_OFFICIAL_GEMINI_ENDPOINT = GEMINI_BASE_URL.includes(
  'generativelanguage.googleapis.com'
);
const FAILURE_LOG_ROOT = join(process.cwd(), 'logs', 'failures');
const NORMALIZED_SCALE = 100;
const ANCHOR_CONTEXT_CHARS = 10;

const NormalizedCoordinateSchema = z
  .number()
  .min(0)
  .max(NORMALIZED_SCALE)
  .superRefine((value, ctx) => {
    const scaled = Math.round(value * 10);
    if (Math.abs(value * 10 - scaled) > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '坐标最多一位小数'
      });
    }
  });

const NormalizedBoxSchema = z
  .tuple([
    NormalizedCoordinateSchema,
    NormalizedCoordinateSchema,
    NormalizedCoordinateSchema,
    NormalizedCoordinateSchema
  ])
  .superRefine((value, ctx) => {
    const [ymin, xmin, ymax, xmax] = value;
    if (ymax <= ymin || xmax <= xmin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'box_2d 必须满足 ymax>ymin 且 xmax>xmin'
      });
    }
  });

const GeminiImageRegionSchema = z.object({
  anchor_id: z.string().nullable().optional(),
  box_2d: NormalizedBoxSchema,
  rough_bbox: NormalizedBoxSchema.optional(),
  anchor_text_prev: z.string().max(40).nullable().optional(),
  anchor_text_next: z.string().max(40).nullable().optional(),
  label: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  position: z.enum(['right', 'bottom', 'left', 'inline']).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  source: z.enum(['llm', 'cv']).nullable().optional()
});

const GeminiQuestionSchema = z.object({
  number: z.string().optional().default(''),
  content: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().nullable().optional(),
  image_regions: z.array(GeminiImageRegionSchema).default([]),
  images: z.array(GeminiImageRegionSchema).optional(),
  meta: z
    .object({
      difficulty: z
        .union([z.enum(['easy', 'medium', 'hard']), z.number().min(0).max(5)])
        .optional(),
      tags: z.array(z.string()).optional(),
      type: z.enum(['choice', 'fill', 'essay', 'proof']).optional()
    })
    .optional()
});

const QuestionDataSchema = z.object({
  meta: z.object({
    page_summary: z.string().nullable().optional(),
    reasoning: z.array(z.string()).default([]),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    tags: z.array(z.string()).optional(),
    type: z.enum(['choice', 'fill', 'essay', 'proof']).optional()
  }).optional(),
  questions: z.array(GeminiQuestionSchema).min(0)
});

let cachedClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!cachedClient) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 未配置，无法调用 Gemini SDK');
    }
    cachedClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return cachedClient;
}

const clamp = (value: number, minValue: number, maxValue: number) =>
  Math.max(minValue, Math.min(maxValue, value));

function normalizedToPixelRect(box: NormalizedBox, meta: ImageMeta): PixelRect {
  if (!meta.width || !meta.height) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const [ymin, xmin, ymax, xmax] = box;
  const left = Math.round((xmin / NORMALIZED_SCALE) * meta.width);
  const top = Math.round((ymin / NORMALIZED_SCALE) * meta.height);
  const right = Math.round((xmax / NORMALIZED_SCALE) * meta.width);
  const bottom = Math.round((ymax / NORMALIZED_SCALE) * meta.height);

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

function pixelRectToNormalized(rect: PixelRect, meta: ImageMeta): NormalizedBox {
  const width = Math.max(meta.width, 1);
  const height = Math.max(meta.height, 1);
  const scaleX = NORMALIZED_SCALE / width;
  const scaleY = NORMALIZED_SCALE / height;
  const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

  const ymin = clamp(roundToOneDecimal(rect.top * scaleY), 0, NORMALIZED_SCALE);
  const xmin = clamp(roundToOneDecimal(rect.left * scaleX), 0, NORMALIZED_SCALE);
  const ymax = clamp(roundToOneDecimal((rect.top + rect.height) * scaleY), 0, NORMALIZED_SCALE);
  const xmax = clamp(roundToOneDecimal((rect.left + rect.width) * scaleX), 0, NORMALIZED_SCALE);

  return [ymin, xmin, ymax, xmax];
}

function applyPadding(rect: PixelRect, meta: ImageMeta): PixelRect {
  const paddingPx = Math.max(
    MIN_PADDING_PX,
    Math.round(Math.min(meta.width, meta.height) * PADDING_RATIO)
  );

  const left = clamp(rect.left - paddingPx, 0, meta.width);
  const top = clamp(rect.top - paddingPx, 0, meta.height);
  const right = clamp(rect.left + rect.width + paddingPx, 0, meta.width);
  const bottom = clamp(rect.top + rect.height + paddingPx, 0, meta.height);

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

async function normalizeImageBuffer(
  imageBuffer: Buffer,
  context?: { requestId?: string; fileName?: string }
) {
  const sharpInstance = sharp(imageBuffer);
  const metadata = await sharpInstance.metadata();

  let workingBuffer = imageBuffer;
  let workingMeta = {
    width: metadata.width || 0,
    height: metadata.height || 0
  };

  if (metadata.format !== 'png') {
    const converted = await sharpInstance.png().toBuffer();
    const convertedMeta = await sharp(converted).metadata();
    workingBuffer = converted;
    workingMeta = {
      width: convertedMeta.width || workingMeta.width,
      height: convertedMeta.height || workingMeta.height
    };
  }

  const enhanced = await enhanceImageBuffer(workingBuffer, workingMeta, context);

  return {
    buffer: enhanced.buffer,
    meta: {
      width: enhanced.meta.width || workingMeta.width,
      height: enhanced.meta.height || workingMeta.height
    }
  };
}

async function enhanceImageBuffer(
  buffer: Buffer,
  meta: ImageMeta,
  context?: { requestId?: string; fileName?: string }
) {
  const width = meta.width || 0;
  const height = meta.height || 0;
  const area = width * height;
  const shortestEdge = Math.min(width, height);
  const needsUpscale = shortestEdge > 0 && shortestEdge < 1400;
  const needsContrastBoost = area > 0 && area < 2_500_000;

  if (!needsUpscale && !needsContrastBoost) {
    return { buffer, meta };
  }

  try {
    let pipeline = sharp(buffer).normalize();
    if (needsContrastBoost) {
      pipeline = pipeline.gamma(1.05).modulate({ brightness: 1.05, saturation: 1 });
    }
    if (needsUpscale) {
      const upscaleRatio = Math.min(2, 1600 / Math.max(shortestEdge, 1));
      pipeline = pipeline.resize({
        width: Math.round(width * upscaleRatio),
        height: Math.round(height * upscaleRatio),
        fit: 'fill',
        kernel: sharp.kernel.lanczos3
      });
    }
    pipeline = pipeline.sharpen(1, 0.5, 0.5);
    const enhanced = await pipeline.toBuffer();
    const enhancedMetaRaw = await sharp(enhanced).metadata();
    return {
      buffer: enhanced,
      meta: {
        width: enhancedMetaRaw.width || Math.round(width),
        height: enhancedMetaRaw.height || Math.round(height)
      }
    };
  } catch (error) {
    console.warn('[Gemini解析] 图片预处理失败', {
      requestId: context?.requestId,
      fileName: context?.fileName,
      message: error instanceof Error ? error.message : String(error)
    });
    return { buffer, meta };
  }
}

function buildGeminiRequestPayload(base64: string, mimeType = 'image/png') {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: GEMINI_PROMPT
          },
          {
            inlineData: {
              mimeType,
              data: base64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: QUESTION_RESPONSE_SCHEMA
    }
  };
}

async function streamViaGoogleSdk(base64: string, controller: AbortController) {
  const model = getGeminiClient().getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: GEMINI_PROMPT
  });

  const requestPayload = buildGeminiRequestPayload(base64);
  const result = await model.generateContentStream(requestPayload, {
    signal: controller.signal
  });

  let rawText = '';
  for await (const chunk of result.stream) {
    const textChunk = chunk.text();
    if (textChunk) {
      rawText += textChunk;
    }
  }

  if (!rawText.trim()) {
    const response = await result.response;
    rawText = response.text() ?? '';
  }

  return rawText;
}

async function streamViaProxy(
  base64: string,
  controller: AbortController,
  requestId: string
) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY 未配置，无法调用 Gemini 接口');
  }

  const cleanBaseUrl = GEMINI_BASE_URL.replace(/\/+$/, '');
  const endpoint = `${cleanBaseUrl}/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${GEMINI_API_KEY}`
  };

  const payload = buildGeminiRequestPayload(base64);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: controller.signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini 响应异常 (${response.status}): ${errorText.slice(0, 400)}`
    );
  }

  if (!response.body) {
    throw new Error('Gemini 流式接口返回空 Body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const fragments: any[] = [];
  let buffer = '';
  let pendingPayload = '';
  let eventIndex = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        continue;
      }

      const payloadText = trimmed.slice(5).trim();
      if (!payloadText || payloadText === '[DONE]') {
        continue;
      }

      eventIndex += 1;
      const candidatePayload = pendingPayload
        ? `${pendingPayload}${payloadText}`
        : payloadText;

      try {
        const parsed = JSON.parse(candidatePayload);
        fragments.push(parsed);
        pendingPayload = '';
      } catch (error) {
        pendingPayload = candidatePayload;
        console.warn('[Gemini流式] 片段解析失败，等待下个 chunk', {
          requestId,
          chunkIndex: eventIndex,
          error: error instanceof Error ? error.message : String(error),
          payloadPreview: pendingPayload.slice(0, 200)
        });
      }
    }
  }

  buffer += decoder.decode();
  if (buffer.trim().startsWith('data:')) {
    const payloadText = buffer.trim().slice(5).trim();
    if (payloadText && payloadText !== '[DONE]') {
      const candidatePayload = pendingPayload
        ? `${pendingPayload}${payloadText}`
        : payloadText;
      try {
        const parsed = JSON.parse(candidatePayload);
        fragments.push(parsed);
        pendingPayload = '';
      } catch (error) {
        pendingPayload = candidatePayload;
        console.warn('[Gemini流式] 收到残缺片段，等待缓冲', {
          requestId,
          error: error instanceof Error ? error.message : String(error),
          payloadPreview: pendingPayload.slice(0, 200)
        });
      }
    }
  }

  if (pendingPayload) {
    console.error('[Gemini流式] 读取结束但仍有残留数据未解析', {
      requestId,
      pendingPreview: pendingPayload.slice(0, 200)
    });
    throw new Error('Gemini 流式响应残留数据无法解析');
  }

  const rawText = fragments
    .map((fragment, index) => {
      const chunkText =
        fragment?.candidates
          ?.flatMap((candidate: any) =>
            candidate?.content?.parts
              ?.map((part: any) => part?.text || '')
              .filter(Boolean) || []
          )
          .join('') || '';
      if (!chunkText.trim()) {
        console.warn('[Gemini流式] 收到空白 chunk', { requestId, chunkIndex: index + 1 });
      }
      return chunkText;
    })
    .join('');

  return rawText;
}
function decodeLatexText(value: string): string {
  return value.replace(/\\\\/g, '\\').replace(/\^\^/g, '^');
}

export function ensureLatexWrapped(option: string): string {
  const trimmed = option.trim();
  if (!trimmed) {
    console.warn('[Gemini解析] 检测到空选项，已丢弃');
    return '';
  }

  const fullyWrapped = trimmed.startsWith('$') && trimmed.endsWith('$');
  const containsLatexPair = /\$[^$]+\$/.test(trimmed);

  if (fullyWrapped || containsLatexPair) {
    if (!fullyWrapped && containsLatexPair && trimmed.includes('$')) {
      console.warn('[Gemini解析] 选项包含部分 LaTeX 包裹，保持原样', { option: trimmed });
    }
    return trimmed;
  }

  return `$${trimmed.replace(/^\$|\$$/g, '').trim()}$`;
}

/**
 * 从双引号、Markdown 等噪声中提取纯 JSON
 * 用于修复 Gemini 流式响应掺杂 Markdown/提示语导致的解析问题
 */
export function extractJsonFromStream(raw: string): string {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('Unable to find JSON start symbol "{" in Gemini response');
  }

  let balance = 0;
  let lastBrace = -1;
  let inString = false;
  let isEscaped = false;

  for (let i = firstBrace; i < cleaned.length; i += 1) {
    const char = cleaned[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        balance += 1;
      } else if (char === '}') {
        balance -= 1;
        if (balance === 0) {
          lastBrace = i;
          break;
        }
      }
    }
  }

  if (lastBrace === -1) {
    const fallbackBrace = cleaned.lastIndexOf('}');
    if (fallbackBrace <= firstBrace) {
      throw new Error('JSON braces are unbalanced; cannot extract payload');
    }
    return cleaned.slice(firstBrace, fallbackBrace + 1);
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function normalizeAnchorText(value: unknown, mode: 'prev' | 'next'): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const chars = Array.from(trimmed);
  if (!chars.length) {
    return undefined;
  }
  if (mode === 'prev') {
    return chars.slice(Math.max(0, chars.length - ANCHOR_CONTEXT_CHARS)).join('');
  }
  return chars.slice(0, ANCHOR_CONTEXT_CHARS).join('');
}

function sanitizeNormalizedBoxCandidate(candidate: unknown): NormalizedBox | null {
  if (!Array.isArray(candidate) || candidate.length < 4) {
    return null;
  }
  const sanitized = candidate.slice(0, 4).map(value => {
    const num = typeof value === 'number' ? value : Number(value);
    const safe = Number.isFinite(num) ? num : 0;
    const rounded = Math.round(safe * 10) / 10;
    return clamp(rounded, 0, NORMALIZED_SCALE);
  }) as NormalizedBox;

  if (sanitized[2] <= sanitized[0] || sanitized[3] <= sanitized[1]) {
    return null;
  }
  return sanitized;
}

function sanitizeImageRegionsForPayload(
  regions: unknown,
  context: { requestId: string; questionIndex: number }
) {
  if (!Array.isArray(regions)) {
    return [];
  }

  const sanitized: any[] = [];

  regions.forEach((region, index) => {
    if (!region || typeof region !== 'object') {
      console.warn('[Gemini解析] 跳过非法配图对象', {
        requestId: context.requestId,
        questionIndex: context.questionIndex,
        regionIndex: index + 1
      });
      return;
    }

    const normalizedBox = sanitizeNormalizedBoxCandidate((region as any).box_2d);
    if (!normalizedBox) {
      console.warn('[Gemini解析] box_2d 长度不足，已忽略该配图', {
        requestId: context.requestId,
        questionIndex: context.questionIndex,
        regionIndex: index + 1
      });
      return;
    }

    const roughBox =
      sanitizeNormalizedBoxCandidate((region as any).rough_bbox) ?? (normalizedBox as NormalizedBox);
    const anchorPrev = normalizeAnchorText((region as any).anchor_text_prev, 'prev');
    const anchorNext = normalizeAnchorText((region as any).anchor_text_next, 'next');

    sanitized.push({
      ...(region as Record<string, unknown>),
      box_2d: normalizedBox,
      rough_bbox: roughBox,
      anchor_text_prev: anchorPrev,
      anchor_text_next: anchorNext
    });
  });

  return sanitized;
}

function normalizeRawGeminiPayload(payload: unknown, requestId: string): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const clone: any = Array.isArray(payload)
    ? payload.map(entry => ({ ...(entry as Record<string, unknown>) }))
    : { ...(payload as Record<string, unknown>) };

  if (Array.isArray(clone.questions)) {
    clone.questions = clone.questions.map((question: any, index: number) => {
      if (!question || typeof question !== 'object') {
        return question;
      }
      return {
        ...question,
        image_regions: sanitizeImageRegionsForPayload(question.image_regions, {
          requestId,
          questionIndex: index + 1
        }),
        images: sanitizeImageRegionsForPayload(question.images, {
          requestId,
          questionIndex: index + 1
        })
      };
    });
  }

  return clone;
}


function sanitizeJsonPayload(payload: string): string {
  return payload.replace(/\\(?!["\\/bfnrtuU])/g, '\\\\');
}

function repairUnicodeEscapes(payload: string): string {
  return payload.replace(/\\[uU]([0-9a-fA-F]{0,4})/g, (_match, digits = '') => {
    if (digits.length === 4 && /^[0-9a-fA-F]{4}$/.test(digits)) {
      return `\\u${digits}`;
    }
    const normalized = digits.padEnd(4, '0').slice(0, 4);
    const cleaned = normalized.replace(/[^0-9a-fA-F]/g, '0');
    return `\\u${cleaned}`;
  });
}

function normalizeJsonEscapes(payload: string): string {
  let result = '';

  for (let i = 0; i < payload.length; i += 1) {
    const char = payload[i];
    if (char !== '\\') {
      result += char;
      continue;
    }

    const next = payload[i + 1];
    if (!next) {
      result += '\\\\';
      continue;
    }

    if (next === 'u' || next === 'U') {
      let hex = '';
      let offset = 2;
      while (hex.length < 4 && i + offset < payload.length) {
        const candidate = payload[i + offset];
        if (/^[0-9a-fA-F]$/.test(candidate)) {
          hex += candidate;
          offset += 1;
        } else {
          break;
        }
      }
      const normalizedHex = (hex + '0000').slice(0, 4);
      result += `\\u${normalizedHex.toLowerCase()}`;
      i += 1 + hex.length;
      continue;
    }

    if ('"\\/bfnrt'.includes(next)) {
      result += `\\${next}`;
      i += 1;
      continue;
    }

    result += `\\\\${next}`;
    i += 1;
  }

  return result;
}

function parseJsonWithRepair(payload: string): any {
  let lastError: unknown;
  try {
    return JSON.parse(payload);
  } catch (error) {
    lastError = error;
    if (
      error instanceof SyntaxError &&
      /bad escaped character|invalid unicode escape/i.test(error.message)
    ) {
      const repaired = repairUnicodeEscapes(payload);
      if (repaired !== payload) {
        try {
          return JSON.parse(repaired);
        } catch (secondError) {
          lastError = secondError;
          console.error('[Gemini解析] JSON 二次修复失败', {
            error: secondError instanceof Error ? secondError.message : String(secondError)
          });
        }
      }
    }
  }

  try {
    const repaired = jsonrepair(payload);
    return JSON.parse(repaired);
  } catch (repairError) {
    console.error('[Gemini解析] jsonrepair 仍失败', {
      error: repairError instanceof Error ? repairError.message : String(repairError)
    });
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('无法解析 Gemini JSON 响应');
}

function logJsonErrorContext(payload: string, requestId: string, error: unknown) {
  if (!(error instanceof SyntaxError)) {
    return;
  }
  const match = /position (\d+)/i.exec(error.message ?? '');
  if (!match) {
    return;
  }
  const pos = Number(match[1]);
  if (Number.isNaN(pos)) {
    return;
  }
  const start = Math.max(0, pos - 100);
  const end = Math.min(payload.length, pos + 100);
  console.error('[Gemini解析] JSON 错误上下文', {
    requestId,
    position: pos,
    snippet: payload.slice(start, end)
  });
}

function writeDebugFile(requestId: string, content: string) {
  try {
    const dir = join(process.cwd(), 'tmp', 'gemini-debug');
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, `${requestId}.txt`);
    writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    console.warn('[Gemini解析] 写入调试文件失败', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function saveFailureLog(
  requestId: string,
  imageBuffer: Buffer,
  rawAIResponse: string,
  error: Error
): Promise<void> {
  if (!ENABLE_BLACKBOX_LOGGING) {
    return;
  }

  try {
    const dateKey = new Date().toISOString().slice(0, 10);
    const logDir = join(FAILURE_LOG_ROOT, dateKey, requestId);
    await mkdir(logDir, { recursive: true });

    const errorMessage = [
      `message: ${error.message}`,
      `name: ${error.name}`,
      `stack:\n${error.stack ?? 'N/A'}`
    ].join('\n\n');

    await Promise.all([
      writeFile(join(logDir, 'source_image.jpg'), imageBuffer),
      writeFile(join(logDir, 'raw_response.txt'), rawAIResponse ?? '', 'utf8'),
      writeFile(join(logDir, 'error.log'), errorMessage, 'utf8')
    ]);
  } catch (logError) {
    console.warn('[Gemini黑匣子] 保存失败日志异常', {
      requestId,
      error: logError instanceof Error ? logError.message : String(logError)
    });
  }
}

async function cropRegionToDataUrl(
  imageBuffer: Buffer,
  rect: PixelRect
): Promise<{
  dataUrl: string;
  trimmedRect: ImageMeta;
  trimOffset: { left?: number; top?: number };
}> {
  const { data, info } = await sharp(imageBuffer)
    .extract({
      left: rect.left,
      top: rect.top,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    })
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });

  const base64 = data.toString('base64');
  return {
    dataUrl: `data:image/png;base64,${base64}`,
    trimmedRect: {
      width: info.width,
      height: info.height
    },
    trimOffset: {
      left: info.trimOffsetLeft,
      top: info.trimOffsetTop
    }
  };
}

function inferQuestionType(
  question: Pick<GeminiQuestion, 'content' | 'options'>
): GeminiQuestion['meta']['type'] {
  if (question.options && question.options.length >= 4) {
    return 'choice';
  }
  if (question.content.includes('填空') || question.content.includes('______')) {
    return 'fill';
  }
  return 'essay';
}

function normalizeQuestionData(parsed: z.infer<typeof QuestionDataSchema>): QuestionData {
  const rawMeta = parsed.meta;

  return {
    meta: {
      page_summary: decodeLatexText(rawMeta?.page_summary ?? ''),
      reasoning: rawMeta?.reasoning ?? [],
      difficulty: rawMeta?.difficulty,
      tags: rawMeta?.tags ?? [],
      type: rawMeta?.type
    },
    questions: parsed.questions.map((question, index) => {
      const options =
        question.options
          ?.map(option => ensureLatexWrapped(decodeLatexText(option)))
          .filter((value): value is string => Boolean(value)) ?? [];
      const rawNumber = (question.number ?? '').trim();
      const fallbackNumber = rawNumber || `Q${index + 1}`;
      if (!rawNumber) {
        console.warn('[Gemini解析] 题号为空，已回退为占位编号', {
          questionIndex: index + 1,
          fallbackNumber
        });
      }
      const difficultyValue = (() => {
        const raw = question.meta?.difficulty;
        if (typeof raw === 'number') {
          if (raw <= 2) return 'easy';
          if (raw >= 4) return 'hard';
          return 'medium';
        }
        if (raw === 'easy' || raw === 'medium' || raw === 'hard') {
          return raw;
        }
        return 'medium';
      })();
      const tags = question.meta?.tags ?? [];
      const type =
        question.meta?.type ??
        inferQuestionType({
          content: question.content,
          options
        });

      return {
        number: fallbackNumber,
        content: decodeLatexText(question.content.trim()),
        answer: decodeLatexText(question.answer?.trim() ?? ''),
        options,
        image_regions: [], // 将在 enrichImageRegions 中填充完整的 GeminiImageRegion
        images: [], // 将在 enrichImageRegions 中填充完整的 GeminiImageRegion
        meta: {
          difficulty: difficultyValue,
          tags,
          type
        }
      };
    })
  };
}

async function enrichImageRegions(
  question: GeminiQuestion,
  sourceBuffer: Buffer,
  meta: ImageMeta,
  requestId: string
): Promise<GeminiImageRegion[]> {
  if (!meta.width || !meta.height) {
    console.warn('[Gemini解析] 缺少图片尺寸，无法裁剪配图', { requestId });
    return question.image_regions ?? [];
  }

  const rawRegions = question.image_regions?.length
    ? question.image_regions
    : question.images ?? [];

  if (!rawRegions.length) {
    return [];
  }

  const enriched: GeminiImageRegion[] = [];

  for (let index = 0; index < rawRegions.length; index += 1) {
    const region = rawRegions[index];
    try {
      const anchorId = region.anchor_id || `q${question.number}-img${index + 1}`;
      const anchorPrev = normalizeAnchorText(region.anchor_text_prev, 'prev');
      const anchorNext = normalizeAnchorText(region.anchor_text_next, 'next');
      const roughBox = region.rough_bbox ?? region.box_2d;
      const pixelRect = normalizedToPixelRect(region.box_2d, meta);
      const paddedRect = applyPadding(pixelRect, meta);
      const paddedBox2d = pixelRectToNormalized(paddedRect, meta);
      const paddingPx = Math.max(
        MIN_PADDING_PX,
        Math.round(Math.min(meta.width, meta.height) * PADDING_RATIO)
      );

      let dataUrl: string | undefined;
      let trimmedRect: ImageMeta | undefined;
      let trimOffset: { left?: number; top?: number } | undefined;

      if (paddedRect.width > 0 && paddedRect.height > 0) {
        try {
          const cropped = await cropRegionToDataUrl(sourceBuffer, paddedRect);
          dataUrl = cropped.dataUrl;
          trimmedRect = {
            width: cropped.trimmedRect.width,
            height: cropped.trimmedRect.height
          };
          trimOffset = cropped.trimOffset;
        } catch (cropError) {
          console.warn('[Gemini解析] 裁剪配图失败', {
            requestId,
            anchorId,
            error: cropError instanceof Error ? cropError.message : String(cropError)
          });
        }
      }

      enriched.push({
        anchor_id: anchorId,
        box_2d: region.box_2d,
        rough_bbox: roughBox,
        padded_box_2d: paddedBox2d,
        label: region.label,
        description: region.description,
        position: region.position,
        anchor_text_prev: anchorPrev,
        anchor_text_next: anchorNext,
        confidence: region.confidence,
        source: region.source ?? 'llm',
        base64: dataUrl,
        mime_type: 'image/png',
        padding: {
          px: paddingPx,
          ratio: PADDING_RATIO
        },
        rough_padding: region.rough_padding ?? {
          px: paddingPx,
          ratio: PADDING_RATIO
        },
        pixel_rect: {
          x: pixelRect.left,
          y: pixelRect.top,
          width: pixelRect.width,
          height: pixelRect.height
        },
        padded_pixel_rect: {
          x: paddedRect.left,
          y: paddedRect.top,
          width: paddedRect.width,
          height: paddedRect.height
        },
        trimmed_rect: trimmedRect
          ? {
              x: paddedRect.left + (trimOffset?.left ?? 0),
              y: paddedRect.top + (trimOffset?.top ?? 0),
              width: trimmedRect.width,
              height: trimmedRect.height
            }
          : undefined
      });
    } catch (error) {
      console.warn('[Gemini解析] 配图区域处理失败', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        region
      });
    }
  }

  return enriched;
}

function validateParseResult(data: QuestionData): GeminiValidationResult {
  const reasons: string[] = [];
  const hasQuestions = data.questions.length > 0;
  let hasImageRegions = false;
  let hasValidCoordinates = true;
  let hasValidSequence = true;

  if (!hasQuestions) {
    reasons.push('未识别到题目');
  } else {
    hasValidSequence = true;
    hasImageRegions = data.questions.some(q => q.image_regions?.length);
    if (!hasImageRegions) {
      reasons.push('缺少配图标注');
    }

    hasValidCoordinates = data.questions.every(question =>
      (question.image_regions || []).every(region => {
        if (!region.box_2d || region.box_2d.length !== 4) {
          return false;
        }
        return region.box_2d.every(value => Number.isFinite(value) && value >= 0 && value <= 100);
      })
    );

    if (!hasValidCoordinates) {
      reasons.push('存在非法坐标或越界的 box_2d');
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
    hasQuestions,
    hasImageRegions,
    hasValidCoordinates,
    hasValidSequence
  };
}

function resolveTimeoutHint(meta?: { fileName?: string }) {
  const current = process.env.CURRENT_REGRESSION_FILE || meta?.fileName || '';
  if (current.includes('BAD-04-folded-paper')) {
    return GEMINI_TIMEOUT_BAD;
  }
  return GEMINI_TIMEOUT_MS;
}

async function processImageStream(
  imageBuffer: Buffer,
  requestContext: { requestId: string; source: 'url' | 'buffer'; fileName?: string }
): Promise<GeminiParseResult> {
  let rawText = '';

  try {
    const { buffer: normalizedBuffer, meta } = await normalizeImageBuffer(imageBuffer, requestContext);
    if (!meta.width || !meta.height) {
      throw new Error('无法获取图片尺寸，无法调用 Gemini Vision');
    }

    const controller = new AbortController();
    const timeoutMs = resolveTimeoutHint({ fileName: requestContext.fileName });
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    const base64 = normalizedBuffer.toString('base64');

    try {
      rawText = IS_OFFICIAL_GEMINI_ENDPOINT
        ? await streamViaGoogleSdk(base64, controller)
        : await streamViaProxy(base64, controller, requestContext.requestId);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Gemini 请求超时（${timeoutMs}ms）`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!rawText.trim()) {
      throw new Error('Gemini 返回空响应，无法解析');
    }

    let questionData: QuestionData;

    try {
      const rawJson = extractJsonFromStream(rawText);
      const sanitized = sanitizeJsonPayload(rawJson);
      const normalizedEscapes = normalizeJsonEscapes(sanitized);
      const repaired = repairUnicodeEscapes(normalizedEscapes);
      const parsed = parseJsonWithRepair(repaired);
      const normalizedPayload = normalizeRawGeminiPayload(parsed, requestContext.requestId);
      const validation = QuestionDataSchema.safeParse(normalizedPayload);

      if (!validation.success) {
        throw validation.error;
      }

      questionData = normalizeQuestionData(validation.data);
    } catch (error) {
      logJsonErrorContext(rawText, requestContext.requestId, error);
      writeDebugFile(requestContext.requestId, rawText);
      console.error('[Gemini流式] JSON 解析失败', {
        requestId: requestContext.requestId,
        preview: rawText.substring(0, 500)
      });
      throw new Error(
        `Gemini 返回内容无法通过 schema 校验: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const questionsWithImages: GeminiQuestion[] = [];
    for (const question of questionData.questions) {
      const images = await enrichImageRegions(question, normalizedBuffer, meta, requestContext.requestId);
      questionsWithImages.push({
        ...question,
        images,
        image_regions: images
      });
    }

    const normalizedResult: QuestionData = {
      meta: questionData.meta,
      questions: questionsWithImages
    };

    const validation = validateParseResult(normalizedResult);

    return {
      meta: normalizedResult.meta,
      questions: normalizedResult.questions,
      model: GEMINI_MODEL,
      requestId: requestContext.requestId,
      retried: false,
      processingTime: 0,
      validation,
      rawText
    };
  } catch (error) {
    const failureError =
      error instanceof Error ? error : new Error(typeof error === 'string' ? error : '未知错误');
    await saveFailureLog(requestContext.requestId, imageBuffer, rawText, failureError);
    throw failureError;
  }
}

export async function parseQuestionWithCascading(imageUrl: string): Promise<GeminiParseResult> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`下载试卷图片失败: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const requestId = randomUUID();
  const start = Date.now();
  const result = await processImageStream(buffer, { requestId, source: 'url', fileName: imageUrl });
  return {
    ...result,
    processingTime: Date.now() - start
  };
}

export async function parseQuestionWithCascadingFromBuffer(
  imageBuffer: Buffer
): Promise<GeminiParseResult> {
  const requestId = randomUUID();
  const start = Date.now();
  const result = await processImageStream(imageBuffer, { requestId, source: 'buffer' });
  return {
    ...result,
    processingTime: Date.now() - start
  };
}
