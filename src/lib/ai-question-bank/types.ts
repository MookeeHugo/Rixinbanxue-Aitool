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
 * 图片区域坐标（题目配图在原图中的位置）
 */
export interface ImageRegion {
  /** 左上角X坐标（像素） */
  x: number;
  /** 左上角Y坐标（像素） */
  y: number;
  /** 宽度（像素） */
  width: number;
  /** 高度（像素） */
  height: number;
}

/**
 * AI解析的题目（来自Qwen3-VL-Flash）
 */
/**
 * 题目图片占位符（Gemini 提供的 metadata）
 */
export interface QuestionImagePlaceholder {
  placeholder: string;
  description?: string;
  position?: string;
}

/**
 * 题目图片资源（真实裁剪后上传的配图）
 */
export interface QuestionImageAsset {
  id: string;
  url: string;
  key?: string | null;
  questionNumber?: string;
  order?: number;
  placeholder?: string | null;
  used?: boolean;
  /** 裁剪时使用的图像区域 */
  region?: ImageRegion;
}

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
  /** 配图区域（如果题目有配图，AI会输出其在原图中的位置） */
  image_region?: ImageRegion;
  /** 支持多图场景的配图数组 */
  image_regions?: ImageRegion[];
  images?: QuestionImagePlaceholder[];
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
  image_questions?: number | null;
  image_success_rate?: number | null;
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
  /** 是否在审核界面被选中 */
  is_selected: boolean;
  /** 是否已经提交到正式题库 */
  is_submitted: boolean;
  /** 原始整页图片的 URL（用于对照） */
  original_image_url?: string;
  /** 主配图（question_image_url 字段） */
  question_image_url?: string | null;
  /** AI 返回的图片占位符列表 */
  image_placeholders?: QuestionImagePlaceholder[] | null;
  /** 实际裁剪后的图片资源 */
  image_assets?: QuestionImageAsset[] | null;
  /** 未做占位符替换的原始内容 */
  raw_content?: string | null;
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
