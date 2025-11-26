/**
 * 阿里云OCR客户端 - 使用官方SDK (@alicloud/ocr20210707)
 * @description 调用阿里云全文识别高精版API,获取文字+坐标
 */

import { Readable } from 'stream';

// ========== 类型定义 ==========

/**
 * OCR识别的单个文字块信息
 */
export interface OCRWordInfo {
  /** 文字内容 */
  Word: string;
  /** 左上角X坐标 */
  X: number;
  /** 左上角Y坐标 */
  Y: number;
  /** 宽度 */
  Width: number;
  /** 高度 */
  Height: number;
  /** 置信度 */
  Prob: number;
}

/**
 * OCR识别结果
 */
export interface OCRResult {
  /** 全文内容 */
  Content: string;
  /** 图片宽度 */
  Width: number;
  /** 图片高度 */
  Height: number;
  /** 文字块详细信息（包含坐标） */
  PrismWordsInfo: OCRWordInfo[];
}

// ========== 核心功能 ==========

/**
 * 识别图片中的文字和位置
 * @param imageBuffer 图片Buffer
 * @returns OCR识别结果
 */
export async function recognizeImage(imageBuffer: Buffer): Promise<OCRResult> {
  console.log('[阿里云OCR] 开始识别图片', {
    imageSize: imageBuffer.length,
    sizeKB: Math.round(imageBuffer.length / 1024),
    isServer: typeof window === 'undefined'
  });

  const startTime = Date.now();

  try {
    // 动态导入 SDK（使用已安装的包）
    const OCR = await import('@alicloud/ocr-api20210707');
    // @ts-ignore - openapi-core exists but TypeScript can't find its types
    const OpenApiCore = await import('@alicloud/openapi-core');

    const Client = OCR.default;
    const { Config } = OpenApiCore.$OpenApiUtil;

    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const regionId = process.env.OCR_REGION || 'cn-hangzhou';

    if (!accessKeyId || !accessKeySecret) {
      throw new Error('阿里云AccessKey未配置，请在.env.local中配置 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET');
    }

    // 构建endpoint（华东1杭州使用 ocr-api 格式）
    const endpoint = `ocr-api.${regionId}.aliyuncs.com`;

    // 创建客户端配置对象
    const config = new Config({
      accessKeyId,
      accessKeySecret,
      endpoint,
    });

    const client = new Client(config);

    console.log('[阿里云OCR] 客户端初始化成功', {
      regionId,
      endpoint,
    });

    // 创建请求对象 - 使用 RecognizeAdvancedRequest 类
    const RecognizeAdvancedRequest = (OCR as any).RecognizeAdvancedRequest;
    const request = new RecognizeAdvancedRequest({
      body: Readable.from(imageBuffer),
      outputCharInfo: true,
      needRotate: false,
      noStamp: true,
      paragraph: true,
      row: true,
    });

    // 调用全文识别高精版API（RecognizeAdvanced）
    const response = await client.recognizeAdvanced(request);

    const processingTime = Date.now() - startTime;

    // 检查响应 - data 是 JSON 字符串
    const dataStr = response.body?.data;
    if (!dataStr) {
      throw new Error('阿里云OCR返回数据为空');
    }

    // 解析 JSON 字符串
    const data = JSON.parse(dataStr);

    // 转换为统一格式
    const ocrResult: OCRResult = {
      Content: data.content || data.prism_text || '',
      Width: data.width || data.orgWidth || 0,
      Height: data.height || data.orgHeight || 0,
      PrismWordsInfo: parseWordsInfo(data.prism_wordsInfo || data.prismWordsInfo || []),
    };

    console.log('[阿里云OCR] 识别完成', {
      processingTime: `${processingTime}ms`,
      textLength: ocrResult.Content?.length || 0,
      wordCount: ocrResult.PrismWordsInfo?.length || 0,
      imageSize: `${ocrResult.Width}x${ocrResult.Height}`
    });

    return ocrResult;

  } catch (error) {
    console.error('[阿里云OCR] 识别失败', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      elapsed: `${Date.now() - startTime}ms`
    });

    throw new Error(`阿里云OCR识别失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 解析阿里云返回的文字块信息
 * @param wordsInfo 原始数据
 * @returns 标准化的文字块数组
 */
function parseWordsInfo(wordsInfo: any[]): OCRWordInfo[] {
  return wordsInfo.map(word => {
    // 阿里云返回的坐标格式：pos = [{ x, y }, { x, y }, { x, y }, { x, y }]
    // 取左上角点作为基准
    const positions = word.pos || [];
    const topLeft = positions[0] || { x: 0, y: 0 };
    const bottomRight = positions[2] || topLeft;

    return {
      Word: word.word || '',
      X: topLeft.x || 0,
      Y: topLeft.y || 0,
      Width: (bottomRight.x || 0) - (topLeft.x || 0),
      Height: (bottomRight.y || 0) - (topLeft.y || 0),
      Prob: word.prob || 0,
    };
  });
}

/**
 * 检查OCR配置是否完整
 * @returns 是否已配置
 */
export function checkOCRConfig(): boolean {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;

  const isConfigured = !!(accessKeyId && accessKeySecret);

  if (!isConfigured) {
    console.log('[阿里云OCR] 配置检查: 未配置 (将跳过OCR功能)');
  } else {
    console.log('[阿里云OCR] 配置检查: 已配置');
  }

  return isConfigured;
}

/**
 * 将OCR结果转换为Markdown格式
 * @param ocrResult OCR识别结果
 * @returns Markdown文本
 */
export function buildMarkdownFromOCR(ocrResult: OCRResult): string {
  if (!ocrResult.PrismWordsInfo || ocrResult.PrismWordsInfo.length === 0) {
    return ocrResult.Content || '';
  }

  // 按Y坐标分组为行（容忍±10像素）
  const lines: OCRWordInfo[][] = [];
  let currentLine: OCRWordInfo[] = [];
  let lastY = -1;

  const sortedWords = [...ocrResult.PrismWordsInfo].sort((a, b) => a.Y - b.Y);

  for (const word of sortedWords) {
    if (lastY === -1 || Math.abs(word.Y - lastY) <= 10) {
      currentLine.push(word);
      lastY = (lastY === -1) ? word.Y : (lastY + word.Y) / 2;
    } else {
      // 结束当前行
      currentLine.sort((a, b) => a.X - b.X);
      lines.push(currentLine);
      currentLine = [word];
      lastY = word.Y;
    }
  }

  // 处理最后一行
  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.X - b.X);
    lines.push(currentLine);
  }

  // 拼接为Markdown
  return lines.map(line =>
    line.map(word => word.Word).join('')
  ).join('\n');
}
