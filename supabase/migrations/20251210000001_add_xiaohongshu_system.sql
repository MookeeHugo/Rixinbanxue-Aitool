-- ============================================================================
-- 小红书AI运营系统 - 数据库迁移
-- 创建时间: 2025-12-10
-- 功能: 爬虫、AI分析、内容重写、配额管理
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 表1: xhs_raw_posts（爬取的原始帖子）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xhs_raw_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 小红书原始数据
  post_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images_json JSONB DEFAULT '[]'::jsonb,  -- 图片URL数组

  -- 互动数据
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,

  -- 作者信息（脱敏处理，不暴露avatar）
  author_id TEXT NOT NULL,  -- 不暴露给前端
  author_name TEXT,  -- 可展示

  -- 分类与标签
  tags TEXT[] DEFAULT '{}',
  category TEXT,

  -- 爬取元数据
  crawled_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  crawl_keyword TEXT NOT NULL,
  crawl_source TEXT DEFAULT 'search',

  -- AI分析结果（Gemini填充）
  ai_analysis JSONB,  -- 爆款因素分析
  analyzed_at TIMESTAMPTZ,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引（包含Codex建议的复合索引）
CREATE INDEX idx_xhs_raw_posts_crawled_by ON public.xhs_raw_posts(crawled_by);
CREATE INDEX idx_xhs_raw_posts_likes ON public.xhs_raw_posts(likes DESC);
CREATE INDEX idx_xhs_raw_posts_keyword_likes ON public.xhs_raw_posts(crawl_keyword, likes DESC);  -- 复合索引优化查询
CREATE INDEX idx_xhs_raw_posts_created_at ON public.xhs_raw_posts(created_at DESC);

-- 防重复写入约束（Codex建议）
CREATE UNIQUE INDEX idx_xhs_raw_posts_unique_post ON public.xhs_raw_posts(post_id);

-- 自动更新时间戳触发器
CREATE TRIGGER set_updated_at_xhs_raw_posts
  BEFORE UPDATE ON public.xhs_raw_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS策略
ALTER TABLE public.xhs_raw_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可查看自己爬取的帖子"
  ON public.xhs_raw_posts FOR SELECT
  USING (auth.uid() = crawled_by);

CREATE POLICY "用户可创建爬取记录"
  ON public.xhs_raw_posts FOR INSERT
  WITH CHECK (auth.uid() = crawled_by);

-- Codex建议：添加UPDATE策略（用于服务端更新ai_analysis）
CREATE POLICY "服务端可更新AI分析"
  ON public.xhs_raw_posts FOR UPDATE
  USING (true)  -- 服务角色可更新
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 表2: xhs_ai_drafts（AI生成的草稿）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xhs_ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联原始帖子
  source_post_id UUID REFERENCES public.xhs_raw_posts(id) ON DELETE CASCADE,

  -- 用户上下文
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_persona TEXT NOT NULL,  -- 用户身份：10年数学老师

  -- AI生成内容
  generated_title TEXT NOT NULL,
  generated_content TEXT NOT NULL,
  generated_tags TEXT[] DEFAULT '{}',

  -- 原创性检测（Codex建议：增强字段）
  similarity_score DECIMAL(5, 2),  -- 与原文相似度 0-100
  similarity_details JSONB,  -- 详细相似度信息（分段、词汇多样性）
  originality_passed BOOLEAN DEFAULT FALSE,  -- 是否通过原创性检测

  -- AI元数据
  model_used TEXT NOT NULL,  -- deepseek
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0,

  -- 状态管理
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'published')),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,  -- Codex建议：预留发布时间字段

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_xhs_ai_drafts_user_id ON public.xhs_ai_drafts(user_id);
CREATE INDEX idx_xhs_ai_drafts_status ON public.xhs_ai_drafts(status);
CREATE INDEX idx_xhs_ai_drafts_source_post ON public.xhs_ai_drafts(source_post_id);
CREATE INDEX idx_xhs_ai_drafts_created_at ON public.xhs_ai_drafts(created_at DESC);

-- 自动更新时间戳触发器
CREATE TRIGGER set_updated_at_xhs_ai_drafts
  BEFORE UPDATE ON public.xhs_ai_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS策略
