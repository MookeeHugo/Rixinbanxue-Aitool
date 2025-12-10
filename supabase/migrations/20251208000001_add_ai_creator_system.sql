-- ============================================================================
-- AI数学题创作系统 - 数据库迁移
-- ============================================================================
-- 本迁移为AI数学题创作与改编功能创建数据库结构
--
-- 核心功能：
-- 1. AI创作数学题：DeepSeek生成Python代码 → E2B沙箱执行 → 生成PNG+SVG图形
-- 2. AI改编数学题：Gemini Vision解析拓扑 → 参数化重生成
--
-- 核心表：
-- - ai_created_questions: AI生成的题目（含图像、代码、坐标）
-- - ai_creation_quotas: 用户配额管理（日限额、并发限制、速率限制）
-- - ai_creation_templates: 提示词模板（函数/统计/几何）
-- - ai_creation_audit_logs: 操作审计日志（生成/改编/提交）
--
-- 安全特性：
-- - 完整的RLS策略保护
-- - 审计日志追踪所有操作
-- - 配额管理防止滥用
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 表 1: ai_created_questions
-- 用途: 存储AI创作的数学题目及其图像、代码、坐标数据
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_created_questions (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户上下文
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 题目内容
  question_text TEXT NOT NULL,  -- 题目文本（支持LaTeX）
  question_type TEXT NOT NULL CHECK (question_type IN ('function', 'statistics', 'geometry')),
  diagram_type TEXT,  -- 图表类型：linear/quadratic/histogram/triangle等
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- AI生成的代码
  python_code TEXT NOT NULL,  -- 完整的Python代码
  generation_parameters JSONB NOT NULL,  -- 可编辑参数（系数、定义域等）

  -- 图像输出
  image_url TEXT,  -- PNG图像R2 URL
  image_key TEXT,  -- R2存储键
  svg_url TEXT,  -- SVG图像R2 URL（可选）
  svg_key TEXT,  -- SVG存储键

  -- 坐标数据（用于验证和后续编辑）
  coordinate_data JSONB,  -- 关键点坐标 {"vertex": [0, 3], "x_intercept": [-1.5, 0]}

  -- 改编链路
  parent_question_id UUID REFERENCES public.ai_created_questions(id) ON DELETE SET NULL,
  adaptation_metadata JSONB,  -- 改编差异信息
  version INTEGER DEFAULT 1,  -- 改编版本号

  -- 生成状态
  generation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  validation_result JSONB,  -- 7层验证结果

  -- 提交到主题库
  submitted_to_library BOOLEAN NOT NULL DEFAULT FALSE,
  library_question_id UUID,  -- 关联的questions.id
  submitted_at TIMESTAMPTZ,

  -- 成本追踪
  deepseek_tokens_used INTEGER DEFAULT 0,
  e2b_execution_seconds DECIMAL(10, 2) DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引优化查询性能
CREATE INDEX idx_ai_created_questions_user_id ON public.ai_created_questions(user_id);
CREATE INDEX idx_ai_created_questions_status ON public.ai_created_questions(generation_status);
CREATE INDEX idx_ai_created_questions_type ON public.ai_created_questions(question_type);
CREATE INDEX idx_ai_created_questions_submitted ON public.ai_created_questions(submitted_to_library);
CREATE INDEX idx_ai_created_questions_parent ON public.ai_created_questions(parent_question_id);
CREATE INDEX idx_ai_created_questions_created_at ON public.ai_created_questions(created_at DESC);

-- 自动更新时间戳
CREATE OR REPLACE FUNCTION update_ai_created_questions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_created_questions_timestamp
  BEFORE UPDATE ON public.ai_created_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_created_questions_timestamp();

-- RLS策略：用户只能访问自己的AI创作题目
ALTER TABLE public.ai_created_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可查看自己的AI创作题目"
  ON public.ai_created_questions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可创建AI创作题目"
  ON public.ai_created_questions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的AI创作题目"
  ON public.ai_created_questions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可删除自己的AI创作题目"
  ON public.ai_created_questions
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_created_questions IS 'AI创作的数学题目，包含图像、代码、坐标数据';
COMMENT ON COLUMN public.ai_created_questions.python_code IS '用于生成图像的完整Python代码';
COMMENT ON COLUMN public.ai_created_questions.coordinate_data IS '图形关键点坐标，用于验证和后续编辑';
COMMENT ON COLUMN public.ai_created_questions.parent_question_id IS '改编题的父题ID（改编链路追溯）';
COMMENT ON COLUMN public.ai_created_questions.validation_result IS '7层验证流程的详细结果';

-- ----------------------------------------------------------------------------
-- 表 2: ai_creation_quotas
-- 用途: 用户配额管理（防止滥用和成本控制）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_creation_quotas (
  -- 用户ID作为主键
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 日配额管理
  daily_limit INTEGER NOT NULL DEFAULT 20,  -- 每日生成限额
  daily_used INTEGER NOT NULL DEFAULT 0,  -- 今日已使用
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- 上次重置日期

  -- 并发与速率限制
  concurrent_limit INTEGER NOT NULL DEFAULT 2,  -- 同时进行的生成任务数
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 5,  -- 每分钟请求上限

  -- 重试策略
  retry_deduct_quota BOOLEAN NOT NULL DEFAULT FALSE,  -- 重试是否扣配额
  failed_count_today INTEGER NOT NULL DEFAULT 0,  -- 今日失败次数

  -- 统计信息
  total_generated INTEGER NOT NULL DEFAULT 0,  -- 累计生成数
  total_cost_usd DECIMAL(10, 4) DEFAULT 0,  -- 累计成本（美元）

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_ai_creation_quotas_last_reset ON public.ai_creation_quotas(last_reset_date);

-- 自动更新时间戳
CREATE TRIGGER update_ai_creation_quotas_timestamp
  BEFORE UPDATE ON public.ai_creation_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_created_questions_timestamp();

-- RLS策略：用户只能访问自己的配额信息
ALTER TABLE public.ai_creation_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可查看自己的配额信息"
  ON public.ai_creation_quotas
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可创建自己的配额记录"
  ON public.ai_creation_quotas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的配额信息"
  ON public.ai_creation_quotas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.ai_creation_quotas IS '用户AI创作配额管理：日限额、并发限制、速率限制';
COMMENT ON COLUMN public.ai_creation_quotas.concurrent_limit IS '同时进行的生成任务数上限（防止资源滥用）';
COMMENT ON COLUMN public.ai_creation_quotas.rate_limit_per_minute IS '每分钟请求上限（防止爬虫攻击）';

-- ----------------------------------------------------------------------------
-- 表 3: ai_creation_templates
-- 用途: 存储提示词模板和参数schema
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_creation_templates (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 模板信息
  template_name TEXT NOT NULL UNIQUE,  -- 模板名称：function_linear, geometry_triangle等
  question_type TEXT NOT NULL CHECK (question_type IN ('function', 'statistics', 'geometry')),
  diagram_type TEXT NOT NULL,  -- linear/quadratic/histogram/triangle等

  -- 提示词模板
  prompt_template TEXT NOT NULL,  -- DeepSeek提示词模板（支持变量替换）

  -- 参数定义
  parameter_schema JSONB NOT NULL,  -- 参数schema（JSON Schema格式）
  default_parameters JSONB,  -- 默认参数值

  -- 验证规则
  validation_rules JSONB,  -- 特定于此模板的验证规则

  -- 元数据
  description TEXT,  -- 模板描述
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,  -- 是否启用

  -- 统计信息
  usage_count INTEGER DEFAULT 0,  -- 使用次数
  success_rate DECIMAL(5, 2),  -- 成功率

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_ai_creation_templates_type ON public.ai_creation_templates(question_type);
CREATE INDEX idx_ai_creation_templates_active ON public.ai_creation_templates(is_active);

-- 自动更新时间戳
CREATE TRIGGER update_ai_creation_templates_timestamp
  BEFORE UPDATE ON public.ai_creation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_created_questions_timestamp();

-- RLS策略：所有认证用户可读取模板（但不能修改）
ALTER TABLE public.ai_creation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "认证用户可查看模板"
  ON public.ai_creation_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 只有管理员可以修改模板（暂时禁止INSERT/UPDATE/DELETE）
-- 后续可通过service_role或管理员角色授权

COMMENT ON TABLE public.ai_creation_templates IS '提示词模板库：存储不同题型的DeepSeek提示词和参数schema';
COMMENT ON COLUMN public.ai_creation_templates.parameter_schema IS 'JSON Schema格式的参数定义（用于前端动态表单生成）';
COMMENT ON COLUMN public.ai_creation_templates.validation_rules IS '特定于此模板的验证规则';

-- ----------------------------------------------------------------------------
-- 表 4: ai_creation_audit_logs
-- 用途: 审计日志（追踪所有生成、改编、提交操作）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_creation_audit_logs (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户与操作
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'generate', 'regenerate', 'adapt', 'submit',
    'rollback', 'retry', 'audit_approve', 'audit_reject'
  )),

  -- 关联题目
  question_id UUID REFERENCES public.ai_created_questions(id) ON DELETE SET NULL,

  -- 操作参数
  parameters JSONB,  -- 操作时的参数（用于审计和调试）

  -- 结果状态
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'timeout', 'security_blocked')),
  error_message TEXT,

  -- 性能指标
  execution_time_ms INTEGER,  -- 执行耗时（毫秒）
  deepseek_latency_ms INTEGER,  -- DeepSeek API耗时
  e2b_execution_ms INTEGER,  -- E2B沙箱执行耗时
  validation_ms INTEGER,  -- 验证耗时

  -- 成本追踪
  quota_deducted BOOLEAN DEFAULT TRUE,  -- 是否扣除配额
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 4),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引优化查询
CREATE INDEX idx_ai_creation_audit_logs_user_id ON public.ai_creation_audit_logs(user_id);
CREATE INDEX idx_ai_creation_audit_logs_action ON public.ai_creation_audit_logs(action);
CREATE INDEX idx_ai_creation_audit_logs_status ON public.ai_creation_audit_logs(status);
CREATE INDEX idx_ai_creation_audit_logs_question_id ON public.ai_creation_audit_logs(question_id);
CREATE INDEX idx_ai_creation_audit_logs_created_at ON public.ai_creation_audit_logs(created_at DESC);

