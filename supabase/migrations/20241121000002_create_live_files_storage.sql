-- 创建存储桶用于存储直播会话文件
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-session-files', 'live-session-files', true)
ON CONFLICT (id) DO NOTHING;

-- 允许所有认证用户上传文件
CREATE POLICY "认证用户可以上传文件" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'live-session-files' AND
    auth.role() = 'authenticated'
  );

-- 允许所有人读取文件（因为bucket是公开的）
CREATE POLICY "所有人可以读取文件" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'live-session-files');

-- 只允许文件所有者删除文件
CREATE POLICY "文件所有者可以删除文件" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'live-session-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
