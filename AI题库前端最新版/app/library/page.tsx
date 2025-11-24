import { QuestionLibrary } from '@/components/question-library'
import { StepIndicator } from '@/components/step-indicator'
import { TopNav } from '@/components/top-nav'

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-gray-600">检索、管理和导出题目</p>
        </div>
        {/* </CHANGE> */}

        <StepIndicator currentStep={4} />

        <div className="mt-8">
          <QuestionLibrary />
        </div>
      </div>
    </div>
  )
}
