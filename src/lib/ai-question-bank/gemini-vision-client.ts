import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import sharp from 'sharp';
import { z } from 'zod';

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
Read the entire math page image and output STRICT JSON in UTF-8.

Rules:
1. OCR all math expressions into LaTeX and wrap them with $...$.
2. For multiple-choice questions, every option must be in LaTeX form (e.g. $
rac{1}{2}$). Never leave math symbols as plain text.
3. Detect diagrams/figures precisely. Use normalized coordinates [ymin, xmin, ymax, xmax] in the 0-1000 space where (0,0) is top-left and (1000,1000) is bottom-right.
4. JSON must match the provided schema exactly. Do not output Markdown fences or explanations.
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
            description: '???LaTeX ????????????'
          },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: '?????????? LaTeX ?? $ ??'
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
                  items: { type: SchemaType.INTEGER },
                  description: '[ymin, xmin, ymax, xmax], 0-1000 integers'
                },
                label: { type: SchemaType.STRING, nullable: true },
                description: { type: SchemaType.STRING, nullable: true },
                position: {
                  type: SchemaType.STRING,
                  enum: ['left', 'right', 'bottom', 'inline'],
                  nullable: true
                }
              }
            }
          },
          meta: {
            type: SchemaType.OBJECT,
            properties: {
              difficulty: { type: SchemaType.INTEGER, description: '1-5 ????' },
              type: {
                type: SchemaType.STRING,
                enum: ['choice', 'fill', 'essay', 'proof']
              },
              tags: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING, enum: Array.from(KNOWLEDGE_TAGS) }
              }
            }
          }
        },
        required: ['number', 'content']
      }
    }
  },
  required: ['questions']
} as const;

const GEMINI_BASE_URL =
  (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(
    /\/$/,
    ''
  );
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT || 120000);
const MIN_PADDING_PX = 20;
const PADDING_RATIO = 0.02;
const IS_OFFICIAL_GEMINI_ENDPOINT = GEMINI_BASE_URL.includes(
  'generativelanguage.googleapis.com'
);

const NormalizedBoxSchema = z
  .tuple([
    z.number().min(0).max(1000),
    z.number().min(0).max(1000),
    z.number().min(0).max(1000),
    z.number().min(0).max(1000)
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
  label: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  position: z.enum(['right', 'bottom', 'left', 'inline']).nullable().optional()
});

const GeminiQuestionSchema = z.object({
  number: z.string().min(1),
  content: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().nullable().optional(),
  image_regions: z.array(GeminiImageRegionSchema).default([]),
  images: z.array(GeminiImageRegionSchema).optional(),
  meta: z
    .object({
      difficulty: z.union([z.enum(['easy', 'medium', 'hard']), z.number().min(1).max(5)]).optional(),
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
  }),
  questions: z.array(GeminiQuestionSchema).min(1)
});

let cachedClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!cachedClient) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 未配置，无法调用 Gemini SDK');
    }
    cachedClient = new GoogleGenerativeAI({
      apiKey: GEMINI_API_KEY,
      baseUrl: GEMINI_BASE_URL
    });
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
  const left = Math.round((xmin / 1000) * meta.width);
  const top = Math.round((ymin / 1000) * meta.height);
  const right = Math.round((xmax / 1000) * meta.width);
  const bottom = Math.round((ymax / 1000) * meta.height);

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
  const scaleX = 1000 / width;
  const scaleY = 1000 / height;

  const ymin = Math.round(clamp(rect.top * scaleY, 0, 1000));
  const xmin = Math.round(clamp(rect.left * scaleX, 0, 1000));
  const ymax = Math.round(clamp((rect.top + rect.height) * scaleY, 0, 1000));
  const xmax = Math.round(clamp((rect.left + rect.width) * scaleX, 0, 1000));

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

