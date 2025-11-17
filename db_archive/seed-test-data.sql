-- ========================================
-- 日新教学平台 - 测试数据脚本
-- ========================================
-- 使用说明：
-- 1. 在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- 2. 需要先注册一个教师账号和一个学生账号
-- 3. 将下面的 UUID 替换为实际的用户 ID
-- ========================================

-- 注意：请先注册账号，然后替换以下 UUID
-- 教师账号：teacher@test.com / password: 123456
-- 学生账号：student@test.com / password: 123456

-- 临时变量（请替换为实际的 user ID）
DO $$
DECLARE
  teacher_id uuid := 'YOUR_TEACHER_UUID_HERE';  -- 替换为教师的 UUID
  student_id uuid := 'YOUR_STUDENT_UUID_HERE';  -- 替换为学生的 UUID
  class_id_1 uuid;
  class_id_2 uuid;
  paper_id_1 uuid;
  paper_id_2 uuid;
  assignment_id_1 uuid;
  assignment_id_2 uuid;
  question_ids uuid[];
  temp_id uuid;
BEGIN

-- ========================================
-- 1. 插入测试题目 (30道题)
-- ========================================

-- 选择题 - 有理数 (10道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, options, created_by) VALUES
('计算: (-3) + (+5) = ?', 'choice', ARRAY['有理数的加减'], 'easy', 'B', '{"A": "-8", "B": "2", "C": "-2", "D": "8"}', teacher_id),
('计算: (-2) × (-6) = ?', 'choice', ARRAY['有理数的乘除'], 'easy', 'C', '{"A": "-12", "B": "-4", "C": "12", "D": "4"}', teacher_id),
('下列各数中，是负数的是( )', 'choice', ARRAY['有理数的概念'], 'easy', 'B', '{"A": "0", "B": "-5", "C": "3", "D": "1/2"}', teacher_id),
('计算: |-5| = ?', 'choice', ARRAY['绝对值'], 'easy', 'D', '{"A": "-5", "B": "0", "C": "1/5", "D": "5"}', teacher_id),
('比较大小: -3 ___ -5', 'choice', ARRAY['有理数的大小比较'], 'easy', 'A', '{"A": ">", "B": "<", "C": "=", "D": "无法比较"}', teacher_id);

-- 选择题 - 整式 (5道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, options, created_by) VALUES
('化简: 3x + 2x = ?', 'choice', ARRAY['整式的加减'], 'easy', 'B', '{"A": "6x", "B": "5x", "C": "5x²", "D": "6"}', teacher_id),
('计算: (2x)³ = ?', 'choice', ARRAY['幂的运算'], 'medium', 'C', '{"A": "2x³", "B": "6x³", "C": "8x³", "D": "8x"}', teacher_id),
('展开: (x+2)(x-2) = ?', 'choice', ARRAY['平方差公式'], 'medium', 'A', '{"A": "x²-4", "B": "x²+4", "C": "x²-2", "D": "2x-4"}', teacher_id),
('因式分解: x² - 9 = ?', 'choice', ARRAY['因式分解'], 'medium', 'D', '{"A": "(x-3)²", "B": "(x+3)²", "C": "x(x-9)", "D": "(x+3)(x-3)"}', teacher_id),
('化简: 2(x+1) - 3(x-1) = ?', 'choice', ARRAY['整式的加减'], 'medium', 'B', '{"A": "-x+5", "B": "-x+5", "C": "5x-1", "D": "x+5"}', teacher_id);

-- 选择题 - 方程 (5道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, options, created_by) VALUES
('解方程: x + 5 = 8，则 x = ?', 'choice', ARRAY['一元一次方程'], 'easy', 'C', '{"A": "13", "B": "-3", "C": "3", "D": "5"}', teacher_id),
('解方程: 2x = 10，则 x = ?', 'choice', ARRAY['一元一次方程'], 'easy', 'B', '{"A": "20", "B": "5", "C": "2", "D": "10"}', teacher_id),
('解方程: x² = 16，正数解为?', 'choice', ARRAY['一元二次方程'], 'medium', 'A', '{"A": "4", "B": "-4", "C": "2", "D": "8"}', teacher_id),
('方程 3x - 6 = 0 的解是?', 'choice', ARRAY['一元一次方程'], 'easy', 'D', '{"A": "3", "B": "-2", "C": "6", "D": "2"}', teacher_id),
('解方程组 {x+y=5, x-y=1}，则 x = ?', 'choice', ARRAY['二元一次方程组'], 'medium', 'C', '{"A": "2", "B": "4", "C": "3", "D": "5"}', teacher_id);

