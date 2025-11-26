-- 将question-files bucket改为公开访问
-- 原因：题目配图需要在前端直接显示，不需要额外的认证

-- 更新bucket配置为public
UPDATE storage.buckets
SET public = true
WHERE id = 'question-files';

-- 添加匿名用户读取策略（支持公开访问）
-- 注意：只允许读取，不允许上传/删除
-- 先删除可能存在的旧策略，然后创建新策略
DROP POLICY IF EXISTS "Anonymous users can read public files" ON storage.objects;

CREATE POLICY "Anonymous users can read public files"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'question-files');

-- 说明：
-- 1. 现在bucket支持公开访问
-- 2. 使用FileAccessLevel.PUBLIC上传的文件可以通过公开URL直接访问
-- 3. 使用FileAccessLevel.PRIVATE上传的文件仍需认证（通过签名URL）
-- 4. 题目配图使用PUBLIC级别，可以直接在浏览器中显示
