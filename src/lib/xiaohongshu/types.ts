/**
 * 小红书AI分析和生成模块类型定义
 */

// ============================================================================
// 爆款分析结果
// ============================================================================

export interface ViralAnalysis {
  title_strategy: string;           // 标题策略（如何吸引点击）
  content_structure: string;         // 内容结构（如何组织内容）
  engagement_drivers: string[];      // 互动驱动因素
  target_audience: string;           // 目标受众
  emotional_appeal: string;          // 情感诉求
  call_to_action: string;            // 行动号召
}

// ============================================================================
// 用户人设（Persona）
// ============================================================================

export interface UserPersona {
  id: string;                        // 人设ID
  name: string;                      // 人设名称
  description: string;               // 人设描述
  expertise: string;                 // 专业领域
  years_experience: number;          // 从业年限
  teaching_style: string;            // 教学风格
  tone: string;                      // 语气
}

// ============================================================================
// AI生成的草稿
// ============================================================================

export interface GeneratedDraft {
  title: string;                     // 生成的标题
  content: string;                   // 生成的正文
  tags: string[];                    // 生成的标签
}

// ============================================================================
// 原创性检测结果
// ============================================================================

export interface OriginalityCheckResult {
  passed: boolean;                   // 是否通过检测
  similarity: number;                // 相似度（0-100）
  reason: string;                    // 原因说明
  details?: {
    overall_similarity: number;      // 整体相似度
    max_paragraph_similarity: number; // 最高段落相似度
    suspicious_paragraphs: number;    // 可疑段落数
    vocabulary_diversity: number;     // 词汇多样性
  };
}

// ============================================================================
// AI元数据
// ============================================================================

export interface AIMetadata {
  model: string;                     // 使用的模型
  tokens_used: number;               // 使用的token数
  cost_usd: number;                  // 费用（美元）
  generation_time_ms: number;        // 生成耗时（毫秒）
}
