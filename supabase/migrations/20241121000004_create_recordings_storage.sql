-- 创建录制文件存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-recordings', 'live-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- 设置存储策略：允许认证用户上传
CREATE POLICY "认证用户可以上传录制文件"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'live-recordings'
);

-- 设置存储策略：所有人可以下载（公开访问回放）
CREATE POLICY "所有人可以下载录制文件"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'live-recordings');

-- 设置存储策略：只有上传者可以删除
CREATE POLICY "上传者可以删除录制文件"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'live-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
