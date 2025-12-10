/**
 * 原创性检测器
 *
 * 使用string-similarity库进行双重相似度检查
 * - 整体相似度 < 20% 才通过
 * - 段落级别相似度 > 50% 会被标记
 */

import { compareTwoStrings } from 'string-similarity';
import { OriginalityCheckResult } from './types';

// ============================================================================
// 原创性检测器类
// ============================================================================

export class OriginalityChecker {
  private readonly SIMILARITY_THRESHOLD = 0.2; // 20%阈值
  private readonly PARAGRAPH_THRESHOLD = 0.5; // 段落50%阈值

  /**
   * 检查整体原创性
   */
  check(originalContent: string, generatedContent: string): OriginalityCheckResult {
    // 1. 清理文本（移除空白、标点等）
    const cleanOriginal = this._cleanText(originalContent);
    const cleanGenerated = this._cleanText(generatedContent);

    // 2. 计算整体相似度
    const similarity = compareTwoStrings(cleanOriginal, cleanGenerated);
    const similarityPercent = Math.round(similarity * 100);

    // 3. 段落级别检查
    const paragraphCheck = this.checkParagraphSimilarity(originalContent, generatedContent);

    // 4. 词汇多样性检查
    const vocabularyDiversity = this._calculateVocabularyDiversity(
      cleanOriginal,
      cleanGenerated
    );

    // 5. 综合判断
    const passed =
      similarity < this.SIMILARITY_THRESHOLD &&
      paragraphCheck.maxSimilarity < this.PARAGRAPH_THRESHOLD;

    // 6. 生成原因说明
    let reason = '';
    if (!passed) {
      if (similarity >= this.SIMILARITY_THRESHOLD) {
        reason = `整体相似度过高（${similarityPercent}% ≥ 20%），可能存在抄袭`;
      } else if (paragraphCheck.maxSimilarity >= this.PARAGRAPH_THRESHOLD) {
        reason = `发现 ${paragraphCheck.suspiciousParagraphs} 个高度相似的段落（相似度 ≥ 50%）`;
      }
    } else {
      reason = `原创性通过：整体相似度 ${similarityPercent}%，词汇多样性 ${vocabularyDiversity}%`;
    }

    console.log(`[OriginalityChecker] 整体相似度: ${similarityPercent}%`);
    console.log(
      `[OriginalityChecker] 最高段落相似度: ${Math.round(paragraphCheck.maxSimilarity * 100)}%`
    );
    console.log(
      `[OriginalityChecker] 可疑段落数: ${paragraphCheck.suspiciousParagraphs}`
    );
    console.log(`[OriginalityChecker] 词汇多样性: ${vocabularyDiversity}%`);
    console.log(`[OriginalityChecker] 检测结果: ${passed ? '✓ 通过' : '✗ 不通过'}`);

    return {
      passed,
      similarity: similarityPercent,
      reason,
      details: {
        overall_similarity: similarityPercent,
        max_paragraph_similarity: Math.round(paragraphCheck.maxSimilarity * 100),
        suspicious_paragraphs: paragraphCheck.suspiciousParagraphs,
        vocabulary_diversity: vocabularyDiversity,
      },
    };
  }

  /**
   * 段落级别相似度检查
   */
  checkParagraphSimilarity(
    original: string,
    generated: string
  ): {
    maxSimilarity: number;
    suspiciousParagraphs: number;
  } {
    // 按换行符分割段落
    const originalParagraphs = original
      .split(/\n+/)
      .map((p) => this._cleanText(p))
      .filter((p) => p.length > 10); // 忽略太短的段落

    const generatedParagraphs = generated
      .split(/\n+/)
      .map((p) => this._cleanText(p))
      .filter((p) => p.length > 10);

    let maxSimilarity = 0;
    let suspiciousCount = 0;

    // 逐个比较段落
    for (const genPara of generatedParagraphs) {
      for (const origPara of originalParagraphs) {
        const sim = compareTwoStrings(origPara, genPara);

        if (sim > maxSimilarity) {
          maxSimilarity = sim;
        }

        // Codex建议：标记>50%相似度的段落
        if (sim > this.PARAGRAPH_THRESHOLD) {
          suspiciousCount++;
        }
      }
    }

    return {
      maxSimilarity,
      suspiciousParagraphs: suspiciousCount,
    };
  }

  /**
   * 计算词汇多样性
   * 返回值越高，说明用了更多不同的词汇
   */
  private _calculateVocabularyDiversity(original: string, generated: string): number {
    const originalWords = new Set(original.split(/\s+/));
    const generatedWords = new Set(generated.split(/\s+/));

    // 计算交集和并集
    const intersection = new Set(
      [...originalWords].filter((word) => generatedWords.has(word))
    );
    const union = new Set([...originalWords, ...generatedWords]);

    // Jaccard距离 = 1 - (交集/并集)
    const jaccardDistance = 1 - intersection.size / union.size;

    return Math.round(jaccardDistance * 100);
  }

  /**
   * 清理文本
   * 移除标点、空白，统一小写
   */
  private _cleanText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ') // 只保留中文、英文、数字
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim();
  }

  /**
   * 获取相似的句子列表（用于调试）
   */
  getSimilarSentences(
    original: string,
    generated: string,
    threshold = 0.7
  ): Array<{ original: string; generated: string; similarity: number }> {
    const originalSentences = original
      .split(/[。！？\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const generatedSentences = generated
      .split(/[。！？\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const similarPairs: Array<{
      original: string;
      generated: string;
      similarity: number;
    }> = [];

    for (const genSent of generatedSentences) {
      for (const origSent of originalSentences) {
        const sim = compareTwoStrings(
          this._cleanText(origSent),
          this._cleanText(genSent)
        );

        if (sim >= threshold) {
          similarPairs.push({
            original: origSent,
            generated: genSent,
            similarity: Math.round(sim * 100) / 100,
          });
        }
      }
    }

    // 按相似度降序排列
    return similarPairs.sort((a, b) => b.similarity - a.similarity);
  }
}
