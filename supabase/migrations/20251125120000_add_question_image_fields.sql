-- =============================================
-- AI题库：添加题目配图字段
-- =============================================
-- 功能：为parsed_questions表添加配图相关字段
-- 用途：存储每道题目裁剪后的配图URL和配图区域坐标
-- 创建时间：2025-11-25
-- =============================================

-- 添加题目配图URL字段（裁剪后的单独配图）
ALTER TABLE public.parsed_questions
ADD COLUMN IF NOT EXISTS question_image_url TEXT;

-- 添加配图区域坐标字段（JSON格式，存储在原图中的位置）
ALTER TABLE public.parsed_questions
ADD COLUMN IF NOT EXISTS image_region JSONB;

-- 添加字段注释
COMMENT ON COLUMN public.parsed_questions.question_image_url IS '题目配图URL（从原图裁剪后的单独配图）';
COMMENT ON COLUMN public.parsed_questions.image_region IS '配图在原图中的区域坐标 {x, y, width, height}';

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_parsed_questions_question_image_url
ON public.parsed_questions(question_image_url)
WHERE question_image_url IS NOT NULL;

-- 示例数据格式：
-- {
--   "x": 100,        -- 配图左上角X坐标（像素）
--   "y": 200,        -- 配图左上角Y坐标（像素）
--   "width": 300,    -- 配图宽度（像素）
--   "height": 250    -- 配图高度（像素）
-- }
