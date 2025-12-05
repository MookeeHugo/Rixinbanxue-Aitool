# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/lib/storage.ts')
text = path.read_text()
old = '''export async function downloadFile(
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

  // 灏?ReadableStream 杞崲涓?Buffer
  const chunks: Uint8Array[] = [];
  // @ts-ignore
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Alias for backward compatibility
export const getFile = downloadFile;
'''
new = '''export async function downloadFile(
  key: string,
  accessLevel?: FileAccessLevel
): Promise<Buffer> {
  const level = accessLevel || classifyFile(key);

  if (isR2Configured) {
    const client = level === FileAccessLevel.PUBLIC ? r2Public : r2Private;
    const bucket =
      level === FileAccessLevel.PUBLIC ? R2_PUBLIC_BUCKET : R2_PRIVATE_BUCKET;

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const chunks: Uint8Array[] = [];
    // @ts-ignore
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  if (supabaseClient) {
    const { data, error } = await supabaseClient.storage
      .from('question-files')
      .download(key);

    if (error || !data) {
      logger.error('Supabase Storage download failed', { error, key });
      throw new Error(
        `下载失败: ${error?.message || 'Supabase Storage 无法获取文件'}`
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  logger.error('No storage backend configured for download');
  throw new Error('存储服务未配置，无法下载文件');
}

// Alias for backward compatibility
export const getFile = downloadFile;
'''
if old not in text:
    raise SystemExit('old block not found')
path.write_text(text.replace(old, new))

