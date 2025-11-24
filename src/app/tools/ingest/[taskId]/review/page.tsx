import { notFound, redirect } from 'next/navigation'
import type { ParsedQuestionRecord, UploadTask } from '@/lib/ai-question-bank'
import {
  getTaskQuestions,
  getTaskStatus
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

  return <ClientReviewPage task={task} initialQuestions={questions} />
}
