/**
 * 题目与配图智能匹配算法
 * 根据题号和空间位置,将Qwen3-VL解析的题目与OCR检测的图像区域进行匹配
 */

import type { ImageRegion, QuestionRegion } from './image-region-detector';
import type { OCRWordInfo } from './aliyun-ocr-client';

// ========== 类型定义 ==========

export interface Question {
  number: string;
  content: string;
  options?: string[];
  answer?: string;
}

export interface ImageMapping {
  [questionNumber: string]: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    matchMethod: string;
  };
}

// ========== 核心匹配算法 ==========

/**
 * 智能匹配题目与配图
 * @param questions Qwen3-VL解析的题目列表
 * @param imageRegions 检测到的图像区域
 * @param questionRegions 题号区域边界
 * @param ocrWords OCR识别的文字块（用于定位题号）
 */
export function matchQuestionImages(
  questions: Question[],
  imageRegions: ImageRegion[],
  questionRegions: QuestionRegion[],
  ocrWords: OCRWordInfo[],
  imageWidth: number,
  imageHeight: number
): ImageMapping {
  console.log('[智能匹配] 开始匹配题目与配图', {
    questionCount: questions.length,
    imageRegionCount: imageRegions.length,
    questionRegionCount: questionRegions.length
  });

  const mapping: ImageMapping = {};
  const usedRegions = new Set<number>();  // 已使用的图像区域索引
  const questionRegionMap = new Map(
    questionRegions.map(region => [region.questionNumber, region])
  );

  for (const question of questions) {
    console.log(`[智能匹配] 开始匹配题${question.number}`, {
      hasQuestionRegion: questionRegionMap.has(question.number),
      questionRegionKeys: Array.from(questionRegionMap.keys()),
      imageRegionsAvailable: imageRegions.length - usedRegions.size
    });

    // 方法1: 基于题号区域边界匹配
    const boundaryMatch = matchByQuestionBoundary(
      question,
      imageRegions,
      questionRegionMap,
      usedRegions,
      imageWidth,
      imageHeight
    );

    if (boundaryMatch) {
      mapping[question.number] = boundaryMatch;
      continue;
    }

    // 方法2: 基于题号位置匹配最近的图像
    const nearestMatch = matchByNearestImage(
      question,
      imageRegions,
      ocrWords,
      usedRegions,
      questionRegionMap.get(question.number),
      imageWidth,
      imageHeight
    );

    if (nearestMatch) {
      mapping[question.number] = nearestMatch;
    }
  }

  console.log('[智能匹配] 匹配完成', {
    totalQuestions: questions.length,
    matchedQuestions: Object.keys(mapping).length,
    matchRate: `${Math.round(Object.keys(mapping).length / questions.length * 100)}%`
  });

  return mapping;
}

/**
 * 方法1: 基于题号区域边界匹配
 * 在题号包围盒内查找图像区域
 */
function matchByQuestionBoundary(
  question: Question,
  imageRegions: ImageRegion[],
  questionRegionMap: Map<string, QuestionRegion>,
  usedRegions: Set<number>,
  imageWidth: number,
  imageHeight: number
): ImageMapping[string] | null {
  // 找到对应题号的区域边界
  const questionRegion = questionRegionMap.get(question.number);

  if (!questionRegion) {
    return null;
  }

  const expandedBBox = expandQuestionBBox(questionRegion.bbox, imageWidth, imageHeight);

  // 在该题的边界内查找图像区域
  for (let i = 0; i < imageRegions.length; i++) {
    if (usedRegions.has(i)) continue;

    const region = imageRegions[i];

    // 检查图像区域是否在题号边界内
    const isInside =
      region.x >= expandedBBox.x &&
      region.y >= expandedBBox.y &&
      region.x + region.width <= expandedBBox.x + expandedBBox.width &&
      region.y + region.height <= expandedBBox.y + expandedBBox.height;

    if (isInside) {
      usedRegions.add(i);

      console.log(`[智能匹配] 题${question.number}: 边界匹配成功`, {
        region: `${region.x},${region.y} ${region.width}x${region.height}`,
        confidence: region.confidence
      });

      const trimmed = trimRegionForQuestion(region, questionRegion.bbox, imageWidth);

      return {
        x: trimmed.x,
        y: trimmed.y,
        width: trimmed.width,
        height: trimmed.height,
        confidence: region.confidence,
        matchMethod: 'boundary'
      };
    }
  }

  return null;
}

/**
 * 方法2: 基于题号位置匹配最近的图像
 * 找到题号对应的文字块,然后匹配最近的图像区域
 */
