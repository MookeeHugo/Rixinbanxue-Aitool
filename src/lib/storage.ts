/**
 * 存储服务
 *
 * - 优先使用 Cloudflare R2（公共桶 + 私有桶）
 * - 若未配置 R2，则回退到 Supabase Storage
 * - 统一封装上传、删除、下载、签名地址等操作
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// ========================================
// 环境变量
// ========================================

const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET || 'rixing-public';
const R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET || 'rixing-private';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const CDN_PUBLIC_URL = process.env.CDN_PUBLIC_URL || 'https://cdn.rixing.com';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isR2Configured = !!(
  R2_ENDPOINT &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY
);

let supabaseClient: ReturnType<typeof createClient> | null = null;

if (!isR2Configured && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  logger.info('[Storage Init] 使用 Supabase Storage（未配置 R2）');
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} else if (isR2Configured) {
  logger.info('[Storage Init] 使用 Cloudflare R2');
} else {
  logger.warn('[Storage Init] 未检测到可用的存储配置');
}

const r2Public = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

const r2Private = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

// ========================================
// 类型与常量
// ========================================

export enum FileAccessLevel {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

const MIME_TYPES: Record<string, string> = {
  // 图片
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  ico: 'image/x-icon',

  // 文档
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // 视频
  mp4: 'video/mp4',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',

  // 音频
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',

  // 文本
  txt: 'text/plain',
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
  xml: 'application/xml',

  // 压缩包
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed'
};

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export function classifyFile(key: string): FileAccessLevel {
  const publicPatterns = [
    /^questions\/images\//, // 题目图片
    /^avatars\//, // 用户头像
    /^public-attachments\// // 公开附件
  ];

  for (const pattern of publicPatterns) {
    if (pattern.test(key)) {
      return FileAccessLevel.PUBLIC;
    }
  }

  return FileAccessLevel.PRIVATE;
}

// ========================================
// 上传
// ========================================

interface UploadParams {
  file: Buffer;
  key: string;
  accessLevel?: 'PUBLIC' | 'PRIVATE';
  contentType?: string;
}

interface UploadResult {
  success: boolean;
  key?: string;
  publicUrl?: string;
  cdnUrl?: string;
  needsSignedUrl?: boolean;
  error?: string;
}

export async function uploadFile(params: UploadParams): Promise<UploadResult> {
  const { file, key, contentType } = params;
  const accessLevel =
    params.accessLevel === 'PUBLIC'
      ? FileAccessLevel.PUBLIC
      : params.accessLevel === 'PRIVATE'
        ? FileAccessLevel.PRIVATE
        : classifyFile(key);
  const finalContentType = contentType || getMimeType(key);

  try {
    if (isR2Configured) {
      if (accessLevel === FileAccessLevel.PUBLIC) {
        await r2Public.send(
          new PutObjectCommand({
            Bucket: R2_PUBLIC_BUCKET,
            Key: key,
            Body: file,
            ContentType: finalContentType,
            CacheControl: 'public, max-age=31536000'
          })
        );

        return {
          success: true,
          key,
          publicUrl: `${R2_PUBLIC_URL}/${key}`,
          cdnUrl: `${CDN_PUBLIC_URL}/public/${key}`,
          needsSignedUrl: false
        };
      }

      await r2Private.send(
        new PutObjectCommand({
          Bucket: R2_PRIVATE_BUCKET,
          Key: key,
          Body: file,
          ContentType: finalContentType,
          Metadata: {
            'access-level': 'private'
          }
        })
      );

      return {
        success: true,
        key,
        needsSignedUrl: true
      };
    }

    if (supabaseClient) {
      logger.info('[Storage] 上传到 Supabase Storage', {
        key,
        contentType: finalContentType,
        fileSize: file.length
      });

      const { data, error } = await supabaseClient.storage
        .from('question-files')
        .upload(key, file, {
          contentType: finalContentType,
          upsert: true
        });

      if (error) {
        logger.error('[Storage] Supabase 上传失败', error || undefined, { key });
        return {
          success: false,
          error: `上传失败: ${error.message || '未知错误'}`
        };
      }

      logger.info('[Storage] Supabase 上传成功', { key, path: data?.path });

      if (accessLevel === FileAccessLevel.PUBLIC) {
        const { data: urlData } = supabaseClient.storage
          .from('question-files')
          .getPublicUrl(key);

        return {
          success: true,
          key,
          publicUrl: urlData.publicUrl,
          needsSignedUrl: false
        };
      }

      return {
        success: true,
        key,
        needsSignedUrl: true
      };
    }

    const message = '存储服务未配置';
    logger.error(`[Storage] ${message}`);
    return { success: false, error: message };
  } catch (error) {
    logger.error(
      '[Storage] uploadFile 异常',
      error instanceof Error ? error : undefined,
      { key }
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    };
  }
}

// ========================================
// 签名 URL
// ========================================

export async function generateSignedUrl(
  key: string,
  userId: string,
  expiresIn: number = 3600
): Promise<{ url: string; expiresAt: Date }> {
  const hasPermission = await checkFilePermission(key, userId);
  if (!hasPermission) {
    throw new Error('当前用户无权访问该文件');
  }

  if (!isR2Configured) {
    throw new Error('尚未配置 Cloudflare R2，无法生成签名地址');
  }

  const command = new GetObjectCommand({
    Bucket: R2_PRIVATE_BUCKET,
    Key: key
  });
  const signedUrl = await getS3SignedUrl(r2Private, command, { expiresIn });

  return {
    url: signedUrl,
    expiresAt: new Date(Date.now() + expiresIn * 1000)
  };
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('缺少 Supabase 环境变量');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function checkFilePermission(key: string, userId: string): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();

    if (key.startsWith('papers/') || key.startsWith('exports/')) {
      const taskId = key.split('/')[1]?.split('.')[0];
      if (!taskId) return false;

      const { data: task, error } = await admin
        .from('export_tasks')
        .select('user_id')
        .eq('id', taskId)
        .single();

      if (error || !task) {
        logger.error('[Storage] 未找到导出任务', error || undefined, { key });
        return false;
      }

      return task.user_id === userId;
    }

    if (key.startsWith('assignments/submissions/')) {
      const submissionId = key.split('/')[2];
      if (!submissionId) return false;

      const { data: submission, error } = await admin
        .from('submissions')
        .select('student_id, assignments!inner(class_id, classes!inner(teacher_id))')
        .eq('id', submissionId)
        .single();

      if (error || !submission) {
        logger.error('[Storage] 未找到作业提交记录', error || undefined, { key });
        return false;
      }

      const isStudent = submission.student_id === userId;
      const isTeacher =
        (submission as any).assignments?.classes?.teacher_id === userId;

      return isStudent || isTeacher;
    }

    if (key.startsWith('member-data/')) {
      return key.includes(userId);
    }

    return false;
  } catch (error) {
    logger.error(
      '[Storage] checkFilePermission 异常',
      error instanceof Error ? error : undefined,
      { key }
    );
    return false;
  }
}

// ========================================
// 删除与下载
// ========================================

export async function deleteFile(
  key: string,
  accessLevel?: FileAccessLevel
): Promise<void> {
  const level = accessLevel || classifyFile(key);

  if (!isR2Configured) {
    logger.warn('[Storage] deleteFile 仅支持 R2，但当前未配置', { key });
    return;
  }

  const client = level === FileAccessLevel.PUBLIC ? r2Public : r2Private;
  const bucket = level === FileAccessLevel.PUBLIC ? R2_PUBLIC_BUCKET : R2_PRIVATE_BUCKET;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
}

export async function downloadFile(
  key: string,
  accessLevel?: FileAccessLevel
): Promise<Buffer> {
  const level = accessLevel || classifyFile(key);

  if (isR2Configured) {
    const client = level === FileAccessLevel.PUBLIC ? r2Public : r2Private;
    const bucket = level === FileAccessLevel.PUBLIC ? R2_PUBLIC_BUCKET : R2_PRIVATE_BUCKET;

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );

    const chunks: Uint8Array[] = [];
    const bodyStream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of bodyStream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  if (supabaseClient) {
    const { data, error } = await supabaseClient.storage
      .from('question-files')
      .download(key);

    if (error || !data) {
      logger.error('[Storage] Supabase 下载失败', error || undefined, { key });
      throw new Error(`下载失败: ${error?.message || 'Supabase Storage 无法读取文件'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error('存储服务未配置，无法下载文件');
}

export const getFile = downloadFile;

// ========================================
// 简化的签名 URL（用于 AI 题库，不需要权限检查）
// ========================================

/**
 * 为私有文件生成签名URL（简化版，用于AI题库系统）
 * 不进行权限检查，假设调用方已验证权限
 */
