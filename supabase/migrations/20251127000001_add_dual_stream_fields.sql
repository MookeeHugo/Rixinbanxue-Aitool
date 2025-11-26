-- =============================================
-- AI题库：添加双流并行架构字段
-- =============================================
-- 功能：为parsed_questions表添加双流并行架构所需字段
-- 用途：支持Qwen占位符 + OCR图片裁剪的双流并行处理
-- 创建时间：2025-11-27
-- =============================================

-- 添加题号字段
ALTER TABLE public.parsed_questions
ADD COLUMN IF NOT EXISTS number TEXT;

-- 添加原始内容字段（包含<<IMG_X_Y>>占位符）
ALTER TABLE public.parsed_questions
ADD COLUMN IF NOT EXISTS raw_content TEXT;

-- 添加占位符元数据数组（Qwen输出的images数组）
ALTER TABLE public.parsed_questions
ADD COLUMN IF NOT EXISTS image_placeholders JSONB;

-- 添加图片资源数组（OCR裁剪的图片ID和URL）
ALTER TABLE public.parsed_questions
ADD COLUMN IF NOT EXISTS image_assets JSONB;

-- 添加字段注释
COMMENT ON COLUMN public.parsed_questions.number IS '题号（如 "8", "16"）';
COMMENT ON COLUMN public.parsed_questions.raw_content IS '原始题目内容（包含<<IMG_X_Y>>占位符，用于编辑时恢复）';
COMMENT ON COLUMN public.parsed_questions.image_placeholders IS '占位符元数据数组 [{placeholder, description, position}]';
COMMENT ON COLUMN public.parsed_questions.image_assets IS '图片资源数组 [{id, url, questionNumber, order, placeholder, used}]';

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_parsed_questions_number
ON public.parsed_questions(number);

-- 示例数据格式：
-- image_placeholders: [
--   {
--     "placeholder": "<<IMG_8_1>>",
--     "description": "圆形几何图",
--     "position": "题干中 \"如图\" 关键词后"
--   }
-- ]
--
-- image_assets: [
--   {
--     "id": "ai-question-bank/user-id/task-id/q8_1.png",
--     "url": "https://...",
--     "questionNumber": "8",
--     "order": 1,
--     "placeholder": "<<IMG_8_1>>",
--     "used": true
--   }
-- ]
