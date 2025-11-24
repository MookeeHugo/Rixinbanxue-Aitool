/**
 * Mock API 模拟接口
 * 用于前端开发和测试，后续可直接替换为真实 API 调用
 */

import type { ParsedQuestion } from "@/types/question"

export interface MockUploadResponse {
  taskId: string
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  fileName: string
}

export interface MockTaskResponse {
  taskId: string
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  totalQuestions: number
  errorMessage?: string
  fileName: string
  questions?: ParsedQuestion[] // 添加 questions 字段
}

let mockConfig = {
  uploadDelay: 1000, // 上传延迟（毫秒）
  parseSpeed: 2000, // 每道题解析时间（毫秒）
  failureProbability: 0, // 失败概率 0-1
  questionCount: 3, // 模拟题目数量
}

export function setMockConfig(config: Partial<typeof mockConfig>) {
  mockConfig = { ...mockConfig, ...config }
}

export function getMockConfig() {
  return { ...mockConfig }
}

/**
 * Mock 上传文件
 */
export async function mockUpload(file: File): Promise<MockUploadResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const taskId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const shouldFail = Math.random() < mockConfig.failureProbability

      resolve({
        taskId,
        status: shouldFail ? "failed" : "pending",
        progress: 0,
        fileName: file.name,
      })
    }, mockConfig.uploadDelay)
  })
}

/**
 * Mock 获取任务状态
 */
export async function mockFetchTask(taskId: string): Promise<MockTaskResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 从 taskId 提取创建时间，模拟进度
      const timestamp = Number.parseInt(taskId.split("-")[1])
      const elapsed = Date.now() - timestamp
      const totalTime = mockConfig.parseSpeed * mockConfig.questionCount

      let status: MockTaskResponse["status"] = "processing"
      let progress = Math.min((elapsed / totalTime) * 100, 100)

      if (progress >= 100) {
        status = "completed"
        progress = 100
      } else if (Math.random() < mockConfig.failureProbability) {
        status = "failed"
      }

      resolve({
        taskId,
        status,
        progress: Math.round(progress),
        totalQuestions: mockConfig.questionCount,
        errorMessage: status === "failed" ? "解析失败：OCR 识别异常" : undefined,
        fileName: "数学试卷.pdf",
      })
    }, 500)
  })
}

/**
 * Mock 获取解析后的题目
 */
export async function mockFetchParsedQuestions(taskId: string): Promise<ParsedQuestion[]> {
  const { mockAdvancedQuestionData } = await import("./mock-data")

  return new Promise((resolve) => {
    setTimeout(() => {
      const questions = mockAdvancedQuestionData.slice(0, mockConfig.questionCount).map((q, index) => ({
        id: `${taskId}-q${index + 1}`,
        uploadTaskId: taskId,
        type: q.type,
        content: q.content,
        options: q.options,
        answer: q.answer,
        difficulty: q.difficulty,
        source: q.source,
        tags: q.tags || [],
        images: q.images || [],
        confidenceScore: q.confidence,
        isSelected: true,
        isSubmitted: false,
        createdAt: new Date().toISOString(),
      }))

      console.log("[v0] mockFetchParsedQuestions returning:", questions)
      resolve(questions)
    }, 800)
  })
}

/**
 * Mock 重新解析单个题目
 */
export async function mockReparseQuestion(questionId: string): Promise<ParsedQuestion> {
  const { mockAdvancedQuestionData } = await import("./mock-data")

  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData = mockAdvancedQuestionData[0]

      resolve({
        id: questionId,
        uploadTaskId: "reparse",
        type: mockData.type,
        content: mockData.content,
        options: mockData.options,
        answer: mockData.answer,
        difficulty: mockData.difficulty,
        source: mockData.source,
        tags: mockData.tags || [],
        images: mockData.images || [],
        confidenceScore: Math.random() * 0.2 + 0.8, // 0.8-1.0
        isSelected: true,
        isSubmitted: false,
        createdAt: new Date().toISOString(),
      })
    }, 3000)
  })
}

/**
 * Mock 重新解析任务
 */
export async function mockReparseTask(oldTaskId: string): Promise<MockTaskResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  // 生成新的 Task ID，模拟重新开始
  const newTaskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // 可以在这里复用旧任务的文件名等信息，但为了简单，我们假设它是一个新任务
  // 实际后端会重置任务状态

  return {
    taskId: newTaskId,
    status: "pending" as const,
    progress: 0,
    totalQuestions: mockConfig.questionCount,
    fileName: "reparsed_file.pdf", // 简化处理
    createdAt: Date.now(),
  }
}

export const mockAPI = {
  uploadSingleFile: async (formData: FormData): Promise<{ success: boolean; fileId: string }> => {
    await new Promise((resolve) => setTimeout(resolve, mockConfig.uploadDelay + Math.random() * 1000))

    const shouldFail = Math.random() < mockConfig.failureProbability
    if (shouldFail) {
      throw new Error("上传失败：网络异常")
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    console.log("[v0] File uploaded successfully:", fileId)

    return {
      success: true,
      fileId,
    }
  },

  createParseTask: async (fileNames: string[]) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const shouldFail = Math.random() < mockConfig.failureProbability
    if (shouldFail) {
      throw new Error("创建任务失败：服务器异常")
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    console.log("[v0] Parse task created:", taskId, "for files:", fileNames)

    return {
      taskId,
      status: "pending" as const,
      progress: 0,
      totalQuestions: mockConfig.questionCount,
      fileName: fileNames[0] || "unknown.pdf",
      createdAt: Date.now(),
      questions: [], // 初始化空题目数组
    }
  },

  uploadFiles: async (fileNames: string[]) => {
    return await mockAPI.createParseTask(fileNames)
  },

  getTask: async (taskId: string) => {
    return await mockFetchTask(taskId)
  },

  getQuestions: async (taskId: string) => {
    return await mockFetchParsedQuestions(taskId)
  },

  reparseQuestion: async (questionId: string) => {
    return await mockReparseQuestion(questionId)
  },

  reparseTask: async (oldTaskId: string) => {
    return await mockReparseTask(oldTaskId)
  },
}
