-- 创建AI题库文件存储bucket
-- 用于存储上传的题目图片/PDF文件

-- 创建私有bucket（需要认证才能访问）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-files',
  'question-files',
  false,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
);

-- RLS策略：Service Role可以完全访问（用于Server Actions）
CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
USING (bucket_id = 'question-files');

-- RLS策略：允许认证用户读取
CREATE POLICY "Authenticated users can read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'question-files');
