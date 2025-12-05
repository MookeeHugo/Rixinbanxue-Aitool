"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Plus,
  X,
  CheckCircle,
  Search,
  FileText,
  BookOpen,
  Calendar,
  Brain,
  Lightbulb,
  BarChart3,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StickyTagBarProps {
  currentQuestionIndex: number
  totalQuestions: number
  onAddTag: (tag: { category: string; value: string }) => void
  onRemoveTag: (tag: { category: string; value: string }) => void
  currentTags: { category: string; value: string }[]
  onSelectQuestion: (index: number) => void
  onSubmitCurrent: () => void
}

const tagCategories = [
  {
    id: "custom",
    label: "自定义编辑",
    icon: Plus,
    children: [],
  },
  {
    id: "source",
    label: "题目来源",
    icon: FileText,
    children: ["课后改编题", "联考真题", "校内真题", "优质改编题", "优质原创题"],
  },
  {
    id: "textbook",
    label: "教材版本",
    icon: BookOpen,
    children: ["人教版", "北师大版", "苏教版"],
  },
  {
    id: "semester",
    label: "学期阶段",
    icon: Calendar,
    children: ["春季", "春季期中", "春季期末", "秋季", "秋季期中", "秋季期末"],
  },
  {
    id: "knowledge",
    label: "知识点",
    icon: Brain,
    children: ["集合", "函数", "三角函数", "向量", "数列", "不等式", "立体几何", "解析几何", "概率统计"],
  },
  {
    id: "thinking",
    label: "思维方法",
    icon: Lightbulb,
    children: ["分析法", "综合法", "反证法", "数形结合", "分类讨论", "等价转化"],
  },
  {
    id: "difficulty",
    label: "难易程度",
    icon: BarChart3,
    children: ["简单", "中等", "困难", "挑战"],
  },
]

export function StickyTagBar({
  currentQuestionIndex,
  totalQuestions,
  onAddTag,
  onRemoveTag,
  currentTags,
  onSelectQuestion,
  onSubmitCurrent,
}: StickyTagBarProps) {
  const [isSticky, setIsSticky] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [customInput, setCustomInput] = useState("")
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 300)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (searchQuery.trim().length > 0 && selectedCategory) {
      const category = tagCategories.find((cat) => cat.id === selectedCategory)
      if (category) {
        const filtered = category.children.filter((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        setSuggestedTags(filtered)
      }
    } else if (customInput.trim().length > 0) {
      const allTags = tagCategories.flatMap((cat) => cat.children)
      const filtered = allTags.filter((tag) => tag.toLowerCase().includes(customInput.toLowerCase()))
      setSuggestedTags(filtered.slice(0, 5))
    } else {
      setSuggestedTags([])
    }
  }, [customInput, searchQuery, selectedCategory])

  const handleTagClick = (categoryId: string, value: string) => {
    const existingTag = currentTags.find((t) => t.category === categoryId && t.value === value)
    if (existingTag) {
      onRemoveTag({ category: categoryId, value })
    } else {
      onAddTag({ category: categoryId, value })
    }
  }

  const handleAddCustomTag = () => {
    if (customInput.trim()) {
      onAddTag({ category: "custom", value: customInput.trim() })
      setCustomInput("")
      setSuggestedTags([])
    }
  }

  const isTagAdded = (categoryId: string, value: string) => {
    return currentTags.some((t) => t.category === categoryId && t.value === value)
  }

  return (
    <>
      <div
        className={cn(
          "transition-all duration-300 z-50 bg-white",
          isSticky ? "fixed top-[57px] left-0 right-0 shadow-xl" : "relative",
        )}
      >
        <Card className={cn("border-b bg-white", isSticky ? "rounded-none border-x-0 border-t-0" : "shadow-md")}>
          <div className="max-w-7xl mx-auto px-6 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">正在编辑第 {currentQuestionIndex + 1} 题</span>
                  {currentTags.length === 0 && (
                    <span className="text-sm font-medium text-orange-600">👉 请点击下方标签添加</span>
                  )}
                </div>
                {currentTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {currentTags.map((tag, idx) => (
                      <Badge
                        key={idx}
                        className="bg-blue-600 text-white pl-2 pr-1 cursor-pointer hover:bg-blue-700 transition-all text-xs h-6"
                        onClick={() => onRemoveTag(tag)}
                      >
                        {tag.value}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={onSubmitCurrent}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white h-8 px-4"
              >
                <CheckCircle className="mr-1.5 h-4 w-4" />
                提交当前题目
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={selectedCategory ? "搜索子标签..." : "输入自定义标签或搜索..."}
                value={selectedCategory ? searchQuery : customInput}
                onChange={(e) => {
                  if (selectedCategory) {
                    setSearchQuery(e.target.value)
                  } else {
                    setCustomInput(e.target.value)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !selectedCategory) {
                    handleAddCustomTag()
                  }
                }}
                className="h-8 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all pl-9 pr-20 text-sm"
              />
              {!selectedCategory && (
                <Button
                  size="sm"
                  onClick={handleAddCustomTag}
                  disabled={!customInput.trim()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2.5 bg-blue-600 hover:bg-blue-700 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  添加
                </Button>
              )}

              {suggestedTags.length > 0 && !selectedCategory && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-md shadow-lg border border-gray-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="text-xs text-gray-500 mb-1.5">建议标签：</div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all text-xs h-6"
                        onClick={() => {
                          onAddTag({ category: "custom", value: tag })
                          setCustomInput("")
                          setSuggestedTags([])
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
              {tagCategories.map((category) => {
                const isActive = selectedCategory === category.id
                const Icon = category.icon

                return (
                  <Button
                    key={category.id}
                    variant="outline"
                    onClick={() => {
                      if (category.id === "custom") {
                        return
                      }
                      setSelectedCategory(isActive ? null : category.id)
                    }}
                    className={cn(
                      "h-8 px-3 border-2 transition-all duration-200 whitespace-nowrap flex-shrink-0 text-sm",
                      category.id === "custom"
                        ? "border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100"
                        : isActive
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-md scale-105"
                          : "border-gray-300 hover:border-blue-400 hover:bg-blue-50",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {category.label}
                    {category.id !== "custom" && (
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 ml-1 transition-transform duration-200", isActive && "rotate-180")}
                      />
                    )}
                  </Button>
                )
              })}
            </div>

            {selectedCategory && selectedCategory !== "custom" && (
              <div className="pt-1.5 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-wrap gap-1.5">
                  {(searchQuery
                    ? suggestedTags
                    : tagCategories.find((cat) => cat.id === selectedCategory)?.children || []
                  ).map((childTag) => {
                    const isAdded = isTagAdded(selectedCategory, childTag)
                    return (
                      <Badge
                        key={childTag}
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-all text-xs h-7 px-2.5",
                          isAdded
                            ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                            : "hover:bg-blue-50 hover:border-blue-400",
                        )}
                        onClick={() => handleTagClick(selectedCategory, childTag)}
                      >
                        {childTag}
                      </Badge>
                    )
                  })}
                  {searchQuery && suggestedTags.length === 0 && (
                    <div className="text-sm text-gray-500 py-2">未找到匹配的标签</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {isSticky && <div className="h-[120px]" />}
    </>
  )
}
