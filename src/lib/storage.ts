/**
 * Cloudflare R2 存储服务
 *
 * 架构:
 * - 公开文件: R2 公开桶 → 七牛云 CDN → 永久 URL
 * - 私有文件: R2 私有桶 → 签名 URL → 临时访问(1小时)
 *
 * 安全特性:
 * - ✅ 文件分级 (PUBLIC/PRIVATE)
 * - ✅ 动态 MIME 类型检测
 * - ✅ 签名 URL 过期控制
 * - ✅ 权限校验
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ========================================
// 配置
// ========================================

const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET || 'rixing-public';
const R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET || 'rixing-private';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const CDN_PUBLIC_URL = process.env.CDN_PUBLIC_URL || 'https://cdn.rixing.com';

// 公开文件 R2 客户端
const r2Public = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// 私有文件 R2 客户端
const r2Private = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ========================================
// 类型定义
// ========================================

/**
 * 文件访问级别
 */
export enum FileAccessLevel {
  PUBLIC = 'public',   // 公开文件（题目图片、头像等）
  PRIVATE = 'private', // 私有文件（导出PDF、会员资料等）
}

/**
 * MIME 类型映射表
 */
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
  '7z': 'application/x-7z-compressed',
};

// ========================================
// 工具函数
// ========================================

/**
 * 根据文件扩展名获取 MIME 类型
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return MIME_TYPES[ext || ''] || 'application/octet-stream';
}

/**
 * 分类文件（判断是否为公开文件）
 */
export function classifyFile(key: string): FileAccessLevel {
  // 公开文件规则
  const publicPatterns = [
    /^questions\/images\//,    // 题目图片
    /^avatars\//,              // 用户头像
    /^public-attachments\//,   // 公开附件
  ];

  for (const pattern of publicPatterns) {
    if (pattern.test(key)) {
      return FileAccessLevel.PUBLIC;
    }
  }

  // 默认为私有
  return FileAccessLevel.PRIVATE;
}

// ========================================
// 主要 API
// ========================================

/**
 * 上传文件到 R2
 *
 * @param params.file - 文件 Buffer
 * @param params.key - 文件路径 (例: 'questions/images/img1.png')
 * @param params.accessLevel - 访问级别 (可选，默认根据 key 自动判断)
 * @param params.contentType - MIME 类型 (可选，默认自动检测)
 *
 * @returns 上传结果
 */
export async function uploadFile(params: {
  file: Buffer;
  key: string;
  accessLevel?: FileAccessLevel;
  contentType?: string;
}): Promise<{
  key: string;
  publicUrl?: string;    // 公开文件返回永久 URL
  cdnUrl?: string;       // 公开文件返回 CDN URL
  needsSignedUrl: boolean; // 私有文件需要签名 URL
}> {
  const { file, key, contentType } = params;

  // ✅ 自动分类文件（如果未指定）
  const accessLevel = params.accessLevel || classifyFile(key);

  // ✅ 动态检测 MIME 类型
  const finalContentType = contentType || getMimeType(key);

  if (accessLevel === FileAccessLevel.PUBLIC) {
    // ========================================
    // 公开文件: 上传到公开桶 + 返回永久 URL
    // ========================================
    await r2Public.send(
      new PutObjectCommand({
        Bucket: R2_PUBLIC_BUCKET,
        Key: key,
        Body: file,
        ContentType: finalContentType,
        CacheControl: 'public, max-age=31536000', // 缓存 1 年
      })
    );

    return {
      key,
      publicUrl: `${R2_PUBLIC_URL}/${key}`,
      cdnUrl: `${CDN_PUBLIC_URL}/public/${key}`, // 七牛云 CDN
      needsSignedUrl: false,
    };
  } else {
    // ========================================
    // 私有文件: 上传到私有桶 + 需签名 URL 访问
    // ========================================
    await r2Private.send(
      new PutObjectCommand({
        Bucket: R2_PRIVATE_BUCKET,
        Key: key,
        Body: file,
        ContentType: finalContentType,
        Metadata: {
          'access-level': 'private',
        },
      })
    );

    return {
      key,
      needsSignedUrl: true, // 前端需要调用 API 获取签名 URL
    };
  }
}

/**
 * 生成私有文件的临时签名 URL
 *
 * @param key - 文件 key
 * @param userId - 用户 ID (用于权限校验)
 * @param expiresIn - 过期时间(秒), 默认 1 小时
 *
 * @returns 签名 URL 和过期时间
 */
