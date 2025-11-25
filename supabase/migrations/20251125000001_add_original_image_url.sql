-- ============================================================================
-- Add original_image_url field to parsed_questions
-- ============================================================================
-- 为parsed_questions表添加原始图片URL字段，用于在题目卡片中显示原图
-- ============================================================================

-- 添加 original_image_url 字段
ALTER TABLE public.parsed_questions
ADD COLUMN IF NOT EXISTS original_image_url TEXT;

-- 添加注释
COMMENT ON COLUMN public.parsed_questions.original_image_url IS '原始上传图片的URL（从upload_tasks.file_url获取）';

-- 创建索引（可选，用于快速查询有图片的题目）
CREATE INDEX IF NOT EXISTS idx_parsed_questions_has_image
  ON public.parsed_questions(original_image_url)
  WHERE original_image_url IS NOT NULL;

-- ============================================================================
-- Migration Complete ✅
-- ============================================================================
