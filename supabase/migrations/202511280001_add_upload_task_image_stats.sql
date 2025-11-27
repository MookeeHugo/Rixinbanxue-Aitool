-- 添加上传任务统计字段，记录含图题数量与裁剪命中率
ALTER TABLE public.upload_tasks
  ADD COLUMN IF NOT EXISTS image_questions integer,
  ADD COLUMN IF NOT EXISTS image_success_rate integer;
