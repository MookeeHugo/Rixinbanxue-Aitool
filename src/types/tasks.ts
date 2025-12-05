import type { DifficultyLevel, QuestionType } from '@/lib/ai-question-bank/types'

export type TaskStage = 'uploading' | 'parsing' | 'editing' | 'tagging' | 'completed'

export type ParseTaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface WorkflowTag {
  category: string
  value: string
  id?: string
}

export interface ParsedQuestionItem {
  id: string
  type: QuestionType
  content: string
  options?: string[]
  answer: string
  difficulty?: DifficultyLevel
  hasImage?: boolean
  imageUrl?: string
  reparseCount?: number
  uploadTaskId?: string
  confidenceScore?: number
  createdAt?: string
  tags?: WorkflowTag[]
}

export interface ParseTask {
  taskId: string
  status: ParseTaskStatus
  progress: number
  totalQuestions: number
  questions?: ParsedQuestionItem[]
  fileName: string
  errorMessage?: string
  createdAt: number
  stage: TaskStage
  lastActiveAt: number
  isIncomplete: boolean
  isDismissed?: boolean
}
