'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { QuestionInLibrary } from '@/app/actions/question-upload'

interface ClientLibraryPageProps {
  initialQuestions: QuestionInLibrary[]
  initialTotal: number
}

const TYPE_LABELS: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  essay: '解答题'
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
}

function renderQuestionContent(content: string) {
  return (
    <div
      className="prose prose-sm prose-slate dark:prose-invert max-w-none line-clamp-3"
      dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
    />
  )
}

export function ClientLibraryPage({ initialQuestions, initialTotal }: ClientLibraryPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchText, setSearchText] = useState(searchParams.get('search') || '')

  const currentType = searchParams.get('type') || ''
  const currentDifficulty = searchParams.get('difficulty') || ''

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchText) {
      params.set('search', searchText)
    } else {
      params.delete('search')
    }
    router.push(`/library?${params.toString()}`)
  }

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set('type', value)
    } else {
      params.delete('type')
    }
    router.push(`/library?${params.toString()}`)
  }

  const handleDifficultyChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set('difficulty', value)
    } else {
      params.delete('difficulty')
    }
    router.push(`/library?${params.toString()}`)
  }

  const handleClearFilters = () => {
    setSearchText('')
    router.push('/library')
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">题库管理</h1>
        <p className="text-muted-foreground">
          共 {initialTotal} 道题目
        </p>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">搜索</label>
              <div className="flex gap-2">
                <Input
                  placeholder="搜索题目内容或答案..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="w-4 h-4 mr-2" />
                  搜索
                </Button>
              </div>
            </div>

            <div className="w-40">
              <label className="text-sm font-medium mb-2 block">题目类型</label>
              <Select value={currentType || 'all'} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="choice">选择题</SelectItem>
                  <SelectItem value="fill">填空题</SelectItem>
                  <SelectItem value="essay">解答题</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <label className="text-sm font-medium mb-2 block">难度</label>
              <Select value={currentDifficulty || 'all'} onValueChange={handleDifficultyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="全部难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部难度</SelectItem>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={handleClearFilters}>
              <Filter className="w-4 h-4 mr-2" />
              清除筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      {initialQuestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无题目，请先上传并解析题目。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {initialQuestions.map((question) => (
            <Card key={question.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge>{TYPE_LABELS[question.type] || question.type}</Badge>
                    <Badge variant="outline">
                      {DIFFICULTY_LABELS[question.difficulty] || question.difficulty}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(question.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">题目：</h3>
                  {renderQuestionContent(question.content)}
                </div>

                {question.options && question.options.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">选项：</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {question.options.map((opt, i) => (
                        <li key={i}>{opt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium mb-2">答案：</h3>
                  <div className="text-sm text-muted-foreground">{question.answer}</div>
                </div>

                {question.knowledge_points.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">知识点：</h3>
                    <div className="flex flex-wrap gap-2">
                      {question.knowledge_points.map((kp, i) => (
                        <Badge variant="outline" key={i}>
                          {kp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
