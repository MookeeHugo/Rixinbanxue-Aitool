'use client'

import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Edit3, Library, Upload } from 'lucide-react'

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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <DialogTitle className="text-2xl">收录成功</DialogTitle>
          <p className="text-sm text-slate-500">
            已成功将 <span className="font-semibold text-emerald-600">{count}</span> 道题目整理进题库。
          </p>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Button className="w-full bg-sky-600 text-white hover:bg-sky-500" onClick={handleViewLibrary}>
            <Library className="mr-2 h-4 w-4" />
            查看题库
          </Button>
          <Button variant="outline" className="w-full" onClick={handleContinueUpload}>
            <Upload className="mr-2 h-4 w-4" />
            继续上传文件
          </Button>
          <Button variant="ghost" className="w-full text-slate-600 hover:text-slate-900" onClick={onClose}>
            <Edit3 className="mr-2 h-4 w-4" />
            留在标注台
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
