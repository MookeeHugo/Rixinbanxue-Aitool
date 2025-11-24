'use client'

import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, Library, Upload, Edit } from 'lucide-react'

interface SubmissionSuccessDialogProps {
  count: number
  onClose: () => void
}

export function SubmissionSuccessDialog({ count, onClose }: SubmissionSuccessDialogProps) {
  const router = useRouter()

  const handleViewLibrary = () => {
    router.push('/library')
  }

  const handleContinueUpload = () => {
    router.push('/upload')
  }

  const handleContinueEdit = () => {
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 animate-bounce">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl">收录成功</DialogTitle>
            <p className="text-gray-600">
              已成功将 <span className="font-bold text-green-600">{count}</span> 道题目收录到题库
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <Button
            onClick={handleViewLibrary}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base shadow-lg shadow-blue-600/30"
          >
            <Library className="mr-2 h-5 w-5" />
            查看题库
          </Button>

          <Button
            onClick={handleContinueUpload}
            variant="outline"
            className="w-full h-12 text-base border-gray-300"
          >
            <Upload className="mr-2 h-5 w-5" />
            继续上传文件
          </Button>

          <Button
            onClick={handleContinueEdit}
            variant="ghost"
            className="w-full h-12 text-base text-gray-600 hover:text-gray-900"
          >
            <Edit className="mr-2 h-5 w-5" />
            继续编辑标签
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
