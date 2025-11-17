-- ========================================
-- 日新教学平台 - 本地开发种子数据
-- ========================================
-- 此文件用于 `npx supabase db reset` 时自动填充测试数据
-- ========================================

-- 说明：
-- 本地开发环境中，auth.users 表由 Supabase Auth 自动管理
-- 我们只需要在 profiles 表中插入对应的用户信息即可
-- 在实际注册时，profiles 表会通过触发器自动创建

-- 注意：以下 UUID 是预设的测试账号 ID
-- 在本地测试时，请先通过 Supabase Dashboard 或 API 注册这些账号：
-- 教师: teacher@test.com / password: test123456
-- 学生: student@test.com / password: test123456

-- 如果您已经注册了测试账号，可以通过以下查询获取实际的 UUID：
-- SELECT id, email FROM auth.users;
-- 然后替换下面的 UUID

DO $$
DECLARE
  -- 预设的测试用户 ID（请根据实际情况替换）
  teacher_uuid uuid := '00000000-0000-0000-0000-000000000001';
  student_uuid uuid := '00000000-0000-0000-0000-000000000002';

  -- 动态生成的 ID
  class_id_1 uuid;
  paper_id_1 uuid;
  assignment_id_1 uuid;
  question_ids uuid[];
BEGIN

-- ========================================
-- 1. 插入测试用户 profiles（如果不存在）
-- ========================================
-- 注意：实际生产环境中，profiles 由注册触发器自动创建
-- 这里仅用于本地测试数据填充

INSERT INTO profiles (id, email, name, role) VALUES
  (teacher_uuid, 'teacher@test.com', '张老师', 'teacher')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, name, role) VALUES
  (student_uuid, 'student@test.com', '李同学', 'student')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. 插入测试题目 (15道基础题)
-- ========================================

-- 选择题 - 有理数 (5道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, options, created_by) VALUES
('计算: (-3) + (+5) = ?', 'choice', ARRAY['有理数加法'], 'easy', 'B', '{"A": "-8", "B": "2", "C": "-2", "D": "8"}', teacher_uuid),
('计算: (-2) × (-6) = ?', 'choice', ARRAY['有理数乘法'], 'easy', 'C', '{"A": "-12", "B": "-4", "C": "12", "D": "4"}', teacher_uuid),
('计算: |-5| = ?', 'choice', ARRAY['绝对值'], 'easy', 'D', '{"A": "-5", "B": "0", "C": "1/5", "D": "5"}', teacher_uuid),
('比较大小: -3 ___ -5', 'choice', ARRAY['有理数大小比较'], 'easy', 'A', '{"A": ">", "B": "<", "C": "=", "D": "无法比较"}', teacher_uuid),
('下列各数中，是负数的是( )', 'choice', ARRAY['有理数概念'], 'easy', 'B', '{"A": "0", "B": "-5", "C": "3", "D": "1/2"}', teacher_uuid);

-- 选择题 - 整式 (5道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, options, created_by) VALUES
('化简: 3x + 2x = ?', 'choice', ARRAY['整式加减'], 'easy', 'B', '{"A": "6x", "B": "5x", "C": "5x²", "D": "6"}', teacher_uuid),
('展开: (x+2)(x-2) = ?', 'choice', ARRAY['平方差公式'], 'medium', 'A', '{"A": "x²-4", "B": "x²+4", "C": "x²-2", "D": "2x-4"}', teacher_uuid),
('因式分解: x² - 9 = ?', 'choice', ARRAY['因式分解'], 'medium', 'D', '{"A": "(x-3)²", "B": "(x+3)²", "C": "x(x-9)", "D": "(x+3)(x-3)"}', teacher_uuid),
('化简: 2(x+1) - 3(x-1) = ?', 'choice', ARRAY['整式加减'], 'medium', 'B', '{"A": "-x+5", "B": "-x+5", "C": "5x-1", "D": "x+5"}', teacher_uuid),
('计算: (2x)³ = ?', 'choice', ARRAY['幂的运算'], 'medium', 'C', '{"A": "2x³", "B": "6x³", "C": "8x³", "D": "8x"}', teacher_uuid);

