-- 标签系统数据库迁移
-- 支持多维度二三级分类

-- ============================================
-- 1. 一级分类表
-- ============================================
CREATE TABLE IF NOT EXISTS public.tag_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'Tag',
  is_required BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.tag_categories IS '标签一级分类';
COMMENT ON COLUMN public.tag_categories.name IS '分类标识名（英文）';
COMMENT ON COLUMN public.tag_categories.display_name IS '分类显示名（中文）';
COMMENT ON COLUMN public.tag_categories.is_required IS '是否必选分类';

-- ============================================
-- 2. 二级分类表
-- ============================================
CREATE TABLE IF NOT EXISTS public.tag_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.tag_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, name)
);

COMMENT ON TABLE public.tag_subcategories IS '标签二级分类';

-- ============================================
-- 3. 标签表（三级）
-- ============================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.tag_categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES public.tag_subcategories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  is_preset BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, name)
);

COMMENT ON TABLE public.tags IS '标签（三级）';
COMMENT ON COLUMN public.tags.usage_count IS '使用次数';
COMMENT ON COLUMN public.tags.is_preset IS '是否预设标签';

-- ============================================
-- 4. 题目-标签关联表
-- ============================================
CREATE TABLE IF NOT EXISTS public.question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  question_table TEXT NOT NULL CHECK (question_table IN ('parsed_questions', 'questions')),
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'batch')),
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, question_table, tag_id)
);

COMMENT ON TABLE public.question_tags IS '题目-标签关联';
COMMENT ON COLUMN public.question_tags.source IS '标签来源：manual=手动, ai=AI推荐, batch=批量';
COMMENT ON COLUMN public.question_tags.confidence IS 'AI推荐置信度';

-- ============================================
-- 5. 用户常用标签表
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_frequent_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

COMMENT ON TABLE public.user_frequent_tags IS '用户常用标签';

