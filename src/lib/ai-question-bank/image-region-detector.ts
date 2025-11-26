/**
 * 图像区域推断算法
 * 从OCR识别的文字块中推断可能的图像/插图区域
 */

import type { OCRResult, OCRWordInfo } from './aliyun-ocr-client';

// ========== 类型定义 ==========

export interface ImageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;  // 置信度 (0-1)
  method: 'whitespace' | 'question-boundary';  // 检测方法
}

export interface QuestionRegion {
  questionNumber: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  words: OCRWordInfo[];
  textContent: string;
}

// ========== 辅助函数 ==========

/**
 * 检查两个矩形是否重叠
 */
function isOverlapping(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * 合并相邻的矩形区域
 */
function mergeAdjacentRegions(regions: ImageRegion[], maxDistance: number = 50): ImageRegion[] {
  if (regions.length === 0) return [];

  const merged: ImageRegion[] = [];
  const used = new Set<number>();

  for (let i = 0; i < regions.length; i++) {
    if (used.has(i)) continue;

    let current = { ...regions[i] };
    let changed = true;

    while (changed) {
      changed = false;

      for (let j = 0; j < regions.length; j++) {
        if (i === j || used.has(j)) continue;

        const other = regions[j];

        // 检查是否相邻（在maxDistance范围内）
        const horizontalDistance = Math.max(
          current.x - (other.x + other.width),
          other.x - (current.x + current.width),
          0
        );

        const verticalDistance = Math.max(
          current.y - (other.y + other.height),
          other.y - (current.y + current.height),
          0
        );

        if (horizontalDistance <= maxDistance && verticalDistance <= maxDistance) {
          // 合并两个区域
          const minX = Math.min(current.x, other.x);
          const minY = Math.min(current.y, other.y);
          const maxX = Math.max(current.x + current.width, other.x + other.width);
          const maxY = Math.max(current.y + current.height, other.y + other.height);

          current = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            confidence: Math.max(current.confidence, other.confidence),
            method: current.method
          };

          used.add(j);
          changed = true;
        }
      }
    }

    merged.push(current);
    used.add(i);
  }

  return merged;
}

// ========== 核心检测算法 ==========

/**
 * 方法1: 基于空白区域检测图像
 * 扫描整张图片，找到文字块之间的大面积空白区域
 */
export function detectImageByWhitespace(ocrResult: OCRResult): ImageRegion[] {
  const { PrismWordsInfo, Width, Height } = ocrResult;

  if (!PrismWordsInfo || PrismWordsInfo.length === 0) {
    return [];
  }

  console.log('[图像检测] 方法1: 空白区域检测', {
    imageSize: `${Width}x${Height}`,
    wordCount: PrismWordsInfo.length
  });

  // 构建文字占用区域（扩展边距）
  const textBlocks = PrismWordsInfo.map(word => ({
    x: word.X - 5,
    y: word.Y - 5,
    width: word.Width + 10,
    height: word.Height + 10
  }));

  const imageRegions: ImageRegion[] = [];
  const gridSize = 50; // 50px网格
  const minRegionSize = 100; // 最小区域尺寸

  // 网格扫描
  for (let y = 0; y < Height; y += gridSize) {
    for (let x = 0; x < Width; x += gridSize) {
      // 检查当前网格是否与文字重叠
      const gridRect = { x, y, width: gridSize, height: gridSize };
      const hasText = textBlocks.some(block => isOverlapping(gridRect, block));

      if (!hasText) {
        // 找到空白区域，尝试扩展为完整矩形
        const region = expandEmptyRegion(x, y, textBlocks, Width, Height, gridSize);

        if (region.width >= minRegionSize && region.height >= minRegionSize) {
          // 计算置信度（基于区域大小）
          const confidence = Math.min(
            0.5 + (region.width * region.height) / (Width * Height) * 0.5,
            0.95
          );

          imageRegions.push({
            ...region,
            confidence,
            method: 'whitespace'
          });
        }
      }
    }
  }

  // 合并相邻区域
  const mergedRegions = mergeAdjacentRegions(imageRegions, 30);

  // 过滤太小的区域
  const filteredRegions = mergedRegions.filter(
    region => region.width >= minRegionSize && region.height >= minRegionSize
  );

  console.log('[图像检测] 空白区域检测完成', {
    rawRegions: imageRegions.length,
    mergedRegions: mergedRegions.length,
    finalRegions: filteredRegions.length
  });

  return filteredRegions;
}