-- RLS策略：用户���能查看自己的审计日志
ALTER TABLE public.ai_creation_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可查看自己的审计日志"
  ON public.ai_creation_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "系统可创建审计日志"
  ON public.ai_creation_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.ai_creation_audit_logs IS '审计日志：追踪所有AI创作操作（生成、改编、提交、审核）';
COMMENT ON COLUMN public.ai_creation_audit_logs.execution_time_ms IS '总执行耗时（毫秒），用于性能监控';
COMMENT ON COLUMN public.ai_creation_audit_logs.quota_deducted IS '本次操作是否扣除用户配额（重试可能不扣）';

-- ----------------------------------------------------------------------------
-- 辅助函数 1: 获取或创建用户配额
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_or_create_user_quota(p_user_id UUID)
RETURNS public.ai_creation_quotas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota public.ai_creation_quotas;
BEGIN
  -- 尝试获取现有配额
  SELECT * INTO v_quota
  FROM public.ai_creation_quotas
  WHERE user_id = p_user_id;

  -- 如果不存在，创建默认配额
  IF NOT FOUND THEN
    INSERT INTO public.ai_creation_quotas (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_quota;
  END IF;

  -- 检查是否需要重置日配额
  IF v_quota.last_reset_date < CURRENT_DATE THEN
    UPDATE public.ai_creation_quotas
    SET
      daily_used = 0,
      failed_count_today = 0,
      last_reset_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_quota;
  END IF;

  RETURN v_quota;
END;
$$;

COMMENT ON FUNCTION get_or_create_user_quota IS '获取用户配额，不存在则创建默认配额，并自动重置日配额';

-- ----------------------------------------------------------------------------
-- 辅助函数 2: 检查配额（日限额、并发限制）
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_creation_quota(
  p_user_id UUID,
  OUT can_create BOOLEAN,
  OUT remaining INTEGER,
  OUT reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota public.ai_creation_quotas;
  v_concurrent_count INTEGER;
BEGIN
  -- 获取配额信息
  v_quota := get_or_create_user_quota(p_user_id);

  -- 检查日配额
  IF v_quota.daily_used >= v_quota.daily_limit THEN
    can_create := FALSE;
    remaining := 0;
    reason := '已达到每日生成限额';
    RETURN;
  END IF;

  -- 检查并发限制
  SELECT COUNT(*) INTO v_concurrent_count
  FROM public.ai_created_questions
  WHERE user_id = p_user_id
    AND generation_status = 'generating';

  IF v_concurrent_count >= v_quota.concurrent_limit THEN
    can_create := FALSE;
    remaining := v_quota.daily_limit - v_quota.daily_used;
    reason := format('同时进行的任务数已达上限(%s)', v_quota.concurrent_limit);
    RETURN;
  END IF;

  -- 通过检查
  can_create := TRUE;
  remaining := v_quota.daily_limit - v_quota.daily_used;
  reason := NULL;
END;
$$;

COMMENT ON FUNCTION check_creation_quota IS '检查用户是否可以创建新的AI题目（日配额+并发限制）';

-- ----------------------------------------------------------------------------
-- 辅助函数 3: 扣除配额
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_creation_quota(
  p_user_id UUID,
  p_deduct_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- 原子性地扣除配额
  UPDATE public.ai_creation_quotas
  SET
    daily_used = daily_used + p_deduct_amount,
    total_generated = total_generated + p_deduct_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND daily_used + p_deduct_amount <= daily_limit;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count > 0;
END;
$$;

COMMENT ON FUNCTION deduct_creation_quota IS '原子性地扣除用户配额（确保不超过日限额）';

-- ----------------------------------------------------------------------------
-- 辅助函数 4: 回滚配额（失败时退还）
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rollback_creation_quota(
  p_user_id UUID,
  p_rollback_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ai_creation_quotas
  SET
    daily_used = GREATEST(0, daily_used - p_rollback_amount),
    total_generated = GREATEST(0, total_generated - p_rollback_amount),
    failed_count_today = failed_count_today + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION rollback_creation_quota IS '回滚配额（失败时退还），并增加失败计数';

-- ----------------------------------------------------------------------------
-- 辅助函数 5: 获取题目改编链路
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_question_lineage(p_question_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_current_id UUID;
  v_parent_chain JSONB[] := '{}';
  v_children JSONB;
BEGIN
  -- 向上追溯父题链路
  v_current_id := p_question_id;
  WHILE v_current_id IS NOT NULL LOOP
    SELECT jsonb_build_object(
      'id', id,
      'question_type', question_type,
      'difficulty', difficulty,
      'version', version,
      'created_at', created_at
    ), parent_question_id
    INTO v_parent_chain[array_length(v_parent_chain, 1) + 1], v_current_id
    FROM public.ai_created_questions
    WHERE id = v_current_id;
  END LOOP;

  -- 获取所有子改编
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'question_type', question_type,
    'difficulty', difficulty,
    'version', version,
    'created_at', created_at
  ))
  INTO v_children
  FROM public.ai_created_questions
  WHERE parent_question_id = p_question_id;

  -- 构建完整链路
  v_result := jsonb_build_object(
    'question_id', p_question_id,
    'parent_chain', array_to_json(v_parent_chain),
    'children', COALESCE(v_children, '[]'::jsonb),
    'depth', array_length(v_parent_chain, 1)
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_question_lineage IS '获取题目的完整改编链路（父题链+子改编）';

-- ----------------------------------------------------------------------------
-- 辅助函数 6: 提交AI题目到主题库
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_ai_question_to_library(
  p_question_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ai_question public.ai_created_questions;
  v_library_question_id UUID;
  v_mapped_type TEXT;
BEGIN
  -- 获取AI题目
  SELECT * INTO v_ai_question
  FROM public.ai_created_questions
  WHERE id = p_question_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '题目不存在或无权访问'
    );
  END IF;

  -- 检查是否已提交
  IF v_ai_question.submitted_to_library THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '题目已提交到题库'
    );
  END IF;

  -- 检查生成状态
  IF v_ai_question.generation_status != 'completed' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '题目尚未生成完成'
    );
  END IF;

  -- 题型映射：function/statistics/geometry → essay（带图解答题）
  v_mapped_type := 'essay';

  -- 插入主题库
  INSERT INTO public.questions (
    type,
    content,
    image_url,
    image_key,
    difficulty,
    metadata,
    created_by,
    created_at
  )
  VALUES (
    v_mapped_type,
    v_ai_question.question_text,
    v_ai_question.image_url,
    v_ai_question.image_key,
    v_ai_question.difficulty,
    jsonb_build_object(
      'source', 'ai_created',
      'ai_question_id', p_question_id,
      'question_type', v_ai_question.question_type,
      'diagram_type', v_ai_question.diagram_type,
      'python_code', v_ai_question.python_code,
      'generation_parameters', v_ai_question.generation_parameters,
      'coordinate_data', v_ai_question.coordinate_data
    ),
    p_user_id,
    NOW()
  )
  RETURNING id INTO v_library_question_id;

  -- 更新AI题目记录
  UPDATE public.ai_created_questions
  SET
    submitted_to_library = TRUE,
    library_question_id = v_library_question_id,
    submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_question_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'library_question_id', v_library_question_id,
    'ai_question_id', p_question_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION submit_ai_question_to_library IS '将AI创作的题目提交到主题库（带事务保护）';

-- ----------------------------------------------------------------------------
-- 视图：用户配额统计摘要
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW ai_creation_quota_summary AS
SELECT
  q.user_id,
  p.email,
  p.name,
  q.daily_limit,
  q.daily_used,
  q.daily_limit - q.daily_used AS daily_remaining,
  q.total_generated,
  q.total_cost_usd,
  (
    SELECT COUNT(*)
    FROM public.ai_created_questions
    WHERE user_id = q.user_id
      AND generation_status = 'generating'
  ) AS current_concurrent_tasks,
  q.concurrent_limit,
  q.last_reset_date,
  q.updated_at
FROM public.ai_creation_quotas q
JOIN public.profiles p ON q.user_id = p.id;

COMMENT ON VIEW ai_creation_quota_summary IS '用户配额统计摘要（含当前并发任务数）';

-- ============================================================================
-- 初始化默认模板数据
-- ============================================================================

-- 函数图像：线性函数模板
INSERT INTO public.ai_creation_templates (
  template_name,
  question_type,
  diagram_type,
  prompt_template,
  parameter_schema,
  default_parameters,
  description,
  difficulty
) VALUES (
  'function_linear',
  'function',
  'linear',
  '你是专业数学教育专家和Python程序员。生成线性函数 f(x) = ax + b 的可执行Python代码。

参数：
- 系数 a: {{coef_a}}
- 系数 b: {{coef_b}}
- 定义域: {{domain}}
- 难度: {{difficulty}}

必须输出JSON格式：
{
  "question_text": "已知函数 f(x) = {{coef_a}}x + {{coef_b}}，求函数图像。",
  "python_code": "import matplotlib.pyplot as plt...",
  "coordinates": {"y_intercept": [0, {{coef_b}}], "x_intercept": [{{-coef_b/coef_a}}, 0]}
}

代码约束：
1. 函数必须命名为 generate_diagram()
2. 返回字典 {"png": base64_str, "svg": base64_str}
3. 仅使用 matplotlib, numpy, base64, io
4. 包含网格、坐标轴标签、关键点标注
5. 图像尺寸：figsize=(8, 6)，dpi=150',
  '{
    "type": "object",
    "properties": {
      "coef_a": {"type": "number", "minimum": -10, "maximum": 10, "default": 2},
      "coef_b": {"type": "number", "minimum": -10, "maximum": 10, "default": 3},
      "domain": {"type": "array", "items": {"type": "number"}, "minItems": 2, "maxItems": 2, "default": [-10, 10]}
    },
    "required": ["coef_a", "coef_b", "domain"]
  }',
  '{"coef_a": 2, "coef_b": 3, "domain": [-10, 10]}',
  '线性函数图像生成模板（y = ax + b）',
  'easy'
);

-- 函数图像：二次函数模板
INSERT INTO public.ai_creation_templates (
  template_name,
  question_type,
  diagram_type,
  prompt_template,
  parameter_schema,
  default_parameters,
  description,
  difficulty
) VALUES (
  'function_quadratic',
  'function',
  'quadratic',
  '你是专业数学教育专家和Python程序员。生成二次函数 f(x) = ax² + bx + c 的可执行Python代码。

参数：
- 系数 a: {{coef_a}}
- 系数 b: {{coef_b}}
- 系数 c: {{coef_c}}
- 定义域: {{domain}}
- 难度: {{difficulty}}

必须输出JSON格式，包含顶点坐标、对称轴等关键信息。',
  '{
    "type": "object",
    "properties": {
      "coef_a": {"type": "number", "minimum": -5, "maximum": 5, "default": 1},
      "coef_b": {"type": "number", "minimum": -10, "maximum": 10, "default": 0},
      "coef_c": {"type": "number", "minimum": -10, "maximum": 10, "default": 0},
      "domain": {"type": "array", "items": {"type": "number"}, "minItems": 2, "maxItems": 2, "default": [-10, 10]}
    },
    "required": ["coef_a", "coef_b", "coef_c", "domain"]
  }',
  '{"coef_a": 1, "coef_b": 0, "coef_c": 0, "domain": [-10, 10]}',
  '二次函数图像生成模板（y = ax² + bx + c）',
  'medium'
);

-- ============================================================================
-- 迁移完成
-- ============================================================================
-- 已创建：
-- ✅ 4个核心表（ai_created_questions, ai_creation_quotas, ai_creation_templates, ai_creation_audit_logs）
-- ✅ 完整的索引和触发器
-- ✅ RLS策略保护所有表
-- ✅ 6个辅助函数（配额管理、改编链路、提交题库）
-- ✅ 1个统计视图
-- ✅ 2个初始模板（线性函数、二次函数）
--
-- 下一步：
-- 1. 运行迁移：supabase migration up 或 npm run migration:up
-- 2. 验证表结构：supabase db dump --schema public
-- 3. 配置环境变量（DEEPSEEK_API_KEY, E2B_API_KEY等）
-- 4. 开始实现核心库文件（deepseek-client.ts, e2b-sandbox.ts等）
-- ============================================================================
