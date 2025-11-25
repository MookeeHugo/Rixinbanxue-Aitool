import { notFound, redirect } from 'next/navigation'
import type { ParsedQuestionRecord, UploadTask } from '@/lib/ai-question-bank'
import {
  getTaskQuestions,
  getTaskStatus,
  generateImageSignedUrls
} from '@/app/actions/question-upload'
import { ClientReviewPage } from './client-page'

interface ReviewPageProps {
  params: {
    taskId: string
  }
}

async function fetchTask(taskId: string): Promise<UploadTask> {
  const taskResult = await getTaskStatus(taskId)
  if (!taskResult.success || !taskResult.data) {
    if (taskResult.error?.includes('登录')) {
      redirect('/login')
    }
    notFound()
  }
  return taskResult.data
}

async function fetchQuestions(taskId: string): Promise<ParsedQuestionRecord[]> {
  const result = await getTaskQuestions(taskId)
  if (!result.success || !result.data) {
    if (result.error?.includes('登录')) {
      redirect('/login')
    }
    return []
  }
  return result.data
}

export default async function TaskReviewPage({ params }: ReviewPageProps) {
  const { taskId } = params
  const [task, questions] = await Promise.all([fetchTask(taskId), fetchQuestions(taskId)])

  // 生成所有图片的签名URL
  const imageUrls: Record<string, string> = {}
  const uniqueImageKeys = [...new Set(questions.map(q => q.original_image_url).filter(Boolean))] as string[]

  console.log('[Review Page] 需要生成签名URL的图片:', {
    taskId,
    imageCount: uniqueImageKeys.length,
    imageKeys: uniqueImageKeys
  })

  if (uniqueImageKeys.length > 0) {
    const urlsResult = await generateImageSignedUrls(uniqueImageKeys)
    if (urlsResult.success && urlsResult.data) {
      Object.assign(imageUrls, urlsResult.data)
      console.log('[Review Page] ✅ 签名URL生成成功:', {
        count: Object.keys(imageUrls).length,
        urls: Object.entries(imageUrls).map(([key, url]) => ({
          key,
          url: url.substring(0, 100) + '...'
        }))
      })
    } else {
      console.error('[Review Page] ❌ 签名URL生成失败:', urlsResult.error)
    }
  }

  return <ClientReviewPage task={task} initialQuestions={questions} imageUrls={imageUrls} />
}
