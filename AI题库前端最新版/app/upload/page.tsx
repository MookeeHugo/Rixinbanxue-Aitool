import { FileUpload } from "@/components/file-upload"
import { StepIndicator } from "@/components/step-indicator"
import { TopNav } from "@/components/top-nav"

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-gray-600">上传试卷文件，系统将自动解析并切分题目</p>
        </div>
        {/* </CHANGE> */}

        <StepIndicator currentStep={1} />

        <div className="mt-8">
          <FileUpload />
        </div>
      </div>
    </div>
  )
}
