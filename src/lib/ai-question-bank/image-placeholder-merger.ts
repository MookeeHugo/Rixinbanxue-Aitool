/**
 * 棰樼洰鍐呭涓庡浘鐗囪█浣滅粦瀹氭伅鐗堢帺妯″紡
 * @description 灏嗗尮閰嶅浘鐗囪祫婧愭敞鍏ュ埌 AI 杩斿洖鐨勮█鍧楃殑 <<IMG_X_Y>> 琛ㄧず涓?
 */

import type {
  ParsedQuestion,
  QuestionImageAsset,
  QuestionImagePlaceholder
} from './types';

export interface QuestionImageMap {
  [questionNumber: string]: QuestionImageAsset[];
}

export interface MergeQuestionResult {
  question: ParsedQuestion;
  rawContent: string;
  imageAssets: QuestionImageAsset[];
  imagePlaceholders: QuestionImagePlaceholder[];
  missingPlaceholders: string[];
  appendedAssetIds: string[];
}

function replaceFirst(source: string, search: string, replacement: string): {
  text: string;
  replaced: boolean;
} {
  if (!search || !source.includes(search)) {
    return { text: source, replaced: false };
  }
  const index = source.indexOf(search);
  return {
    text: source.slice(0, index) + replacement + source.slice(index + search.length),
    replaced: true
  };
}

function normalizePlaceholder(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickAsset(
  assets: QuestionImageAsset[],
  placeholder: string,
  expectedOrder: number
): QuestionImageAsset | undefined {
  const normalized = normalizePlaceholder(placeholder);
  const byPlaceholder = normalized
    ? assets.find(asset => !asset.used && asset.placeholder === normalized)
    : undefined;
  if (byPlaceholder) {
    return byPlaceholder;
  }
  const byOrder = assets.find(
    asset =>
      !asset.used &&
      typeof asset.order === 'number' &&
      asset.order === expectedOrder
  );
  if (byOrder) {
    return byOrder;
  }
  return assets.find(asset => !asset.used);
}

export function mergeQuestionsWithImages(
  questions: ParsedQuestion[],
  imageMap: QuestionImageMap
): MergeQuestionResult[] {
  // 添加预检查日志
  console.log('[占位符合并] 开始处理', {
    questionCount: questions.length,
    imageMapKeys: Object.keys(imageMap),
    totalAssets: Object.values(imageMap).reduce((sum, arr) => sum + arr.length, 0)
  });

  // 逐题分析
  questions.forEach(q => {
    const assets = imageMap[q.number] || [];
    const placeholders = q.images || [];
    console.log(`[占位符合并] 题${q.number}:`, {
      placeholdersCount: placeholders.length,
      placeholders: placeholders.map(p => p.placeholder),
      assetsCount: assets.length,
      assetIds: assets.map(a => a.id)
    });
  });

  return questions.map(question => {
    const placeholders = Array.isArray(question.images) ? question.images : [];
    const rawContent = question.content;
    let mergedContent = rawContent;
    const imageAssets = (imageMap[question.number] || []).map((asset, index) => ({
      ...asset,
      order: asset.order ?? index + 1,
      placeholder: normalizePlaceholder(asset.placeholder),
      used: asset.used ?? false
    }));

    const missingPlaceholders: string[] = [];
    const appendedAssetIds: string[] = [];

    placeholders.forEach((placeholder, idx) => {
      const token = normalizePlaceholder(placeholder.placeholder);
      if (!token) {
        return;
      }
      const asset = pickAsset(imageAssets, token, idx + 1);
      if (!asset) {
        missingPlaceholders.push(token);
        return;
      }
      const replacement = `[图片:${asset.id}]`;
      const { text, replaced } = replaceFirst(mergedContent, token, replacement);
      mergedContent = replaced ? text : `${mergedContent}\n${replacement}`;
      asset.used = true;
      asset.placeholder = asset.placeholder ?? token;
    });

    const unusedAssets = imageAssets.filter(asset => !asset.used);
    if (unusedAssets.length > 0) {
      const buffer: string[] = [];
      unusedAssets.forEach(asset => {
        const tag = `[图片:${asset.id}]`;
        buffer.push(tag);
        appendedAssetIds.push(asset.id);
        asset.used = true;
      });
      const suffix = buffer.join('\n');
      mergedContent = mergedContent.trimEnd();
      mergedContent = mergedContent.length > 0 ? `${mergedContent}\n${suffix}` : suffix;
    }

    const mergedQuestion: ParsedQuestion = {
      ...question,
      content: mergedContent
    };

    return {
      question: mergedQuestion,
      rawContent,
      imageAssets,
      imagePlaceholders: placeholders,
      missingPlaceholders,
      appendedAssetIds
    };
  });
}
