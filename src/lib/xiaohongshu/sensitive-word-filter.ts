/**
 * 敏感词过滤器
 *
 * 功能：
 * 1. 检测内容中的敏感词
 * 2. 自动替换敏感词
 * 3. 提供替换建议
 */

// ============================================================================
// 敏感词库
// ============================================================================

/**
 * 敏感词分类
 */
export const SENSITIVE_WORD_CATEGORIES = {
  // 政治敏感词
  political: [
    '政治',
    '政府',
    '官员',
    '领导',
    '党',
    '主席',
    '总理',
    '敏感政治词汇', // 示例，实际使用时需要完整词库
  ],

  // 色情低俗词
  adult: [
    '色情',
    '黄色',
    '成人',
    '不雅',
    // 实际使用需要完整词库
  ],

  // 暴力血腥词
  violence: [
    '杀',
    '血',
    '暴力',
    '打架',
    '斗殴',
    '凶器',
  ],

  // 赌博诈骗词
  gambling: [
    '赌博',
    '博彩',
    '彩票',
    '中奖',
    '诈骗',
    '骗钱',
    '传销',
    '非法集资',
  ],

  // 广告营销词（可能导致封禁）
  advertising: [
    '加微信',
    '加V',
    '扫码',
    '私信',
    '链接',
    'http',
    'www.',
    '.com',
    '购买',
    '代购',
    '团购',
  ],

  // 医疗保健（需谨慎）
  medical: [
    '治疗',
    '偏方',
    '神药',
    '包治',
    '根治',
    '药',
    '医院',
  ],

  // 其他违规词
  other: [
    '翻墙',
    'VPN',
    '代理',
    '破解',
    '盗版',
  ],
};

/**
 * 敏感词替换映射
 */
const WORD_REPLACEMENTS: Record<string, string> = {
  // 广告营销替换
  '加微信': '留言咨询',
  '加V': '关注',
  '私信': '评论区交流',
  '链接': '详情',
  '购买': '了解',
  '代购': '分享',

  // 医疗相关替换
  '治疗': '改善',
  '偏方': '方法',
  '神药': '好物',
  '包治': '有效',
  '根治': '解决',

  // 其他替换
  '破解': '解锁',
  '盗版': '版本',
};

// ============================================================================
// 敏感词过滤器类
// ============================================================================

export interface SensitiveMatch {
  word: string;
  category: string;
  position: number;
  replacement?: string;
}

export interface ScanResult {
  hasSensitiveWords: boolean;
  matches: SensitiveMatch[];
  riskLevel: 'low' | 'medium' | 'high';
  suggestion: string;
}

export class SensitiveWordFilter {
  private wordSet: Set<string>;
  private categoryMap: Map<string, string>;

  constructor() {
    this.wordSet = new Set();
    this.categoryMap = new Map();

    // 构建敏感词集合
    this._buildWordSet();
  }

  /**
   * 构建敏感词集合
   */
  private _buildWordSet(): void {
    for (const [category, words] of Object.entries(SENSITIVE_WORD_CATEGORIES)) {
      for (const word of words) {
        this.wordSet.add(word.toLowerCase());
        this.categoryMap.set(word.toLowerCase(), category);
      }
    }

    console.log(`[SensitiveWordFilter] 加载了 ${this.wordSet.size} 个敏感词`);
  }

  /**
   * 扫描内容中的敏感词
   */
  async scanContent(content: string): Promise<ScanResult> {
    const matches: SensitiveMatch[] = [];
    const lowerContent = content.toLowerCase();

    // 遍历所有敏感词，查找匹配
    for (const word of this.wordSet) {
      let position = 0;

      while (true) {
        position = lowerContent.indexOf(word, position);

        if (position === -1) break;

        const category = this.categoryMap.get(word) || 'other';
        const replacement = WORD_REPLACEMENTS[word];

        matches.push({
          word: content.substring(position, position + word.length), // 保留原始大小写
          category,
          position,
          replacement,
        });

        position += word.length;
      }
    }

    // 计算风险等级
    const riskLevel = this._calculateRiskLevel(matches);

    // 生成建议
    const suggestion = this._generateSuggestion(matches, riskLevel);

    return {
      hasSensitiveWords: matches.length > 0,
      matches,
      riskLevel,
      suggestion,
    };
  }

  /**
   * 计算风险等级
   */
  private _calculateRiskLevel(matches: SensitiveMatch[]): 'low' | 'medium' | 'high' {
    if (matches.length === 0) return 'low';

    // 高风险分类
    const highRiskCategories = ['political', 'adult', 'violence', 'gambling'];

    const hasHighRisk = matches.some((m) => highRiskCategories.includes(m.category));

    if (hasHighRisk) return 'high';
    if (matches.length >= 5) return 'medium';
    if (matches.length >= 2) return 'medium';

    return 'low';
  }

  /**
   * 生成建议
   */
  private _generateSuggestion(
    matches: SensitiveMatch[],
    riskLevel: 'low' | 'medium' | 'high'
  ): string {
    if (matches.length === 0) {
      return '内容未检测到敏感词，可以发布';
    }

    if (riskLevel === 'high') {
      return `检测到 ${matches.length} 个高风险敏感词，建议重新生成内容`;
    }

    if (riskLevel === 'medium') {
      return `检测到 ${matches.length} 个敏感词，建议自动替换后再发布`;
    }

    return `检测到 ${matches.length} 个低风险词汇，建议手动检查`;
  }

  /**
   * 自动替换敏感词
   */
  async replaceSensitiveWords(content: string): Promise<{
    replacedContent: string;
    replacementCount: number;
    replacements: Array<{ original: string; replacement: string }>;
  }> {
    let replacedContent = content;
    const replacements: Array<{ original: string; replacement: string }> = [];
    let replacementCount = 0;

    // 按位置倒序排序（从后往前替换，避免位置偏移）
    const scanResult = await this.scanContent(content);
    const sortedMatches = scanResult.matches.sort((a, b) => b.position - a.position);

    for (const match of sortedMatches) {
      if (match.replacement) {
        // 替换
        const before = replacedContent.substring(0, match.position);
        const after = replacedContent.substring(match.position + match.word.length);

        replacedContent = before + match.replacement + after;

        replacements.push({
          original: match.word,
          replacement: match.replacement,
        });

        replacementCount++;
      }
    }

    return {
      replacedContent,
      replacementCount,
      replacements,
    };
  }

  /**
   * 检查是否可以安全发布
   */
  async isSafeToPublish(content: string): Promise<{
    safe: boolean;
    reason?: string;
    matches?: SensitiveMatch[];
  }> {
    const scanResult = await this.scanContent(content);

    if (!scanResult.hasSensitiveWords) {
      return { safe: true };
    }

    if (scanResult.riskLevel === 'high') {
      return {
        safe: false,
        reason: '包含高风险敏感词，不建议发布',
        matches: scanResult.matches,
      };
    }

    // 中低风险，检查是否可以替换
    const hasUnreplaceable = scanResult.matches.some((m) => !m.replacement);

    if (hasUnreplaceable) {
      return {
        safe: false,
        reason: '包含无法替换的敏感词，建议重新生成',
        matches: scanResult.matches.filter((m) => !m.replacement),
      };
    }

    return {
      safe: true,
      reason: '可以通过自动替换处理',
      matches: scanResult.matches,
    };
  }
}

// ============================================================================
// 导出单例
// ============================================================================

export const sensitiveWordFilter = new SensitiveWordFilter();
