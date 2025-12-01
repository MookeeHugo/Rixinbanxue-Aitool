/**
 * AI题库系统 - 统一导出
 * @description 提供所有公共API和类型的便捷导入
 */

// 类型定义
export type {
  QuestionType,
  DifficultyLevel,
  TaskStatus,
  ReparseStatus,
  QuestionTag,
  ParsedQuestion,
  QuestionData,
  QwenParseResult,
  GeminiQuestion,
  GeminiImageRegion,
  GeminiParseResult,
  GeminiValidationResult,
  UploadTask,
  ParsedQuestionRecord,
  QuestionImageAsset,
  QuestionImagePlaceholder,
  QwenFlashConfig,
  ActionResult,
  UploadResult,
  BatchSubmitRequest
} from './types';

// Zod验证模式
export {
  QuestionTypeSchema,
  DifficultyLevelSchema,
  QuestionTagSchema,
  ParsedQuestionSchema,
  QwenParseResultSchema,
  FileUploadSchema,
  BatchSubmitSchema,
  TaskStatusUpdateSchema,
  QuestionEditSchema
} from './schemas';

// Qwen API客户端
export {
  parseQuestions,
  parseQuestionsFromPages,
  estimateCost,
  checkAPIConnection
} from './qwen-flash';

// 工具函数
export {
  fileToBase64,
  bufferToBase64,
  formatFileSize,
  generateFileKey,
  normalizeFileName,
  isImageFile,
  isPdfFile,
  guessImageMimeType,
  calculateAverageConfidence,
  filterLowConfidenceQuestions,
  formatProgress,
  delay,
  retryWithBackoff
} from './utils';

// Prompt模板
export {
  QWEN_SYSTEM_PROMPT,
  QWEN_USER_PROMPT,
  QWEN_RECHECK_PROMPT,
  getQwenPromptMessages
} from './prompts';

// Server Actions
export {
  uploadQuestionFile,
  getTaskStatus,
  getTaskQuestions,
  submitQuestions,
  updateQuestion,
  deleteQuestion,
  manualCropQuestionImage
} from '@/app/actions/question-upload';

// Reparse Actions
export {
  initiateReparse,
  getReparseStatus,
  cancelReparse,
  getQuestionForReparse
} from '@/app/actions/reparse-question';
export type { ReparseStatusResponse } from '@/app/actions/reparse-question';
