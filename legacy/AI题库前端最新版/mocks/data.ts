// 模拟数据生成器
import type { ParsedQuestion, ImageBlock, OCRRegion, QuestionTag } from "./types"

export const generateMockImageBlocks = (count: number): ImageBlock[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `img-${Date.now()}-${i}`,
    url: `/placeholder.svg?height=200&width=300&query=math-diagram-${i}`,
    width: 300,
    height: 200,
    blockIndex: i,
    isUsed: false,
  }))
}

export const generateMockOCRRegions = (): OCRRegion[] => {
  return [
    {
      id: "ocr-1",
      text: "若集合 A = {x | x² - 3x + 2 = 0}",
      confidence: 0.95,
      boundingBox: { x: 10, y: 10, width: 200, height: 30 },
    },
    {
      id: "ocr-2",
      text: "B = {x | 0 < x < 5, x ∈ N}",
      confidence: 0.88,
      boundingBox: { x: 10, y: 50, width: 180, height: 30 },
    },
    {
      id: "ocr-3",
      text: "则满足条件 A ⊆ C ⊆ B 的集合 C 的个数为",
      confidence: 0.82,
      boundingBox: { x: 10, y: 90, width: 250, height: 30 },
    },
  ]
}

export const mockQuestionTags: QuestionTag[] = [
  { id: "tag-1", category: "source", value: "entrance_exam", label: "高考真题" },
  { id: "tag-2", category: "textbook", value: "math_a", label: "数学（必修A）" },
  { id: "tag-3", category: "semester", value: "grade_11_1", label: "高二上学期" },
  { id: "tag-4", category: "knowledge", value: "set_theory", label: "集合" },
  { id: "tag-5", category: "difficulty", value: "medium", label: "中等" },
  { id: "tag-6", category: "thinking", value: "logical", label: "逻辑推理" },
]

export const generateMockQuestion = (index: number): ParsedQuestion => {
  return {
    id: `q-${Date.now()}-${index}`,
    content: `若集合 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，则满足条件 A ⊆ C ⊆ B 的集合 C 的个数为`,
    options: ["1", "2", "3", "4"],
    answer: "B",
    explanation: "集合 A = {1, 2}，B = {1, 2, 3, 4}，满足条件的集合 C 有 2 个",
    images: index % 2 === 0 ? generateMockImageBlocks(2) : [],
    ocrRegions: generateMockOCRRegions(),
    confidence: 0.85 + Math.random() * 0.15,
    tags: [],
    aiSuggestedTags: mockQuestionTags.slice(0, 4),
    metadata: {
      source: "test-upload",
      pageNumber: index + 1,
      uploadTaskId: "task-123",
      parsedAt: new Date().toISOString(),
    },
  }
}