-- 填空题 (5道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, created_by) VALUES
('计算: 3 + 4 × 2 = ___', 'fill', ARRAY['有理数的混合运算'], 'easy', '11', teacher_id),
('化简: 5a - 3a = ___', 'fill', ARRAY['整式的加减'], 'easy', '2a', teacher_id),
('若 x = 2，则 3x + 1 = ___', 'fill', ARRAY['代数式的值'], 'easy', '7', teacher_id),
('分解因式: a² - b² = ___', 'fill', ARRAY['因式分解'], 'medium', '(a+b)(a-b)', teacher_id),
('勾股定理: 直角三角形两直角边为 3 和 4，斜边长为 ___', 'fill', ARRAY['勾股定理'], 'medium', '5', teacher_id);

-- 解答题 (5道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, created_by) VALUES
('解方程: 2(x-1) + 3 = 7，写出完整解题步骤。', 'essay', ARRAY['一元一次方程'], 'medium', '解：2(x-1) + 3 = 7\n2x - 2 + 3 = 7\n2x + 1 = 7\n2x = 6\nx = 3', teacher_id),
('计算: (x+1)² - (x-1)²，并化简。', 'essay', ARRAY['整式的乘法'], 'medium', '解：(x+1)² - (x-1)²\n= x²+2x+1 - (x²-2x+1)\n= x²+2x+1 - x²+2x-1\n= 4x', teacher_id),
('已知一个长方形的长为 2x+3，宽为 x-1，求其周长（用 x 表示）。', 'essay', ARRAY['列代数式'], 'medium', '解：周长 = 2(长+宽)\n= 2[(2x+3)+(x-1)]\n= 2(3x+2)\n= 6x+4', teacher_id),
('化简求值: 3(a+b) - 2(a-b)，其中 a=2, b=1', 'essay', ARRAY['整式的加减'], 'medium', '解：3(a+b) - 2(a-b)\n= 3a+3b-2a+2b\n= a+5b\n当 a=2, b=1 时\n原式 = 2+5×1 = 7', teacher_id),
('解二元一次方程组: {2x+y=7, x-y=2}', 'essay', ARRAY['二元一次方程组'], 'hard', '解：{2x+y=7 ①\n    x-y=2  ②\n①+②得: 3x=9, x=3\n将 x=3 代入②: 3-y=2, y=1\n所以 x=3, y=1', teacher_id);

-- 保存所有题目ID到数组
SELECT array_agg(id ORDER BY created_at) INTO question_ids FROM questions WHERE created_by = teacher_id;

-- ========================================
-- 2. 创建班级 (2个)
-- ========================================

INSERT INTO classes (name, grade, class_code, teacher_id) VALUES
('初一(1)班', '初一', 'MATH01', teacher_id) RETURNING id INTO class_id_1;

INSERT INTO classes (name, grade, class_code, teacher_id) VALUES
('初二(3)班', '初二', 'MATH23', teacher_id) RETURNING id INTO class_id_2;

-- ========================================
-- 3. 创建试卷 (2个)
-- ========================================

-- 试卷1: 有理数与整式基础练习 (前15道题)
INSERT INTO papers (name, question_ids, created_by) VALUES
('有理数与整式基础练习', question_ids[1:15], teacher_id) RETURNING id INTO paper_id_1;

-- 试卷2: 方程综合测试 (10道题：选择题10-15 + 填空题1-5)
INSERT INTO papers (name, question_ids, created_by) VALUES
('方程综合测试', array_cat(question_ids[10:15], question_ids[16:20]), teacher_id) RETURNING id INTO paper_id_2;

