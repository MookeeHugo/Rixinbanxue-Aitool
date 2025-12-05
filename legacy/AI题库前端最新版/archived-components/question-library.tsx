"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { QuestionLibraryCard } from "@/components/question-library-card"
import { LibraryFilters } from "@/components/library-filters"
import { LibraryStats } from "@/components/library-stats"
import { Search, Filter, Download, Trash2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"

// Mock data
const mockQuestions = [
  {
    id: "1",
    type: "choice" as const,
    content: "若集合 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，则满足条件 A ⊆ C ⊆ B 的集合 C 的个数为",
    answer: "D",
    tags: [
      { category: "knowledge", value: "集合" },
      { category: "difficulty", value: "中等" },
      { category: "grade", value: "高一" },
    ],
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    type: "choice" as const,
    content: "已知函数 f(x) = sin(ωx + φ) (ω > 0, |φ| < π/2) 的最小正周期为 π，且其图象关于直线 x = π/3 对称",
    answer: "B",
    tags: [
      { category: "knowledge", value: "三角函数" },
      { category: "difficulty", value: "困难" },
      { category: "grade", value: "高二" },
    ],
    createdAt: "2024-01-14",
  },
  {
    id: "3",
    type: "fill" as const,
    content: "已知向量 a = (1, 2)，b = (x, 1)，若 a + 2b 与 2a - b 平行，则 x = ______。",
    answer: "1/2",
    tags: [
      { category: "knowledge", value: "向量" },
      { category: "difficulty", value: "简单" },
      { category: "grade", value: "高一" },
    ],
    createdAt: "2024-01-13",
  },
  {
    id: "4",
    type: "solve" as const,
    content: "已知数列 {aₙ} 的前 n 项和为 Sₙ，且 Sₙ = 2aₙ - 2。",
    answer: "(1) aₙ = 2ⁿ\n(2) Tₙ = n(n+1)/2",
    tags: [
      { category: "knowledge", value: "数列" },
      { category: "difficulty", value: "困难" },
      { category: "grade", value: "高二" },
    ],
    createdAt: "2024-01-12",
  },
]

export function QuestionLibrary() {
  const router = useRouter()
  const { questions: storeQuestions, setQuestions } = useAppStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])

  const questions = storeQuestions && storeQuestions.length > 0 ? storeQuestions : mockQuestions

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) => (prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    if (selectedQuestions.length === questions.length) {
      setSelectedQuestions([])
    } else {
      setSelectedQuestions(questions.map((q) => q.id))
    }
  }

  const handleExport = () => {
    console.log("Exporting questions:", selectedQuestions)
    // Export logic here
  }

  const handleDelete = () => {
    if (confirm(`确定要删除选中的 ${selectedQuestions.length} 道题目吗？`)) {
      setQuestions((prev) => prev.filter((q) => !selectedQuestions.includes(q.id)))
      setSelectedQuestions([])
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats */}
      <LibraryStats totalQuestions={questions.length} />

      {/* Search and Actions */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="搜索题目内容、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn("w-full sm:w-auto", showFilters && "bg-primary-light border-primary text-primary")}
            >
              <Filter className="mr-2 h-4 w-4" />
              筛选
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => router.push("/upload")} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              新增题目
            </Button>
            {selectedQuestions.length > 0 && (
              <>
                <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto bg-transparent">
                  <Download className="mr-2 h-4 w-4" />
                  导出 ({selectedQuestions.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="w-full sm:w-auto text-error hover:bg-error/10 hover:text-error bg-transparent"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </Button>
              </>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <LibraryFilters />
          </div>
        )}
      </Card>

      {/* Bulk Selection */}
      {questions.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Button variant="ghost" size="sm" onClick={toggleAll} className="h-8">
            {selectedQuestions.length === questions.length ? "取消全选" : "全选"}
          </Button>
          {selectedQuestions.length > 0 && <span>已选择 {selectedQuestions.length} 道题目</span>}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question) => (
          <QuestionLibraryCard
            key={question.id}
            question={question}
            isSelected={selectedQuestions.includes(question.id)}
            onToggle={() => toggleQuestion(question.id)}
          />
        ))}
      </div>

      {questions.length === 0 && (
        <EmptyState type="empty" actionLabel="新增题目" onAction={() => router.push("/upload")} />
      )}
    </div>
  )
}