-- 填空题 (3道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, created_by) VALUES
('计算: 3 + 4 × 2 = ___', 'fill', ARRAY['有理数混合运算'], 'easy', '11', teacher_uuid),
('化简: 5a - 3a = ___', 'fill', ARRAY['整式加减'], 'easy', '2a', teacher_uuid),
('若 x = 2，则 3x + 1 = ___', 'fill', ARRAY['代数式的值'], 'easy', '7', teacher_uuid);

-- 解答题 (2道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, created_by) VALUES
('解方程: 2(x-1) + 3 = 7，写出完整解题步骤。', 'essay', ARRAY['一元一次方程'], 'medium',
 '解：2(x-1) + 3 = 7' || E'\n' ||
 '2x - 2 + 3 = 7' || E'\n' ||
 '2x + 1 = 7' || E'\n' ||
 '2x = 6' || E'\n' ||
 'x = 3', teacher_uuid),
('计算: (x+1)² - (x-1)²，并化简。', 'essay', ARRAY['整式乘法'], 'medium',
 '解：(x+1)² - (x-1)²' || E'\n' ||
 '= x²+2x+1 - (x²-2x+1)' || E'\n' ||
 '= x²+2x+1 - x²+2x-1' || E'\n' ||
 '= 4x', teacher_uuid);

-- 保存所有题目ID
SELECT array_agg(id ORDER BY created_at) INTO question_ids
FROM questions
WHERE created_by = teacher_uuid;

-- ========================================
-- 3. 创建测试班级
-- ========================================

INSERT INTO classes (name, grade, class_code, teacher_id) VALUES
('初一(1)班', '初一', 'MATH01', teacher_uuid)
RETURNING id INTO class_id_1;

-- ========================================
-- 4. 创建测试试卷
-- ========================================

INSERT INTO papers (name, question_ids, created_by) VALUES
('数学基础练习', question_ids[1:15], teacher_uuid)
RETURNING id INTO paper_id_1;

-- ========================================
-- 5. 发布测试作业
-- ========================================

INSERT INTO assignments (class_id, paper_id, deadline, status, created_by) VALUES
(class_id_1, paper_id_1, NOW() + INTERVAL '7 days', 'published', teacher_uuid)
RETURNING id INTO assignment_id_1;

-- ========================================
-- 6. 学生提交作业（示例）
-- ========================================

INSERT INTO submissions (assignment_id, student_id, answers, score) VALUES
(assignment_id_1, student_uuid, jsonb_build_object(
  question_ids[1]::text, 'B',  -- 正确
  question_ids[2]::text, 'C',  -- 正确
  question_ids[3]::text, 'D',  -- 正确
  question_ids[4]::text, 'A',  -- 正确
  question_ids[5]::text, 'B',  -- 正确
  question_ids[6]::text, 'B',  -- 正确
  question_ids[7]::text, 'A',  -- 正确
  question_ids[8]::text, 'D',  -- 正确
  question_ids[9]::text, 'B',  -- 正确
  question_ids[10]::text, 'C', -- 正确
  question_ids[11]::text, '11',-- 正确
  question_ids[12]::text, '2a',-- 正确
  question_ids[13]::text, '7', -- 正确
  question_ids[14]::text, '2x - 2 + 3 = 7, 2x = 6, x = 3',
  question_ids[15]::text, '4x'
), 90.0);

RAISE NOTICE '===================================';
RAISE NOTICE '本地测试数据插入完成！';
RAISE NOTICE '===================================';
RAISE NOTICE '教师账号: teacher@test.com';
RAISE NOTICE '学生账号: student@test.com';
RAISE NOTICE '班级: 初一(1)班 (class_code: MATH01)';
RAISE NOTICE '试卷: 数学基础练习 (15道题)';
RAISE NOTICE '作业: 已发布，截止日期: +7天';
RAISE NOTICE '学生提交: 已完成，分数: 90分';
RAISE NOTICE '===================================';

END $$;