async function normalizeImageBuffer(imageBuffer: Buffer) {
  const sharpInstance = sharp(imageBuffer);
  const metadata = await sharpInstance.metadata();

  if (metadata.format === 'png') {
    return { buffer: imageBuffer, meta: { width: metadata.width!, height: metadata.height! } };
  }

  const converted = await sharpInstance.png().toBuffer();
  const convertedMeta = await sharp(converted).metadata();

  return {
    buffer: converted,
    meta: {
      width: convertedMeta.width || metadata.width || 0,
      height: convertedMeta.height || metadata.height || 0
    }
  };
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
    systemInstruction: { parts: [{ text: GEMINI_PROMPT }] }
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
    throw new Error('GEMINI_API_KEY ???????? Gemini ??');
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
      `Gemini?????? (${response.status}): ${errorText.slice(0, 400)}`
    );
  }

  if (!response.body) {
    throw new Error('Gemini???????');
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
        console.warn('[Gemini??] ????????', {
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
        console.warn('[Gemini??] ?????????', {
          requestId,
          error: error instanceof Error ? error.message : String(error),
          payloadPreview: pendingPayload.slice(0, 200)
        });
      }
    }
  }

  if (pendingPayload) {
    console.error('[Gemini??] ?????????????', {
      requestId,
      pendingPreview: pendingPayload.slice(0, 200)
    });
    throw new Error('Gemini ?????????????');
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
        console.warn('[Gemini??] ???????', { requestId, chunkIndex: index + 1 });
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
    throw new Error('选项内容为空，无法转换为 LaTeX');
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

export function extractJsonFromStream(raw: string): string {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonBlockRegex = /\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}/gs;
  const matches = cleaned.match(jsonBlockRegex);

  if (matches && matches.length > 0) {
    return matches[matches.length - 1];
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('未能在 Gemini 响应中定位 JSON');
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
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
  try {
    return JSON.parse(payload);
  } catch (error) {
    if (
      error instanceof SyntaxError &&
      /bad escaped character|invalid unicode escape/i.test(error.message)
    ) {
      const repaired = repairUnicodeEscapes(payload);
      if (repaired !== payload) {
        try {
          return JSON.parse(repaired);
        } catch (secondError) {
          console.error('[Gemini解析] JSON 二次修复失败', {
            error: secondError instanceof Error ? secondError.message : String(secondError)
          });
        }
      }
    }
    throw error;
  }
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
  return {
    meta: {
      page_summary: decodeLatexText(parsed.meta.page_summary ?? ''),
      reasoning: parsed.meta.reasoning ?? [],
      difficulty: parsed.meta.difficulty,
      tags: parsed.meta.tags ?? [],
      type: parsed.meta.type
    },
    questions: parsed.questions.map(question => {
      const options =
        question.options?.map(option => ensureLatexWrapped(decodeLatexText(option))) ?? [];
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
        number: question.number.trim(),
        content: decodeLatexText(question.content.trim()),
        answer: decodeLatexText(question.answer?.trim() ?? ''),
        options,
        image_regions: question.image_regions ?? [],
        images: question.images ?? [],
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
        padded_box_2d: paddedBox2d,
        label: region.label,
        description: region.description,
        position: region.position,
        base64: dataUrl,
        mime_type: 'image/png',
        padding: {
          px: paddingPx,
          ratio: PADDING_RATIO
        },
        pixel_rect: pixelRect,
        padded_pixel_rect: paddedRect,
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
        return region.box_2d.every(value => Number.isFinite(value) && value >= 0 && value <= 1000);
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

async function runGeminiPipeline(
  imageBuffer: Buffer,
  requestContext: { requestId: string; source: 'url' | 'buffer' }
): Promise<GeminiParseResult> {
  const { buffer: normalizedBuffer, meta } = await normalizeImageBuffer(imageBuffer);
  if (!meta.width || !meta.height) {
    throw new Error('无法获取图片尺寸，无法调用 Gemini Vision');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, GEMINI_TIMEOUT_MS);

  const base64 = normalizedBuffer.toString('base64');
  let rawText = '';

  try {
    rawText = IS_OFFICIAL_GEMINI_ENDPOINT
      ? await streamViaGoogleSdk(base64, controller)
      : await streamViaProxy(base64, controller, requestContext.requestId);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Gemini 请求超时（${GEMINI_TIMEOUT_MS}ms）`);
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
    const validation = QuestionDataSchema.safeParse(parsed);

    if (!validation.success) {
      throw validation.error;
    }

    questionData = normalizeQuestionData(validation.data);
  } catch (error) {
    logJsonErrorContext(rawText, requestContext.requestId, error);
    writeDebugFile(requestContext.requestId, rawText);
    console.error('[Gemini??] JSON ????', {
      requestId: requestContext.requestId,
      preview: rawText.substring(0, 500)
    });
    throw new Error(
      `Gemini ??????: ${
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
  const result = await runGeminiPipeline(buffer, { requestId, source: 'url' });
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
  const result = await runGeminiPipeline(imageBuffer, { requestId, source: 'buffer' });
  return {
    ...result,
    processingTime: Date.now() - start
  };
}
