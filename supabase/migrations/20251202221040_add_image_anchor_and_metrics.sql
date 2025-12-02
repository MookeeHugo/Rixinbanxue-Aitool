-- =============================================
-- RixinMath: 图像解析流水线指标持久化（方案A）
-- 说明：保留 parsed_questions.image_assets 结构，仅在 upload_tasks 上持久化指标
-- =============================================

BEGIN;

-- 第一部分：upload_tasks 增加指标字段
ALTER TABLE public.upload_tasks
  ADD COLUMN IF NOT EXISTS ingest_upload_latency_ms BIGINT,
  ADD COLUMN IF NOT EXISTS supabase_bandwidth_mb NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS python_processing_ms BIGINT;

COMMENT ON COLUMN public.upload_tasks.ingest_upload_latency_ms IS
  '上传任务：从创建到下载完成的时延（毫秒）';
COMMENT ON COLUMN public.upload_tasks.supabase_bandwidth_mb IS
  '上传任务：本次处理耗费的下载带宽（MB）';
COMMENT ON COLUMN public.upload_tasks.python_processing_ms IS
  '上传任务：Node/Python 处理总耗时（毫秒）';

-- 性能分析索引
CREATE INDEX IF NOT EXISTS idx_upload_tasks_latency
  ON public.upload_tasks(ingest_upload_latency_ms)
  WHERE ingest_upload_latency_ms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_upload_tasks_processing_time
  ON public.upload_tasks(python_processing_ms)
  WHERE python_processing_ms IS NOT NULL;

-- 第二部分：确保 parsed_questions.image_assets 存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parsed_questions'
      AND column_name = 'image_assets'
  ) THEN
    RAISE EXCEPTION 'FATAL: parsed_questions.image_assets 缺失，请检查迁移顺序';
  END IF;
END $$;

-- 为 JSONB 添加 GIN 索引，便于 anchor_verification 查询
CREATE INDEX IF NOT EXISTS idx_parsed_questions_image_assets_gin
  ON public.parsed_questions
  USING GIN (image_assets);

-- 第三部分：指标聚合函数
CREATE OR REPLACE FUNCTION public.get_task_metrics_summary(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'task_id', ut.id,
    'ingest_latency_ms', ut.ingest_upload_latency_ms,
    'bandwidth_mb', ut.supabase_bandwidth_mb,
    'processing_ms', ut.python_processing_ms,
    'image_questions', ut.image_questions,
    'image_success_rate', ut.image_success_rate,
    'total_questions', ut.total_questions,
    'anchor_stats', (
      SELECT jsonb_build_object(
        'total_images', COUNT(*),
        'matched', COUNT(*) FILTER (
          WHERE jsonb_path_exists(
            pq.image_assets,
            '$[*].anchor_verification.matched ? (@ == true)'
          )
        ),
        'avg_confidence', ROUND(AVG(
          CAST(
            jsonb_path_query_first(
              pq.image_assets,
              '$[*].anchor_verification.confidence'
            )::text AS NUMERIC
          )
        ), 3)
      )
      FROM public.parsed_questions pq
      WHERE pq.upload_task_id = ut.id
        AND pq.image_assets IS NOT NULL
    )
  )
  INTO v_summary
  FROM public.upload_tasks ut
  WHERE ut.id = p_task_id;

  RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION public.get_task_metrics_summary IS
  '获取 upload_task 的指标摘要（含锚点命中情况）';

COMMIT;