export async function getSignedUrl(
  key: string,
  accessLevel?: FileAccessLevel,
  expiresIn: number = 3600
): Promise<string> {
  const level = accessLevel || classifyFile(key);

  // 公共文件直接返回公共URL
  if (level === FileAccessLevel.PUBLIC) {
    if (isR2Configured) {
      return `${R2_PUBLIC_URL}/${key}`;
    }
    if (supabaseClient) {
      const { data } = supabaseClient.storage
        .from('question-files')
        .getPublicUrl(key);
      return data.publicUrl;
    }
  }

  // 私有文件生成签名URL
  if (isR2Configured) {
    const command = new GetObjectCommand({
      Bucket: R2_PRIVATE_BUCKET,
      Key: key
    });
    return await getS3SignedUrl(r2Private, command, { expiresIn });
  }

  if (supabaseClient) {
    const { data, error } = await supabaseClient.storage
      .from('question-files')
      .createSignedUrl(key, expiresIn);

    if (error || !data) {
      logger.error('[Storage] 生成签名URL失败', error || undefined, { key });
      throw new Error(`生成签名URL失败: ${error?.message || '未知错误'}`);
    }

    return data.signedUrl;
  }

  throw new Error('存储服务未配置，无法生成签名URL');
}

// ========================================
// 使用示例
// ========================================

/**
 * 示例：
 *
 * ```ts
 * await uploadFile({
 *   file: imageBuffer,
 *   key: 'questions/images/img123.png',
 *   accessLevel: 'PUBLIC'
 * });
 *
 * await uploadFile({
 *   file: pdfBuffer,
 *   key: `papers/${taskId}.pdf`,
 *   accessLevel: 'PRIVATE'
 * });
 *
 * await generateSignedUrl('papers/task123.pdf', userId, 3600);
 * ```
 */
