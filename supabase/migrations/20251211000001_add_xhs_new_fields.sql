-- ============================================================================
-- 小红书爬虫系统 - 添加新字段
-- 创建时间: 2025-12-11
-- 功能: 添加收藏数(collects)和发布时间(publish_time)字段
-- ============================================================================

-- 添加收藏数字段
ALTER TABLE public.xhs_raw_posts
  ADD COLUMN IF NOT EXISTS collects INTEGER DEFAULT 0;

-- 添加发布时间字段
ALTER TABLE public.xhs_raw_posts
  ADD COLUMN IF NOT EXISTS publish_time TEXT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_xhs_raw_posts_collects
  ON public.xhs_raw_posts(collects DESC);

-- 注释说明
COMMENT ON COLUMN public.xhs_raw_posts.collects IS '帖子收藏数';
COMMENT ON COLUMN public.xhs_raw_posts.publish_time IS '帖子发布时间（原始格式）';
