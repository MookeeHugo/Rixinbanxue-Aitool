/**
 * AI题库系统 - 工具函数
 * @description 文件处理、格式转换等通用工具
 */

/**
 * 将File转换为Base64（不含data:前缀）
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data:image/...;base64,前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 将 Buffer/TypedArray/ArrayBuffer 转换为 Base64
 */
export function bufferToBase64(buffer: Buffer | ArrayBuffer | ArrayBufferView): string {
  let nodeBuffer: Buffer;

  if (Buffer.isBuffer(buffer)) {
    nodeBuffer = buffer;
  } else if (ArrayBuffer.isView(buffer)) {
    nodeBuffer = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } else if (buffer instanceof ArrayBuffer) {
    nodeBuffer = Buffer.from(buffer);
  } else {
    nodeBuffer = Buffer.from(buffer as any);
  }

  return nodeBuffer.toString('base64');
}

/**
 * 验证是否为有效的Base64字符串
 */
export function isValidBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 生成唯一的文件Key（用于R2存储）
 */
export function generateFileKey(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = fileName.split('.').pop();
  return `ai-question-bank/${userId}/${timestamp}-${randomStr}.${ext}`;
}

const POSSIBLE_MOJIBAKE_PATTERN = /[ÃÂæåçèéêëìíîïðñòóôõöøùúûüýþÆØÅáàäâãåéèêëíìîïóòôöõúùûüñÝþ]/;

function decodeLatin1ToUtf8(input: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(input, 'binary').toString('utf8');
    }
    if (typeof TextDecoder !== 'undefined') {
      const bytes = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        bytes[i] = input.charCodeAt(i) & 0xff;
      }
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
  } catch {
    // ignore decode errors and fall back to the original string
  }
  return input;
}

/**
 * ���й����ļ����ƣ�����ģ�涴����UTF-8�ַ���
 */
export function normalizeFileName(fileName?: string | null): string {
  if (!fileName) return '';
  const trimmed = fileName.trim();
  if (!trimmed) return '';

  if (!POSSIBLE_MOJIBAKE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const decoded = decodeLatin1ToUtf8(trimmed);
  if (
    decoded &&
    decoded !== trimmed &&
    !decoded.includes('\uFFFD') &&
    (/[\u4e00-\u9fff]/.test(decoded) || decoded.split('').some(char => char.charCodeAt(0) > 127))
  ) {
    return decoded;
  }

  return trimmed;
}

/**
 * 从URL提取文件名
 */
export function getFileNameFromUrl(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1];
}

/**
 * 判断是否为图片类型
 */
export function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '');
}

/**
 * 判断是否为PDF
 */
export function isPdfFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf');
}

/**
 * 根据文件名推断图片 MIME 类型
 */
export function guessImageMimeType(fileName?: string): string {
  const ext = fileName?.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
}

/**
 * 计算置信度的平均值
 */
export function calculateAverageConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 0;
  const sum = confidences.reduce((acc, val) => acc + val, 0);
  return sum / confidences.length;
}

/**
 * 过滤低置信度题目
 */
export function filterLowConfidenceQuestions<T extends { confidence: number }>(
  questions: T[],
  threshold: number = 0.8
): { high: T[]; low: T[] } {
  const high = questions.filter(q => q.confidence >= threshold);
  const low = questions.filter(q => q.confidence < threshold);
  return { high, low };
}

/**
 * 格式化进度百分比
 */
export function formatProgress(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

/**
 * 延迟函数（用于重试等待）
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数（指数退避）
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delayTime = initialDelay * Math.pow(2, i);
        console.log(`重试 ${i + 1}/${maxRetries}，等待 ${delayTime}ms...`);
        await delay(delayTime);
      }
    }
  }

  throw lastError;
}

/**
 * 安全的JSON解析
 */
export function safeJSONParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * 截断文本（用于日志）
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