ALTER TABLE public.xhs_ai_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可管理自己的草稿"
  ON public.xhs_ai_drafts FOR ALL
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 表3: xhs_crawl_quotas（爬虫配额管理）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xhs_crawl_quotas (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 爬虫配额
  daily_crawl_limit INTEGER NOT NULL DEFAULT 50,
  daily_crawl_used INTEGER NOT NULL DEFAULT 0,
  hourly_crawl_limit INTEGER NOT NULL DEFAULT 10,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- AI生成配额（复用ai_creation_quotas的逻辑）
  daily_generation_limit INTEGER NOT NULL DEFAULT 20,
  daily_generation_used INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 自动更新时间戳触发器
CREATE TRIGGER set_updated_at_xhs_crawl_quotas
  BEFORE UPDATE ON public.xhs_crawl_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS策略
ALTER TABLE public.xhs_crawl_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可查看自己的配额"
  ON public.xhs_crawl_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的配额"
  ON public.xhs_crawl_quotas FOR UPDATE
  USING (auth.uid() = user_id);

-- 服务端可插入配额（首次创建）
CREATE POLICY "服务端可创建配额"
  ON public.xhs_crawl_quotas FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 数据库函数：获取或创建用户配额
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_or_create_xhs_crawl_quota(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  daily_crawl_limit INTEGER,
  daily_crawl_used INTEGER,
  hourly_crawl_limit INTEGER,
  last_reset_date DATE,
  daily_generation_limit INTEGER,
  daily_generation_used INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查是否存在
  IF NOT EXISTS (SELECT 1 FROM public.xhs_crawl_quotas WHERE xhs_crawl_quotas.user_id = p_user_id) THEN
    INSERT INTO public.xhs_crawl_quotas (user_id)
    VALUES (p_user_id);
  END IF;

  -- 返回配额信息
  RETURN QUERY
  SELECT
    xhs_crawl_quotas.user_id,
    xhs_crawl_quotas.daily_crawl_limit,
    xhs_crawl_quotas.daily_crawl_used,
    xhs_crawl_quotas.hourly_crawl_limit,
    xhs_crawl_quotas.last_reset_date,
    xhs_crawl_quotas.daily_generation_limit,
    xhs_crawl_quotas.daily_generation_used
  FROM public.xhs_crawl_quotas
  WHERE xhs_crawl_quotas.user_id = p_user_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 数据库函数：检查爬虫配额
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_xhs_crawl_quota(
  p_user_id UUID
)
RETURNS TABLE (
  can_crawl BOOLEAN,
  remaining_daily INTEGER,
  remaining_hourly INTEGER,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota RECORD;
  v_hourly_count INTEGER;
  v_today DATE;
BEGIN
  -- 获取或创建配额
  SELECT * INTO v_quota
  FROM get_or_create_xhs_crawl_quota(p_user_id)
  LIMIT 1;

  v_today := CURRENT_DATE;

  -- 检查是否需要重置（新的一天）
  IF v_quota.last_reset_date < v_today THEN
    UPDATE public.xhs_crawl_quotas
    SET
      daily_crawl_used = 0,
      daily_generation_used = 0,
      last_reset_date = v_today
    WHERE xhs_crawl_quotas.user_id = p_user_id;

    v_quota.daily_crawl_used := 0;
  END IF;

  -- 检查每日限额
  IF v_quota.daily_crawl_used >= v_quota.daily_crawl_limit THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      0,
      '已达到每日爬取限额';
    RETURN;
  END IF;

  -- 检查每小时限额
  SELECT COUNT(*) INTO v_hourly_count
  FROM public.xhs_raw_posts
  WHERE
    crawled_by = p_user_id
    AND created_at >= NOW() - INTERVAL '1 hour';

  IF v_hourly_count >= v_quota.hourly_crawl_limit THEN
    RETURN QUERY SELECT
      FALSE,
      v_quota.daily_crawl_limit - v_quota.daily_crawl_used,
      0,
      '已达到每小时爬取限额';
    RETURN;
  END IF;

  -- 通过检查
  RETURN QUERY SELECT
    TRUE,
    v_quota.daily_crawl_limit - v_quota.daily_crawl_used,
    v_quota.hourly_crawl_limit - v_hourly_count,
    NULL::TEXT;
END;
$$;

-- ----------------------------------------------------------------------------
-- 数据库函数：扣除爬虫配额
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_xhs_crawl_quota(
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
  -- 原子性扣除配额
  UPDATE public.xhs_crawl_quotas
  SET
    daily_crawl_used = daily_crawl_used + p_deduct_amount,
    updated_at = NOW()
  WHERE
    user_id = p_user_id
    AND daily_crawl_used + p_deduct_amount <= daily_crawl_limit;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count > 0;
END;
$$;

-- ----------------------------------------------------------------------------
-- 数据库函数：回滚爬虫配额
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rollback_xhs_crawl_quota(
  p_user_id UUID,
  p_rollback_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.xhs_crawl_quotas
  SET
    daily_crawl_used = GREATEST(0, daily_crawl_used - p_rollback_amount),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------------------
-- 注释说明
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.xhs_raw_posts IS '小红书爬取的原始帖子，包含AI分析结果';
COMMENT ON TABLE public.xhs_ai_drafts IS 'AI生成的草稿，包含原创性检测结果';
COMMENT ON TABLE public.xhs_crawl_quotas IS '爬虫和AI生成的配额管理';
COMMENT ON FUNCTION get_or_create_xhs_crawl_quota IS '获取或创建用户的爬虫配额记录';
COMMENT ON FUNCTION check_xhs_crawl_quota IS '检查用户是否可以进行爬虫操作（每日+每小时限额）';
COMMENT ON FUNCTION deduct_xhs_crawl_quota IS '扣除爬虫配额（原子操作）';
COMMENT ON FUNCTION rollback_xhs_crawl_quota IS '回滚爬虫配额（失败时退还）';