-- ============================================
-- 6. 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tag_subcategories_category ON public.tag_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON public.tags(category_id);
CREATE INDEX IF NOT EXISTS idx_tags_subcategory ON public.tags(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON public.tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_question_tags_question ON public.question_tags(question_id, question_table);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag ON public.question_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_user_frequent_tags_user ON public.user_frequent_tags(user_id);

-- ============================================
-- 7. RLS 策略
-- ============================================
ALTER TABLE public.tag_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_frequent_tags ENABLE ROW LEVEL SECURITY;

-- tag_categories: 所有人可读
CREATE POLICY "Anyone can read tag categories"
  ON public.tag_categories FOR SELECT
  USING (true);

-- tag_subcategories: 所有人可读
CREATE POLICY "Anyone can read tag subcategories"
  ON public.tag_subcategories FOR SELECT
  USING (true);

-- tags: 所有人可读，认证用户可创建自定义标签
CREATE POLICY "Anyone can read tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create custom tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_preset = false);

-- question_tags: 认证用户可管理
CREATE POLICY "Authenticated users can manage question tags"
  ON public.question_tags FOR ALL
  USING (auth.uid() IS NOT NULL);

-- user_frequent_tags: 用户管理自己的常用标签
CREATE POLICY "Users can manage own frequent tags"
  ON public.user_frequent_tags FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- 8. 函数：增加标签使用次数
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_tag_usage(p_tag_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tags
  SET usage_count = usage_count + 1
  WHERE id = p_tag_id;
END;
$$;

-- ============================================
-- 9. 函数：更新用户常用标签
-- ============================================
CREATE OR REPLACE FUNCTION public.update_user_frequent_tag(
  p_user_id UUID,
  p_tag_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_frequent_tags (user_id, tag_id, usage_count, last_used_at)
  VALUES (p_user_id, p_tag_id, 1, NOW())
  ON CONFLICT (user_id, tag_id)
  DO UPDATE SET
    usage_count = user_frequent_tags.usage_count + 1,
    last_used_at = NOW();
END;
$$;

-- ============================================
-- 10. 插入预设数据
-- ============================================

-- 一级分类
INSERT INTO public.tag_categories (name, display_name, color, icon, is_required, sort_order) VALUES
('knowledge', '知识点', '#3B82F6', 'BookOpen', TRUE, 1),
('difficulty', '难度', '#F59E0B', 'BarChart', TRUE, 2),
('grade', '年级', '#8B5CF6', 'GraduationCap', FALSE, 3),
('question_type', '题型', '#10B981', 'FileQuestion', FALSE, 4),
('source', '来源', '#EC4899', 'FileText', FALSE, 5),
('region', '地区', '#06B6D4', 'MapPin', FALSE, 6),
('exam_type', '考试类型', '#EF4444', 'Award', FALSE, 7),
('custom', '自定义', '#6B7280', 'Tag', FALSE, 8)
ON CONFLICT (name) DO NOTHING;

-- 二级分类：知识点
INSERT INTO public.tag_subcategories (category_id, name, display_name, sort_order)
SELECT c.id, s.name, s.display_name, s.sort_order
FROM public.tag_categories c
CROSS JOIN (VALUES
  ('numbers_algebra', '数与式', 1),
  ('equations_inequalities', '方程与不等式', 2),
  ('functions', '函数', 3),
  ('geometry', '几何', 4),
  ('statistics_probability', '统计与概率', 5)
) AS s(name, display_name, sort_order)
WHERE c.name = 'knowledge'
ON CONFLICT DO NOTHING;

-- 二级分类：年级
INSERT INTO public.tag_subcategories (category_id, name, display_name, sort_order)
SELECT c.id, s.name, s.display_name, s.sort_order
FROM public.tag_categories c
CROSS JOIN (VALUES
  ('junior_high', '初中', 1),
  ('senior_high', '高中', 2)
) AS s(name, display_name, sort_order)
WHERE c.name = 'grade'
ON CONFLICT DO NOTHING;

-- 二级分类：来源
INSERT INTO public.tag_subcategories (category_id, name, display_name, sort_order)
SELECT c.id, s.name, s.display_name, s.sort_order
FROM public.tag_categories c
CROSS JOIN (VALUES
  ('real_exam', '真题', 1),
  ('textbook', '教辅', 2)
) AS s(name, display_name, sort_order)
WHERE c.name = 'source'
ON CONFLICT DO NOTHING;

-- 难度标签
INSERT INTO public.tags (category_id, name, display_name, is_preset)
SELECT c.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
CROSS JOIN (VALUES
  ('easy', '基础题'),
  ('medium', '中档题'),
  ('hard', '压轴题')
) AS t(name, display_name)
WHERE c.name = 'difficulty'
ON CONFLICT DO NOTHING;

-- 题型标签
INSERT INTO public.tags (category_id, name, display_name, is_preset)
SELECT c.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
CROSS JOIN (VALUES
  ('choice', '选择题'),
  ('fill', '填空题'),
  ('calculation', '计算题'),
  ('proof', '证明题'),
  ('comprehensive', '综合题'),
  ('application', '应用题')
) AS t(name, display_name)
WHERE c.name = 'question_type'
ON CONFLICT DO NOTHING;

-- 地区标签
INSERT INTO public.tags (category_id, name, display_name, is_preset)
SELECT c.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
CROSS JOIN (VALUES
  ('wuhan', '武汉'),
  ('beijing', '北京'),
  ('shanghai', '上海'),
  ('guangzhou', '广州'),
  ('shenzhen', '深圳'),
  ('other', '其他')
) AS t(name, display_name)
WHERE c.name = 'region'
ON CONFLICT DO NOTHING;

-- 考试类型标签
INSERT INTO public.tags (category_id, name, display_name, is_preset)
SELECT c.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
CROSS JOIN (VALUES
  ('zhongkao', '中考'),
  ('gaokao', '高考'),
  ('competition', '竞赛'),
  ('unit_test', '单元测试'),
  ('comprehensive_test', '综合测试')
) AS t(name, display_name)
WHERE c.name = 'exam_type'
ON CONFLICT DO NOTHING;

-- 知识点标签（带二级分类）
-- 数与式
INSERT INTO public.tags (category_id, subcategory_id, name, display_name, is_preset)
SELECT c.id, sc.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
JOIN public.tag_subcategories sc ON sc.category_id = c.id AND sc.name = 'numbers_algebra'
CROSS JOIN (VALUES
  ('rational_numbers', '有理数'),
  ('algebraic_expressions', '整式的加减'),
  ('fractions', '分式'),
  ('quadratic_radicals', '二次根式')
) AS t(name, display_name)
WHERE c.name = 'knowledge'
ON CONFLICT DO NOTHING;

-- 方程与不等式
INSERT INTO public.tags (category_id, subcategory_id, name, display_name, is_preset)
SELECT c.id, sc.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
JOIN public.tag_subcategories sc ON sc.category_id = c.id AND sc.name = 'equations_inequalities'
CROSS JOIN (VALUES
  ('linear_equation', '一元一次方程'),
  ('system_equations', '二元一次方程组'),
  ('quadratic_equation', '一元二次方程'),
  ('fractional_equation', '分式方程'),
  ('linear_inequality', '一元一次不等式'),
  ('inequality_system', '一元一次不等式组')
) AS t(name, display_name)
WHERE c.name = 'knowledge'
ON CONFLICT DO NOTHING;

-- 函数
INSERT INTO public.tags (category_id, subcategory_id, name, display_name, is_preset)
SELECT c.id, sc.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
JOIN public.tag_subcategories sc ON sc.category_id = c.id AND sc.name = 'functions'
CROSS JOIN (VALUES
  ('function_basics', '函数基础'),
  ('linear_function', '一次函数'),
  ('inverse_proportional', '反比例函数'),
  ('quadratic_function', '二次函数')
) AS t(name, display_name)
WHERE c.name = 'knowledge'
ON CONFLICT DO NOTHING;

-- 几何
INSERT INTO public.tags (category_id, subcategory_id, name, display_name, is_preset)
SELECT c.id, sc.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
JOIN public.tag_subcategories sc ON sc.category_id = c.id AND sc.name = 'geometry'
CROSS JOIN (VALUES
  ('geometry_basics', '几何图形初步'),
  ('parallel_lines', '相交线与平行线'),
  ('triangles', '三角形'),
  ('congruent_triangles', '全等三角形'),
  ('axisymmetry', '轴对称'),
  ('pythagorean_theorem', '勾股定理'),
  ('quadrilaterals', '四边形'),
  ('similar_triangles', '相似三角形'),
  ('right_triangle', '解直角三角形'),
  ('circles', '圆'),
  ('projection_views', '投影与视图')
) AS t(name, display_name)
WHERE c.name = 'knowledge'
ON CONFLICT DO NOTHING;

-- 统计与概率
INSERT INTO public.tags (category_id, subcategory_id, name, display_name, is_preset)
SELECT c.id, sc.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
JOIN public.tag_subcategories sc ON sc.category_id = c.id AND sc.name = 'statistics_probability'
CROSS JOIN (VALUES
  ('data_collection', '数据的收集整理'),
  ('probability_basics', '概率初步')
) AS t(name, display_name)
WHERE c.name = 'knowledge'
ON CONFLICT DO NOTHING;

-- 年级标签（带二级分类）
-- 初中
INSERT INTO public.tags (category_id, subcategory_id, name, display_name, is_preset)
SELECT c.id, sc.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
JOIN public.tag_subcategories sc ON sc.category_id = c.id AND sc.name = 'junior_high'
CROSS JOIN (VALUES
  ('grade_7_1', '七年级上'),
  ('grade_7_2', '七年级下'),
  ('grade_8_1', '八年级上'),
  ('grade_8_2', '八年级下'),
  ('grade_9_1', '九年级上'),
  ('grade_9_2', '九年级下')
) AS t(name, display_name)
WHERE c.name = 'grade'
ON CONFLICT DO NOTHING;

-- 高中
INSERT INTO public.tags (category_id, subcategory_id, name, display_name, is_preset)
SELECT c.id, sc.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
JOIN public.tag_subcategories sc ON sc.category_id = c.id AND sc.name = 'senior_high'
CROSS JOIN (VALUES
  ('grade_10', '高一'),
  ('grade_11', '高二'),
  ('grade_12', '高三')
) AS t(name, display_name)
WHERE c.name = 'grade'
ON CONFLICT DO NOTHING;

-- 来源标签（带二级分类）
-- 真题
INSERT INTO public.tags (category_id, subcategory_id, name, display_name, is_preset)
SELECT c.id, sc.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
JOIN public.tag_subcategories sc ON sc.category_id = c.id AND sc.name = 'real_exam'
CROSS JOIN (VALUES
  ('zhongkao_real', '中考真题'),
  ('mock_exam', '模拟考'),
  ('monthly_exam', '月考'),
  ('midterm', '期中'),
  ('final_exam', '期末')
) AS t(name, display_name)
WHERE c.name = 'source'
ON CONFLICT DO NOTHING;

-- 教辅
INSERT INTO public.tags (category_id, subcategory_id, name, display_name, is_preset)
SELECT c.id, sc.id, t.name, t.display_name, TRUE
FROM public.tag_categories c
JOIN public.tag_subcategories sc ON sc.category_id = c.id AND sc.name = 'textbook'
CROSS JOIN (VALUES
  ('textbook_example', '课本例题'),
  ('workbook', '练习册'),
  ('competition_question', '竞赛题')
) AS t(name, display_name)
WHERE c.name = 'source'
ON CONFLICT DO NOTHING;

-- 来源：自编题（无二级分类）
INSERT INTO public.tags (category_id, name, display_name, is_preset)
SELECT c.id, 'self_made', '自编题', TRUE
FROM public.tag_categories c
WHERE c.name = 'source'
ON CONFLICT DO NOTHING;
