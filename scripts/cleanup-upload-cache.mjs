#!/usr/bin/env node
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config()
config({ path: '.env.local', override: true })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'question-files'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('缺少 Supabase 环境变量，无法执行清理脚本。')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function deleteParsedQuestions(taskIds) {
  if (!taskIds.length) return
  const { error } = await supabase.from('parsed_questions').delete().in('upload_task_id', taskIds)
  if (error) {
    console.warn('[cleanup] 删除 parsed_questions 失败:', error.message)
  } else {
    console.log(`[cleanup] 已删除 ${taskIds.length} 个任务对应的题目记录`)
  }
}

async function deleteFiles(fileKeys) {
  if (!fileKeys.length) return
  const { error } = await supabase.storage.from(BUCKET).remove(fileKeys)
  if (error) {
    console.warn('[cleanup] 删除上传文件失败:', error.message)
  } else {
    console.log(`[cleanup] 已删除 ${fileKeys.length} 个缓存文件`)
  }
}

async function deleteTasks(taskIds) {
  if (!taskIds.length) return
  const { error } = await supabase.from('upload_tasks').delete().in('id', taskIds)
  if (error) {
    console.error('[cleanup] 删除 upload_tasks 失败:', error.message)
  } else {
    console.log(`[cleanup] 已删除 ${taskIds.length} 条任务记录`)
  }
}

async function main() {
  console.log('[cleanup] 开始清理 upload_tasks 与缓存文件')
  const { data: tasks, error } = await supabase
    .from('upload_tasks')
    .select('id, file_url, status')
    .in('status', ['pending', 'processing'])

  if (error) {
    console.error('[cleanup] 查询任务失败:', error.message)
    process.exit(1)
  }

  if (!tasks || tasks.length === 0) {
    console.log('[cleanup] 没有需要清理的任务')
    return
  }

  const taskIds = tasks.map(task => task.id)
  const fileKeys = tasks
    .map(task => task.file_url)
    .filter((key) => typeof key === 'string' && key.length > 0)

  await deleteParsedQuestions(taskIds)
  await deleteFiles(fileKeys)
  await deleteTasks(taskIds)

  console.log('[cleanup] 清理完成')
}

main().catch((err) => {
  console.error('[cleanup] 脚本执行异常:', err)
  process.exit(1)
})
