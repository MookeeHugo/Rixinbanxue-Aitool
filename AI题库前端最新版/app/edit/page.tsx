import { QuestionEditor } from '@/components/question-editor'
import { StepIndicator } from '@/components/step-indicator'
import { TopNav } from '@/components/top-nav'

export default function EditPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">编辑题目与标签</h1>
          <p className="mt-2 text-gray-600">为题目添加标签，便于后续检索和管理</p>
        </div>

        <StepIndicator currentStep={3} />

        <div className="mt-8">
          <QuestionEditor />
        </div>
      </div>
    </div>
  )
}
