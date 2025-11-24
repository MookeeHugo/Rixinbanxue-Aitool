import { redirect } from 'next/navigation'
import { getQuestions } from '@/app/actions/question-upload'
import { ClientLibraryPage } from './client-page'

export default async function LibraryPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const result = await getQuestions({
    type: searchParams.type as string | undefined,
    difficulty: searchParams.difficulty as string | undefined,
    search: searchParams.search as string | undefined,
    limit: 20,
    offset: 0
  })

  if (!result.success) {
    if (result.error?.includes('未登录')) {
      redirect('/login')
    }
    // 显示错误
    return (
      <div className="container mx-auto py-8">
        <div className="text-red-600">加载失败: {result.error}</div>
      </div>
    )
  }

  return (
    <ClientLibraryPage
      initialQuestions={result.data?.questions || []}
      initialTotal={result.data?.total || 0}
    />
  )
}
