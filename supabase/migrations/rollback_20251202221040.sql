-- =============================================
-- RixinMath: 回滚图像解析流水线指标持久化
-- 说明：回滚 20251202221040_add_image_anchor_and_metrics.sql 的所有更改
-- =============================================

BEGIN;

-- 回滚聚合函数
DROP FUNCTION IF EXISTS public.get_task_metrics_summary(UUID);

-- 回滚索引
DROP INDEX IF EXISTS public.idx_parsed_questions_image_assets_gin;
DROP INDEX IF EXISTS public.idx_upload_tasks_processing_time;
DROP INDEX IF EXISTS public.idx_upload_tasks_latency;

-- 回滚指标字段
ALTER TABLE public.upload_tasks
  DROP COLUMN IF EXISTS python_processing_ms,
  DROP COLUMN IF EXISTS supabase_bandwidth_mb,
  DROP COLUMN IF EXISTS ingest_upload_latency_ms;

COMMIT;
