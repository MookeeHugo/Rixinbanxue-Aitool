-- ============================================================================
-- batch_submit_questions: include image_url/image_key when submitting to questions
--   order: question_image_url -> image_assets[0].url -> original_image_url
--   key:   image_assets[0].key (if any)
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
  -- verify task ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.upload_tasks
    WHERE id = p_task_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Task % does not belong to user %', p_task_id, p_user_id;
  END IF;

  WITH selected AS (
    SELECT
      pq.*,
      COALESCE(
        pq.question_image_url,
        pq.image_assets -> 0 ->> 'url',
        pq.original_image_url
      ) AS resolved_image_url,
      pq.image_assets -> 0 ->> 'key' AS resolved_image_key
    FROM public.parsed_questions pq
    WHERE pq.id = ANY(p_question_ids)
      AND pq.upload_task_id = p_task_id
      AND pq.is_selected = TRUE
      AND pq.is_submitted = FALSE
  ),
  inserted AS (
    INSERT INTO public.questions (
      type,
      content,
      options,
      answer,
      difficulty,
      tags,
      created_by,
      created_at,
      image_url,
      image_key
    )
    SELECT
      CASE s.type
        WHEN 'choice' THEN 'choice'
        WHEN 'fill' THEN 'fill'
        WHEN 'essay' THEN 'essay'
        WHEN 'proof' THEN 'essay'
      END,
      s.content,
      s.options,
      s.answer,
      COALESCE((s.tags->>'difficulty')::TEXT, 'medium'),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(s.tags->'knowledge')),
        ARRAY[]::TEXT[]
      ),
      p_user_id,
      NOW(),
      s.resolved_image_url,
      s.resolved_image_key
    FROM selected s
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted_count FROM inserted;

  -- mark submitted
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

COMMENT ON FUNCTION batch_submit_questions IS 'MVP v2: batch submit selected questions to main table (with image fields)';

-- ============================================================================
-- Migration Complete
-- ============================================================================