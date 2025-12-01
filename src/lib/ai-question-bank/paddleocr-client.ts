/**
 * PaddleOCR服务客户端
 * 用于调用PaddleOCR Python服务进行布局分析
 */

export interface OCRBlock {
  type: 'text' | 'figure' | 'table' | 'title';
  bbox: [number, number, number, number]; // [x, y, width, height]
  text?: string;
  confidence: number;
}

export interface OCRResult {
  blocks: OCRBlock[];
  image_size: [number, number];
}

export interface OCRResponse {
  success: boolean;
  data?: OCRResult;
  processing_time?: number;
  stats?: Record<string, number>;
  error?: string;
}

/**
 * 调用PaddleOCR服务分析图片布局
 */
export async function analyzeImageLayout(imageBuffer: Buffer): Promise<OCRResult> {
  const ocrServiceUrl = process.env.PADDLEOCR_SERVICE_URL || 'http://localhost:8000';

  console.log('[PaddleOCR] 开始布局分析', {
    serviceUrl: ocrServiceUrl,
    imageSize: imageBuffer.length
  });

  try {
    // 创建FormData
    const formData = new FormData();
    const uint8Array = imageBuffer instanceof Buffer ? new Uint8Array(imageBuffer) : new Uint8Array(imageBuffer);
    const blob = new Blob([uint8Array], { type: 'image/png' });
    formData.append('file', blob, 'image.png');

    // 调用OCR服务
    const response = await fetch(`${ocrServiceUrl}/api/analyze-layout`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`PaddleOCR服务响应错误: ${response.status} ${response.statusText}`);
    }

    const result: OCRResponse = await response.json();

    if (!result.success || !result.data) {
      throw new Error(`PaddleOCR分析失败: ${result.error || '未知错误'}`);
    }

    console.log('[PaddleOCR] 布局分析完成', {
      blockCount: result.data.blocks.length,
      imageSize: result.data.image_size,
      processingTime: result.processing_time,
      stats: result.stats
    });

    return result.data;
  } catch (error) {
    console.error('[PaddleOCR] 布局分析失败', error);
    throw new Error(`PaddleOCR布局分析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 智能匹配题目配图
 * @param ocrBlocks OCR识别的所有块
 * @param questionTexts 题目文本列表 ["1. ...", "2. ...", ...]
 * @returns 题号到配图区域的映射 {"1": {x, y, width, height}, ...}
 */
export function matchQuestionImages(
  ocrBlocks: OCRBlock[],
  questionTexts: string[]
): Record<string, { x: number; y: number; width: number; height: number }> {
  const mapping: Record<string, { x: number; y: number; width: number; height: number }> = {};

  // 提取题号
  const questionNumbers = questionTexts.map(text => {
    const match = text.match(/^(\d+)[.、]/);
    return match ? match[1] : null;
  }).filter(Boolean) as string[];

  // 提取文本块和图片块
  const textBlocks = ocrBlocks.filter(b => b.type === 'text');
  const figureBlocks = ocrBlocks.filter(b => b.type === 'figure');

  console.log('[图片匹配] 开始匹配', {
    questionCount: questionNumbers.length,
    textBlockCount: textBlocks.length,
    figureBlockCount: figureBlocks.length
  });

  // 为每个题号寻找最近的图片块
  for (const questionNum of questionNumbers) {
    // 找到题号对应的文本块
    const textBlock = textBlocks.find(block =>
      block.text?.includes(`${questionNum}.`) || block.text?.includes(`${questionNum}、`)
    );

    if (!textBlock) {
      console.warn(`[图片匹配] 未找到题号 ${questionNum} 的文本块`);
      continue;
    }

    // 找到距离该文本块最近的图片块（通常在下方或右侧）
    const [textX, textY, textW, textH] = textBlock.bbox;
    const textBottom = textY + textH;
    const textRight = textX + textW;

    let nearestFigure: OCRBlock | null = null;
    let minDistance = Infinity;

    for (const figure of figureBlocks) {
      const [figX, figY, figW, figH] = figure.bbox;

      // 过滤太小的图片块（可能是装饰性图标）
      const minSize = 80; // 最小80x80像素
      if (figW < minSize || figH < minSize) {
        console.debug(`[图片匹配] 跳过小图片块: ${figW}x${figH}`);
        continue;
      }

      // 计算距离（优先考虑下方或右侧的图片）
      let distance: number;

      if (figY > textBottom) {
        // 图片在文字下方（最常见的情况）
        distance = figY - textBottom;

        // 检查水平对齐（图片中心应该在文本宽度范围内）
        const figCenterX = figX + figW / 2;
        if (figCenterX < textX - 100 || figCenterX > textRight + 100) {
          // 水平偏移太大，增加距离惩罚
          distance += 500;
        }
      } else if (figX > textRight) {
        // 图片在文字右侧
        distance = figX - textRight + 100; // 右侧权重略低
      } else {
        // 图片在其他位置，使用欧氏距离
        const centerTextX = textX + textW / 2;
        const centerTextY = textY + textH / 2;
        const centerFigX = figX + figW / 2;
        const centerFigY = figY + figH / 2;
        distance = Math.sqrt(
          Math.pow(centerFigX - centerTextX, 2) +
          Math.pow(centerFigY - centerTextY, 2)
        );
      }

      // 距离阈值：200px内认为是同一题的配图
      const maxDistance = 200;
      if (distance < minDistance && distance < maxDistance) {
        minDistance = distance;
        nearestFigure = figure;
      }
    }

    if (nearestFigure) {
      const [x, y, width, height] = nearestFigure.bbox;
      mapping[questionNum] = { x, y, width, height };
      console.log(`[图片匹配] 题号 ${questionNum} 匹配成功`, {
        bbox: nearestFigure.bbox,
        distance: Math.round(minDistance)
      });

      // 标记已使用的图片块（避免重复匹配）
      const figIndex = figureBlocks.indexOf(nearestFigure);
      if (figIndex > -1) {
        figureBlocks.splice(figIndex, 1);
      }
    } else {
      console.warn(`[图片匹配] 题号 ${questionNum} 未找到配图（无符合条件的图片块）`);
    }
  }

  console.log('[图片匹配] 匹配完成', {
    totalQuestions: questionNumbers.length,
    matchedImages: Object.keys(mapping).length
  });

  return mapping;
}

/**
 * 健康检查 - 测试PaddleOCR服务是否可用
 */
export async function checkOCRServiceHealth(): Promise<boolean> {
  const ocrServiceUrl = process.env.PADDLEOCR_SERVICE_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${ocrServiceUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒超时
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.status === 'ok';
  } catch (error) {
    console.error('[PaddleOCR] 健康检查失败', error);
    return false;
  }
}
