'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { QuestionCard } from '@/components/question-card'
import { QuestionEditDialog } from '@/components/question-edit-dialog'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Mock data for demonstration
const mockQuestions = [
  {
    id: '1',
    type: 'choice',
    content: '若集合 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，则满足条件 A ⊆ C ⊆ B 的集合 C 的个数为',
    options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
    answer: 'D',
    difficulty: 'medium',
    hasImage: false,
  },
  {
    id: '2',
    type: 'choice',
    content: '已知函数 f(x) = sin(ωx + φ) (ω > 0, |φ| < π/2) 的最小正周期为 π，且其图象关于直线 x = π/3 对称，则',
    options: [
      'A. y = f(x) 的图象关于点 (π/4, 0) 对称',
      'B. y = f(x) 的图象关于点 (5π/12, 0) 对称',
      'C. y = f(x) 在区间 (0, π/6) 上单调递增',
      'D. y = f(x) 在区间 (π/6, π/3) 上单调递减',
    ],
    answer: 'B',
    difficulty: 'hard',
    hasImage: true,
    imageUrl: '/sine-function-graph.jpg',
  },
  {
    id: '3',
    type: 'fill',
    content: '已知向量 a = (1, 2)，b = (x, 1)，若 a + 2b 与 2a - b 平行，则 x = ______。',
    answer: '1/2',
    difficulty: 'easy',
    hasImage: false,
  },
  {
    id: '4',
    type: 'solve',
    content: '已知数列 {aₙ} 的前 n 项和为 Sₙ，且 Sₙ = 2aₙ - 2。\n(1) 求数列 {aₙ} 的通项公式；\n(2) 设 bₙ = log₂(aₙ)，求数列 {bₙ} 的前 n 项和 Tₙ。',
    answer: '(1) aₙ = 2ⁿ\n(2) Tₙ = n(n+1)/2',
    difficulty: 'hard',
    hasImage: false,
  },
]

export function ParsedQuestions() {
  const router = useRouter()
  const [questions, setQuestions] = useState(mockQuestions)
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(
    mockQuestions.map((q) => q.id)
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<typeof mockQuestions[0] | null>(null)

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    )
  }

  const handleEditQuestion = (question: typeof mockQuestions[0]) => {
    setEditingQuestion(question)
  }

  const handleSaveQuestion = (updatedQuestion: typeof mockQuestions[0]) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    )
    setEditingQuestion(null)
  }

  const handleContinue = async () => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    router.push('/edit')
  }

  const handleReparse = () => {
    console.log('Re-parsing all questions...')
  }

  const handleReparseQuestion = (questionId: string) => {
    console.log('Re-parsing question:', questionId)
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">解析完成</h3>
              <p className="text-sm text-gray-600">
                共识别 {questions.length} 道题目，已选择 {selectedQuestions.length} 道
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleReparse} className="border-gray-300">
            全部重新解析
          </Button>
        </div>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index + 1}
            isSelected={selectedQuestions.includes(question.id)}
            onToggle={() => toggleQuestion(question.id)}
            onEdit={() => handleEditQuestion(question)}
            onReparse={() => handleReparseQuestion(question.id)} // 传递单题重新解析回调
          />
        ))}
      </div>

      {/* Action Buttons */}
      <Card className="p-6 shadow-md sticky bottom-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4" />
            <span>请检查题目内容是否正确，可以编辑或取消选择不需要的题目</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/upload')} className="border-gray-300">
              返回上传
            </Button>
            <Button
              onClick={handleContinue}
              disabled={selectedQuestions.length === 0 || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                `继续编辑标签 (${selectedQuestions.length})`
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      {editingQuestion && (
        <QuestionEditDialog
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}
    </div>
  )
}
