/**
 * AI题库系统 - TypeScript类型定义
 * @description MVP核心类型，支持Qwen3-VL-Flash结构化输出
 */

/**
 * 题目类型枚举
 */
export type QuestionType = 'choice' | 'fill' | 'essay' | 'proof';

/**
 * 难度等级
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 题目标签（AI生成）
 */
export interface QuestionTag {
  /** 知识点列表 */
  knowledge: string[];
  /** 难度等级 */
  difficulty: DifficultyLevel;
  /** 题型描述 */
  type: string;
}

/**
 * AI解析的题目（来自Qwen3-VL-Flash）
 */
export interface ParsedQuestion {
  /** 题号 */
  number: string;
  /** 题目类型 */
  type: QuestionType;
  /** 题目内容（LaTeX格式） */
  content: string;
  /** 选项（仅选择题） */
  options?: string[];
  /** 答案 */
  answer: string;
  /** 标签（AI生成） */
  tags: QuestionTag;
  /** 置信度（0-1） */
  confidence: number;
  /** 解题步骤（可选） */
  steps?: string[];
}

/**
 * Qwen API返回的结果
 */
export interface QwenParseResult {
  questions: ParsedQuestion[];
}

/**
 * 上传任务数据库记录
 */
export interface UploadTask {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  status: TaskStatus;
  progress: number;
  total_questions?: number;
  trace_id: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 解析题目数据库记录
 */
export interface ParsedQuestionRecord extends ParsedQuestion {
  id: string;
  upload_task_id: string;
  /** 是否选中（用于批量提交） */
  is_selected: boolean;
  /** 是否已提交到题库 */
  is_submitted: boolean;
  /** 原始上传图片的URL（用于显示题目原图） */
  original_image_url?: string;
  created_at: string;
}

/**
 * Qwen3-VL-Flash API配置
 */
export interface QwenFlashConfig {
  apiKey: string;
  apiUrl: string;
  model: 'qwen3-vl-flash';
  temperature: number;
  maxTokens: number;
}

/**
 * Server Action返回类型
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 文件上传结果
 */
export interface UploadResult {
  taskId: string;
  traceId: string;
}

/**
 * 批量提交请求
 */
export interface BatchSubmitRequest {
  taskId: string;
  questionIds: string[];
}