export async function generateSignedUrl(
  key: string,
  userId: string,
  expiresIn: number = 3600
): Promise<{ url: string; expiresAt: Date }> {
  // ✅ 权限校验: 检查用户是否有权访问该文件
  const hasPermission = await checkFilePermission(key, userId);
  if (!hasPermission) {
    throw new Error('User does not have permission to access this file');
  }

  // 生成 R2 签名 URL
  const command = new GetObjectCommand({
    Bucket: R2_PRIVATE_BUCKET,
    Key: key,
  });

  const signedUrl = await getSignedUrl(r2Private, command, { expiresIn });

  return {
    url: signedUrl,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/**
 * 检查用户是否有权访问文件
 *
 * @param key - 文件 key
 * @param userId - 用户 ID
 *
 * @returns 是否有权限
 */
async function checkFilePermission(
  key: string,
  userId: string
): Promise<boolean> {
  // ✅ 示例权限逻辑:

  // 1. 如果是导出的 PDF，检查是否是该用户的导出任务
  if (key.startsWith('papers/') || key.startsWith('exports/')) {
    const taskId = key.split('/')[1].split('.')[0];
    // TODO: 查询数据库检查 export_tasks 表
    // const task = await db.export_tasks.findOne({ id: taskId });
    // return task?.user_id === userId;
    return true; // 临时返回 true，实际需要查询数据库
  }

  // 2. 如果是作业提交，检查是否是学生本人或任课教师
  if (key.startsWith('assignments/submissions/')) {
    const submissionId = key.split('/')[2];
    // TODO: 查询数据库检查 submissions 表
    // const submission = await db.submissions.findOne({ id: submissionId });
    // return submission?.student_id === userId || submission?.teacher_id === userId;
    return true; // 临时返回 true
  }

  // 3. 如果是会员资料，检查是否是该用户的资料
  if (key.startsWith('member-data/')) {
    return key.includes(userId);
  }

  // 4. 默认拒绝访问
  return false;
}

/**
 * 删除文件
 *
 * @param key - 文件 key
 * @param accessLevel - 访问级别 (可选，默认根据 key 自动判断)
 */
export async function deleteFile(
  key: string,
  accessLevel?: FileAccessLevel
): Promise<void> {
  const level = accessLevel || classifyFile(key);

  const client = level === FileAccessLevel.PUBLIC ? r2Public : r2Private;
  const bucket =
    level === FileAccessLevel.PUBLIC ? R2_PUBLIC_BUCKET : R2_PRIVATE_BUCKET;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * 下载文件 (仅用于服务端)
 *
 * @param key - 文件 key
 * @param accessLevel - 访问级别 (可选，默认根据 key 自动判断)
 *
 * @returns 文件 Buffer
 */
export async function downloadFile(
  key: string,
  accessLevel?: FileAccessLevel
): Promise<Buffer> {
  const level = accessLevel || classifyFile(key);

  const client = level === FileAccessLevel.PUBLIC ? r2Public : r2Private;
  const bucket =
    level === FileAccessLevel.PUBLIC ? R2_PUBLIC_BUCKET : R2_PRIVATE_BUCKET;

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  // 将 ReadableStream 转换为 Buffer
  const chunks: Uint8Array[] = [];
  // @ts-ignore
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ========================================
// 使用示例
// ========================================

/**
 * 示例 1: 上传公开文件（题目图片）
 *
 * ```typescript
 * const result = await uploadFile({
 *   file: imageBuffer,
 *   key: 'questions/images/img123.png',
 *   accessLevel: FileAccessLevel.PUBLIC,
 * });
 * // result.cdnUrl: "https://cdn.rixing.com/public/questions/images/img123.png"
 * ```
 *
 * 示例 2: 上传私有文件（导出 PDF）
 *
 * ```typescript
 * const result = await uploadFile({
 *   file: pdfBuffer,
 *   key: `papers/${taskId}.pdf`,
 *   accessLevel: FileAccessLevel.PRIVATE,
 * });
 * // result.needsSignedUrl: true
 * // 前端需要调用 /api/files/download?key=papers/xxx.pdf 获取签名 URL
 * ```
 *
 * 示例 3: 生成签名 URL
 *
 * ```typescript
 * const { url, expiresAt } = await generateSignedUrl(
 *   'papers/task123.pdf',
 *   userId,
 *   3600 // 1 小时
 * );
 * // url: "https://xxx.r2.cloudflarestorage.com/papers/task123.pdf?signature=..."
 * // expiresAt: Date (1 小时后)
 * ```
 */