function matchByNearestImage(
  question: Question,
  imageRegions: ImageRegion[],
  ocrWords: OCRWordInfo[],
  usedRegions: Set<number>,
  questionRegion: QuestionRegion | undefined,
  imageWidth: number,
  imageHeight: number
): ImageMapping[string] | null {
  // 查找题号对应的文字块
  const questionNumberWord = ocrWords.find(word =>
    word.Word.trim().startsWith(question.number + '.') ||
    word.Word.trim().startsWith(question.number + '、')
  );

  if (!questionNumberWord) {
    console.warn(`[智能匹配] 题${question.number}: 未找到题号文字块`);
    return null;
  }

  const questionY = questionNumberWord.Y;
  const questionX = questionNumberWord.X;

  let bestMatch: {
    index: number;
    distance: number;
    region: ImageRegion;
  } | null = null;

  // 找到距离题号最近的图像区域
  for (let i = 0; i < imageRegions.length; i++) {
    if (usedRegions.has(i)) continue;

    const region = imageRegions[i];

    // 计算距离（优先考虑下方或右侧的图像）
    let distance: number;

    const regionCenterX = region.x + region.width / 2;
    const regionCenterY = region.y + region.height / 2;

    // 图像在题号下方（最常见）
    if (region.y > questionY) {
      distance = region.y - questionY;

      // 水平偏移惩罚
      const horizontalOffset = Math.abs(regionCenterX - questionX);
      distance += horizontalOffset * 0.5;
    }
    // 图像在题号右侧
    else if (region.x > questionX) {
      distance = region.x - questionX + 100; // 右侧权重略低
    }
    // 图像在其他位置（欧氏距离）
    else {
      distance = Math.sqrt(
        Math.pow(regionCenterX - questionX, 2) +
        Math.pow(regionCenterY - questionY, 2)
      ) + 200; // 其他位置权重更低
    }

    // 距离阈值: 300px内认为是同题配图
    if (distance < 420 && (!bestMatch || distance < bestMatch.distance)) {
      bestMatch = { index: i, distance, region };
    }
  }

  if (bestMatch) {
    usedRegions.add(bestMatch.index);

    console.log(`[智能匹配] 题${question.number}: 最近匹配成功`, {
      distance: Math.round(bestMatch.distance),
      region: `${bestMatch.region.x},${bestMatch.region.y} ${bestMatch.region.width}x${bestMatch.region.height}`,
      confidence: bestMatch.region.confidence
    });

    const trimmed = questionRegion
      ? trimRegionForQuestion(bestMatch.region, questionRegion.bbox, imageWidth)
      : bestMatch.region;

    return {
      x: trimmed.x,
      y: trimmed.y,
      width: trimmed.width,
      height: trimmed.height,
      confidence: bestMatch.region.confidence * (1 - bestMatch.distance / 420 * 0.35), // 距离衰减
      matchMethod: 'nearest'
    };
  }

  console.warn(`[智能匹配] 题${question.number}: 未找到合适的配图`);
  return null;
}

/**
 * 验证匹配结果的合理性
 * @param mapping 匹配结果
 * @param imageWidth 原图宽度
 * @param imageHeight 原图高度
 * @returns 验证后的映射(过滤掉不合理的匹配)
 */
export function validateImageMapping(
  mapping: ImageMapping,
  imageWidth: number,
  imageHeight: number
): ImageMapping {
  const validated: ImageMapping = {};

  for (const [questionNumber, region] of Object.entries(mapping)) {
    const clamped = clampRegion(region, imageWidth, imageHeight);

    // 检查区域尺寸是否合理
    if (clamped.width < 50 || clamped.height < 50) {
      console.warn(`[匹配验证] 题${questionNumber}: 区域太小，已忽略`, {
        size: `${clamped.width}x${clamped.height}`
      });
      continue;
    }

    if (clamped.width > imageWidth * 0.95 || clamped.height > imageHeight * 0.95) {
      console.warn(`[匹配验证] 题${questionNumber}: 区域太大，已忽略`, {
        size: `${clamped.width}x${clamped.height}`,
        imageSize: `${imageWidth}x${imageHeight}`
      });
      continue;
    }

    // 通过验证
    validated[questionNumber] = clamped;
  }

  console.log('[匹配验证] 验证完成', {
    originalCount: Object.keys(mapping).length,
    validatedCount: Object.keys(validated).length,
    rejectedCount: Object.keys(mapping).length - Object.keys(validated).length
  });

  return validated;
}

function expandQuestionBBox(
  bbox: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
) {
  const paddingX = Math.max(150, bbox.width * 0.35);
  const paddingY = Math.max(30, bbox.height * 0.15);

  const expandedX = Math.max(0, Math.floor(bbox.x - paddingX * 0.2));
  const expandedY = Math.max(0, Math.floor(bbox.y - paddingY));
  const expandedWidth = Math.min(
    imageWidth - expandedX,
    Math.ceil(bbox.width + paddingX)
  );
  const expandedHeight = Math.min(
    imageHeight - expandedY,
    Math.ceil(bbox.height + paddingY * 2)
  );

  return {
    x: expandedX,
    y: expandedY,
    width: expandedWidth,
    height: expandedHeight
  };
}

function clampRegion(
  region: ImageMapping[string],
  imageWidth: number,
  imageHeight: number
) {
  const x = Math.max(0, Math.min(region.x, imageWidth));
  const y = Math.max(0, Math.min(region.y, imageHeight));
  const maxWidth = Math.max(1, imageWidth - x);
  const maxHeight = Math.max(1, imageHeight - y);

  return {
    ...region,
    x,
    y,
    width: Math.min(region.width, maxWidth),
    height: Math.min(region.height, maxHeight)
  };
}

function trimRegionForQuestion(
  region: { x: number; y: number; width: number; height: number },
  questionBBox: { x: number; y: number; width: number; height: number },
  imageWidth: number
) {
  const questionRight = questionBBox.x + questionBBox.width;
  const regionRight = region.x + region.width;
  const overlapLeft = Math.max(region.x, questionBBox.x);
  const overlapRight = Math.min(regionRight, questionRight);
  const overlapWidth = overlapRight - overlapLeft;

  if (overlapWidth > 0 && overlapWidth / region.width > 0.6) {
    const newX = Math.min(
      imageWidth - 50,
      Math.max(questionRight + 8, region.x)
    );
    const newWidth = Math.max(50, regionRight - newX);
    if (newWidth < region.width) {
      return { ...region, x: newX, width: newWidth };
    }
  }

  return region;
}