-- ========================================
-- 4. 发布作业 (2个)
-- ========================================

-- 作业1: 初一(1)班 - 基础练习（已截止）
INSERT INTO assignments (class_id, paper_id, deadline, status, created_by) VALUES
(class_id_1, paper_id_1, NOW() - INTERVAL '2 days', 'published', teacher_id) RETURNING id INTO assignment_id_1;

-- 作业2: 初二(3)班 - 方程测试（进行中）
INSERT INTO assignments (class_id, paper_id, deadline, status, created_by) VALUES
(class_id_2, paper_id_2, NOW() + INTERVAL '3 days', 'published', teacher_id) RETURNING id INTO assignment_id_2;

-- ========================================
-- 5. 学生提交作业 (2份，包含错题)
-- ========================================

-- 学生提交作业1：基础练习（15道题，正确10道，错误5道）
INSERT INTO submissions (assignment_id, student_id, answers, score, submitted_at) VALUES
(assignment_id_1, student_id, jsonb_build_object(
  question_ids[1]::text, 'B',   -- 正确
  question_ids[2]::text, 'A',   -- 错误(正确答案是C)
  question_ids[3]::text, 'B',   -- 正确
  question_ids[4]::text, 'D',   -- 正确
  question_ids[5]::text, 'B',   -- 错误(正确答案是A)
  question_ids[6]::text, 'B',   -- 正确
  question_ids[7]::text, 'C',   -- 正确
  question_ids[8]::text, 'A',   -- 正确
  question_ids[9]::text, 'C',   -- 错误(正确答案是D)
  question_ids[10]::text, 'B',  -- 正确
  question_ids[11]::text, 'C',  -- 正确
  question_ids[12]::text, 'B',  -- 正确
  question_ids[13]::text, 'A',  -- 错误(正确答案是D)
  question_ids[14]::text, 'D',  -- 正确
  question_ids[15]::text, 'A'   -- 错误(正确答案是B)
), 66.7, NOW() - INTERVAL '1 day');

-- 学生提交作业2：方程测试（10道题，正确7道，错误3道）
INSERT INTO submissions (assignment_id, student_id, answers, score, submitted_at) VALUES
(assignment_id_2, student_id, jsonb_build_object(
  question_ids[10]::text, 'C',  -- 正确
  question_ids[11]::text, 'B',  -- 正确
  question_ids[12]::text, 'B',  -- 错误(正确答案是A)
  question_ids[13]::text, 'D',  -- 正确
  question_ids[14]::text, 'C',  -- 正确
  question_ids[16]::text, '11', -- 正确
  question_ids[17]::text, '3a', -- 错误(正确答案是2a)
  question_ids[18]::text, '7',  -- 正确
  question_ids[19]::text, '(a-b)(a+b)', -- 错误(顺序不同但实际正确，这里算错误示例)
  question_ids[20]::text, '5'   -- 正确
), 70.0, NOW() - INTERVAL '12 hours');

RAISE NOTICE '测试数据插入完成！';
RAISE NOTICE '班级1 ID: %', class_id_1;
RAISE NOTICE '班级2 ID: %', class_id_2;
RAISE NOTICE '试卷1 ID: %', paper_id_1;
RAISE NOTICE '试卷2 ID: %', paper_id_2;
RAISE NOTICE '作业1 ID: %', assignment_id_1;
RAISE NOTICE '作业2 ID: %', assignment_id_2;
RAISE NOTICE '共插入 30 道题目';
RAISE NOTICE '共插入 2 个班级';
RAISE NOTICE '共插入 2 个试卷';
RAISE NOTICE '共插入 2 个作业';
RAISE NOTICE '共插入 2 份学生提交';

END $$;

-- ========================================
-- 验证数据
-- ========================================
SELECT '题目总数:' as info, count(*) as count FROM questions;
SELECT '班级总数:' as info, count(*) as count FROM classes;
SELECT '试卷总数:' as info, count(*) as count FROM papers;
SELECT '作业总数:' as info, count(*) as count FROM assignments;
SELECT '提交总数:' as info, count(*) as count FROM submissions;
