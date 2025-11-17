-- 知识点管理表
-- 用于动态管理知识点，避免硬编码

CREATE TABLE IF NOT EXISTS knowledge_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT,  -- 分类：数学、语文、英语等
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_knowledge_points_category ON knowledge_points(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_points_name ON knowledge_points(name);
CREATE INDEX IF NOT EXISTS idx_knowledge_points_active ON knowledge_points(is_active);

-- 初始化数学知识点数据
INSERT INTO knowledge_points (name, category, display_order) VALUES
  ('有理数加法', '数学', 10),
  ('有理数减法', '数学', 20),
  ('有理数乘法', '数学', 30),
  ('有理数除法', '数学', 40),
  ('有理数混合运算', '数学', 50),
  ('整式加减', '数学', 60),
  ('整式乘法', '数学', 70),
  ('整式除法', '数学', 80),
  ('因式分解', '数学', 90),
  ('一元一次方程', '数学', 100),
  ('二元一次方程组', '数学', 110),
  ('一元二次方程', '数学', 120),
  ('分式方程', '数学', 130),
  ('一次函数', '数学', 140),
  ('反比例函数', '数学', 150),
  ('二次函数', '数学', 160),
  ('平面直角坐标系', '数学', 170),
  ('函数图像', '数学', 180),
  ('相交线与平行线', '数学', 190),
  ('三角形', '数学', 200),
  ('等腰三角形', '数学', 210),
  ('直角三角形', '数学', 220),
  ('勾股定理', '数学', 230),
  ('全等三角形', '数学', 240),
  ('相似三角形', '数学', 250),
  ('四边形', '数学', 260),
  ('平行四边形', '数学', 270),
  ('矩形', '数学', 280),
  ('菱形', '数学', 290),
  ('正方形', '数学', 300),
  ('梯形', '数学', 310),
  ('多边形', '数学', 320),
  ('圆的性质', '数学', 330),
  ('圆周角', '数学', 340),
  ('切线', '数学', 350),
  ('轴对称', '数学', 360),
  ('旋转', '数学', 370),
  ('平移', '数学', 380),
  ('数据的收集', '数学', 390),
  ('数据的整理', '数学', 400),
  ('数据的分析', '数学', 410),
  ('概率初步', '数学', 420),
  ('样本与总体', '数学', 430),
  ('锐角三角函数', '数学', 440),
  ('解直角三角形', '数学', 450),
  ('统计图表', '数学', 460),
  ('平均数', '数学', 470),
  ('中位数', '数学', 480),
  ('众数', '数学', 490),
  ('方差', '数学', 500),
  ('不等式', '数学', 510),
  ('不等式组', '数学', 520)
ON CONFLICT (name) DO NOTHING;

-- RLS策略
ALTER TABLE knowledge_points ENABLE ROW LEVEL SECURITY;

-- 所有认证用户可以查看知识点
CREATE POLICY "Authenticated users can view knowledge points"
  ON knowledge_points FOR SELECT
  USING (auth.role() = 'authenticated');

-- 教师可以管理知识点
CREATE POLICY "Teachers can manage knowledge points"
  ON knowledge_points FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- 插入说明注释
COMMENT ON TABLE knowledge_points IS '知识点表 - 用于题目分类和筛选';
COMMENT ON COLUMN knowledge_points.category IS '知识点分类：数学、语文、英语等';
COMMENT ON COLUMN knowledge_points.display_order IS '显示顺序，数字越小越靠前';
COMMENT ON COLUMN knowledge_points.is_active IS '是否启用，false表示已弃用';
