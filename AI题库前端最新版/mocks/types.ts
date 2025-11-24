// 统一的 TypeScript 接口定义

export type IngestTaskStatus = "uploading" | "queued" | "parsing" | "completed" | "failed"

export interface IngestTask {
  id: string
  status: IngestTaskStatus
  fileName: string
  fileSize: number
  uploadedAt: string
  progress: number
  totalQuestions: number
  parsedQuestions: number
  questions?: ParsedQuestion[]
  error?: string
}

export interface ImageBlock {
  id: string
  url: string
  width: number
  height: number
  blockIndex: number
  isUsed: boolean
  caption?: string
}

export interface OCRRegion {
  id: string
  text: string
  confidence: number
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface ParsedQuestion {
  id: string
  content: string
  options?: string[]
  answer?: string
  explanation?: string
  images?: ImageBlock[]
  ocrRegions?: OCRRegion[]
  confidence: number
  tags?: QuestionTag[]
  aiSuggestedTags?: QuestionTag[]
  metadata: {
    source: string
    pageNumber: number
    uploadTaskId: string
    parsedAt: string
  }
}

export interface QuestionTag {
  id: string
  category: "source" | "textbook" | "semester" | "knowledge" | "difficulty" | "thinking"
  value: string
  label: string
}

export interface MockAPIConfig {
  uploadDelay: number
  parseSpeed: number
  failureRate: number
  questionCount: number
}
