import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const path = require('path');
const { resolve, basename } = path;
const { config } = require('dotenv');
const fsModule = require('fs');
const { promises: fs } = fsModule;
const { randomUUID } = require('crypto');

config({ path: resolve(process.cwd(), '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const { uploadFile, FileAccessLevel } = require('@/lib/storage');
const {
  generateFileKey,
  normalizeFileName,
  guessImageMimeType
} = require('@/lib/ai-question-bank/utils');
const { processUploadTask } = require('@/lib/ai-question-bank/process-upload');

const DEFAULT_TEST_EMAIL = 'teacher@test.com';
const SAMPLE_FILE_PATH = resolve(process.cwd(), 'tmp', 'sample-upload.jpg');

console.log('[ingest-test] start');
const markerPath = resolve(process.cwd(), 'tmp', 'ingest-script-ran.txt');
fsModule.writeFileSync(markerPath, `[${new Date().toISOString()}] script entry\n`, { encoding: 'utf8' });

function assertEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`缺少必要环境变量：${key}`);
  }
  return value;
}

async function resolveUserId(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (error || !data) {
    throw new Error(`无法获取 ${email} 的用户 ID：${error?.message ?? '未知错误'}`);
  }

  return data.id;
}

async function main() {
  const supabaseUrl = assertEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = assertEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as SupabaseClient<Database>;

  const userEmail = process.env.INGEST_TEST_USER_EMAIL || DEFAULT_TEST_EMAIL;
  const userId =
    process.env.INGEST_TEST_USER_ID || (await resolveUserId(supabase, userEmail));

  console.log('👉 使用账号', { email: userEmail, userId });

  console.log('📁 读取样例文件', SAMPLE_FILE_PATH);
  const fileBuffer = await fs.readFile(SAMPLE_FILE_PATH);
  const originalFileName = basename(SAMPLE_FILE_PATH);
  const normalizedFileName = normalizeFileName(originalFileName) || originalFileName;
  const storageKey = generateFileKey(userId, normalizedFileName);
  const contentType = guessImageMimeType(normalizedFileName);

  console.log('☁️ 上传到存储', { storageKey, contentType });
  const uploadResult = await uploadFile({
    file: fileBuffer,
    key: storageKey,
    accessLevel: FileAccessLevel.PRIVATE,
    contentType
  });

  if (!uploadResult.success || !uploadResult.key) {
    throw new Error(`上传失败：${uploadResult.error ?? '未知错误'}`);
  }

  console.log('🗃️ 创建 upload_tasks 记录');
  const { data: taskRecord, error: insertError } = await supabase
    .from('upload_tasks')
    .insert({
      user_id: userId,
      file_name: normalizedFileName,
      file_url: uploadResult.key,
      status: 'pending',
      progress: 0
    })
    .select('id, trace_id')
    .single();

  if (insertError || !taskRecord) {
    throw new Error(`写入 upload_tasks 失败：${insertError?.message ?? '未知错误'}`);
  }

  const traceId = taskRecord.trace_id || randomUUID();
  if (!taskRecord.trace_id) {
    await supabase
      .from('upload_tasks')
      .update({ trace_id: traceId })
      .eq('id', taskRecord.id);
  }

  console.log('⚙️ 执行 processUploadTask', {
    taskId: taskRecord.id,
    traceId,
    storageKey: uploadResult.key
  });

  let processingError: unknown = null;

  try {
    await processUploadTask({
      taskId: taskRecord.id,
      userId,
      fileName: normalizedFileName,
      fileUrl: uploadResult.key,
      traceId
    });
  } catch (error) {
    processingError = error;
    console.error('🧨 processUploadTask 抛错', error);
  }

  console.log('🔍 查询处理结果');
  const { data: finalTask, error: finalError } = await supabase
    .from('upload_tasks')
    .select(
      'id, status, progress, total_questions, image_questions, image_success_rate, error_message, ingest_upload_latency_ms, supabase_bandwidth_mb, python_processing_ms'
    )
    .eq('id', taskRecord.id)
    .single();

  if (finalError || !finalTask) {
    throw new Error(`查询 upload_tasks 状态失败：${finalError?.message ?? '未知错误'}`);
  }

  const { count: questionCount } = await supabase
    .from('parsed_questions')
    .select('*', { count: 'exact', head: true })
    .eq('upload_task_id', taskRecord.id);

  console.log(
    finalTask.status === 'completed' ? '✅ 任务完成' : '⚠️ 任务未完成',
    {
      ...finalTask,
      parsed_questions_count: questionCount ?? 0
    }
  );

  if (processingError) {
    throw processingError;
  }
}

main().catch(error => {
  console.error('❌ ingest-test 脚本失败', error);
  process.exit(1);
});