/**
 * 扩展空白区域为完整矩形
 */
function expandEmptyRegion(
  startX: number,
  startY: number,
  textBlocks: Array<{ x: number; y: number; width: number; height: number }>,
  maxWidth: number,
  maxHeight: number,
  gridSize: number
): { x: number; y: number; width: number; height: number } {
  let x = startX;
  let y = startY;
  let width = gridSize;
  let height = gridSize;

  // 向右扩展
  while (x + width < maxWidth) {
    const testRect = { x, y, width: width + gridSize, height };
    const hasText = textBlocks.some(block => isOverlapping(testRect, block));
    if (hasText) break;
    width += gridSize;
  }

  // 向下扩展
  while (y + height < maxHeight) {
    const testRect = { x, y, width, height: height + gridSize };
    const hasText = textBlocks.some(block => isOverlapping(testRect, block));
    if (hasText) break;
    height += gridSize;
  }

  return { x, y, width, height };
}

/**
 * 方法2: 基于题号的区域划分
 * 识别题号位置，将每题划分为独立区域
 */
export function extractQuestionRegions(ocrResult: OCRResult): QuestionRegion[] {
  const { PrismWordsInfo, Height } = ocrResult;

  if (!PrismWordsInfo || PrismWordsInfo.length === 0) {
    return [];
  }

  console.log('[图像检测] 方法2: 题号边界检测', {
    wordCount: PrismWordsInfo.length
  });

  // 找到所有题号
  const questionMarkers = PrismWordsInfo.filter(word =>
    /^(\d+)[.、]/.test(word.Word.trim())
  );

  console.log('[图像检测] 找到题号', {
    count: questionMarkers.length,
    numbers: questionMarkers.map(m => m.Word)
  });

  if (questionMarkers.length === 0) {
    return [];
  }

  // 按Y坐标排序
  questionMarkers.sort((a, b) => a.Y - b.Y);

  // 按题号划分区域
  const regions: QuestionRegion[] = [];

  for (let i = 0; i < questionMarkers.length; i++) {
    const start = questionMarkers[i];
    const end = questionMarkers[i + 1] || { Y: Height };

    // 提取题号
    const match = start.Word.match(/^(\d+)[.、]/);
    if (!match) continue;

    const questionNumber = match[1];

    // 找到该题的所有文字块
    const regionWords = PrismWordsInfo.filter(word =>
      word.Y >= start.Y && word.Y < end.Y
    );

    if (regionWords.length === 0) continue;

    // 计算包围盒
    const minX = Math.min(...regionWords.map(w => w.X));
    const maxX = Math.max(...regionWords.map(w => w.X + w.Width));
    const minY = start.Y;
    const maxY = end.Y;

    // 合成文本内容
    const textContent = regionWords.map(w => w.Word).join('');

    regions.push({
      questionNumber,
      bbox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      },
      words: regionWords,
      textContent
    });
  }

  console.log('[图像检测] 题号区域划分完成', {
    questionCount: regions.length
  });

  return regions;
}

/**
 * 综合检测: 结合两种方法
 * 优先使用题号边界，然后在题号区域内检测空白图像
 */
export function detectImageRegions(ocrResult: OCRResult): {
  imageRegions: ImageRegion[];
  questionRegions: QuestionRegion[];
} {
  // 方法1: 检测空白区域
  const whitespaceRegions = detectImageByWhitespace(ocrResult);

  // 方法2: 提取题号区域
  const questionRegions = extractQuestionRegions(ocrResult);

  console.log('[图像检测] 综合检测完成', {
    imageRegions: whitespaceRegions.length,
    questionRegions: questionRegions.length
  });

  return {
    imageRegions: whitespaceRegions,
    questionRegions
  };
}
