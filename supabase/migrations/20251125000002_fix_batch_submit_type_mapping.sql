-- ============================================================================
-- Fix batch_submit_questions type mapping
-- ============================================================================
-- The questions table expects ('choice', 'fill', 'essay') but the function
-- was mapping 'choice' to 'single', causing constraint violations
-- ============================================================================

DROP FUNCTION IF EXISTS batch_submit_questions CASCADE;

CREATE OR REPLACE FUNCTION batch_submit_questions(
  p_task_id UUID,
  p_question_ids UUID[],
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  -- 验证任务归属
  IF NOT EXISTS (
    SELECT 1 FROM public.upload_tasks
    WHERE id = p_task_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Task % does not belong to user %', p_task_id, p_user_id;
  END IF;

  -- 插入到主题库并计数
  WITH inserted AS (
    INSERT INTO public.questions (
      type,
      content,
      options,
      answer,
      difficulty,
      tags,
      created_by,
      created_at
    )
    SELECT
      -- 类型转换：MVP的type → 主平台的type
      -- 修复：'choice' → 'choice' (不是 'single')
      CASE pq.type
        WHEN 'choice' THEN 'choice'
        WHEN 'fill' THEN 'fill'
        WHEN 'essay' THEN 'essay'
        WHEN 'proof' THEN 'essay'
      END,
      pq.content,
      pq.options,
      pq.answer,
      -- 从tags JSONB中提取difficulty
      COALESCE((pq.tags->>'difficulty')::TEXT, 'medium'),
      -- 从tags JSONB中提取knowledge数组
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(pq.tags->'knowledge')),
        ARRAY[]::TEXT[]
      ),
      p_user_id,
      NOW()
    FROM public.parsed_questions pq
    WHERE pq.id = ANY(p_question_ids)
      AND pq.upload_task_id = p_task_id
      AND pq.is_selected = TRUE  -- 只提交已选中的
      AND pq.is_submitted = FALSE  -- 避免重复提交
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted_count FROM inserted;

  -- 更新提交状态
  UPDATE public.parsed_questions
  SET is_submitted = TRUE
  WHERE id = ANY(p_question_ids)
    AND upload_task_id = p_task_id
    AND is_selected = TRUE
    AND is_submitted = FALSE;

  RETURN v_inserted_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Batch submit failed: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION batch_submit_questions IS 'MVP v2: 批量提交已选中的题目到主题库（事务保护）- 修复type映射问题';

-- ============================================================================
-- Migration Complete ✅
-- ============================================================================
