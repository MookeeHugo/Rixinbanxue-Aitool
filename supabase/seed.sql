-- ========================================
-- 日新教学平台 - 本地开发种子数据
-- ========================================
-- 此文件用于 `npx supabase db reset` 时自动填充测试数据
-- ========================================

-- 说明：
-- 测试账号由 migration 20241118000005_add_test_users.sql 自动创建
-- 使用固定的 UUID，确保 seed.sql 可以正确引用这些账号
--
-- 测试账号信息：
-- 教师: teacher@test.com / password: test123456
-- 学生: student@test.com / password: test123456
--
-- 运行 `npx supabase db reset` 会自动创建这些账号并填充测试数据

DO $$
DECLARE
  -- 使用固定的测试用户 UUID（与 migration 20241118000005 一致）
  teacher_uuid uuid := 'aaaaaaaa-1111-1111-1111-111111111111';
  student_uuid uuid := 'aaaaaaaa-2222-2222-2222-222222222222';

  -- 动态生成的 ID
  class_id_1 uuid;
  paper_id_1 uuid;
  paper_id_2 uuid;
  paper_id_3 uuid;
  assignment_id_1 uuid;
  assignment_id_2 uuid;
  assignment_id_3 uuid;
  question_ids uuid[];
  question_ids_2 uuid[];
BEGIN

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

-- 保存第一组题目ID（15道基础题）
SELECT array_agg(id) INTO question_ids
FROM (
  SELECT id FROM questions
  WHERE created_by = teacher_uuid
  ORDER BY created_at
  LIMIT 15
) subq;

-- ========================================
-- 2.5 插入第二组测试题目 (10道题，用于其他作业)
-- ========================================

-- 选择题 - 方程 (5道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, options, created_by) VALUES
('解方程: x + 5 = 8，x = ?', 'choice', ARRAY['一元一次方程'], 'easy', 'B', '{"A": "2", "B": "3", "C": "4", "D": "5"}', teacher_uuid),
('解方程: 2x = 10，x = ?', 'choice', ARRAY['一元一次方程'], 'easy', 'C', '{"A": "2", "B": "3", "C": "5", "D": "10"}', teacher_uuid),
('解方程: x - 3 = 7，x = ?', 'choice', ARRAY['一元一次方程'], 'easy', 'D', '{"A": "4", "B": "5", "C": "9", "D": "10"}', teacher_uuid),
('解方程: 3x + 2 = 11，x = ?', 'choice', ARRAY['一元一次方程'], 'medium', 'B', '{"A": "2", "B": "3", "C": "4", "D": "5"}', teacher_uuid),
('解方程: 5x - 4 = 11，x = ?', 'choice', ARRAY['一元一次方程'], 'medium', 'B', '{"A": "2", "B": "3", "C": "4", "D": "5"}', teacher_uuid);

-- 选择题 - 不等式 (3道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, options, created_by) VALUES
('解不等式: x + 3 > 5，x 的范围是?', 'choice', ARRAY['一元一次不等式'], 'easy', 'A', '{"A": "x > 2", "B": "x < 2", "C": "x > 8", "D": "x < 8"}', teacher_uuid),
('解不等式: 2x < 6，x 的范围是?', 'choice', ARRAY['一元一次不等式'], 'easy', 'B', '{"A": "x > 3", "B": "x < 3", "C": "x > 6", "D": "x < 6"}', teacher_uuid),
('解不等式: 3x - 1 ≥ 5，x 的范围是?', 'choice', ARRAY['一元一次不等式'], 'medium', 'C', '{"A": "x ≥ 1", "B": "x ≥ 3", "C": "x ≥ 2", "D": "x ≥ 4"}', teacher_uuid);

-- 填空题 (2道)
INSERT INTO questions (content, type, knowledge_points, difficulty, answer, created_by) VALUES
('若 2x + 3 = 9，则 x = ___', 'fill', ARRAY['一元一次方程'], 'easy', '3', teacher_uuid),
('若 x/2 = 4，则 x = ___', 'fill', ARRAY['一元一次方程'], 'easy', '8', teacher_uuid);

-- 保存第二组题目ID（后10道题）
SELECT array_agg(id) INTO question_ids_2
FROM (
  SELECT id FROM questions
  WHERE created_by = teacher_uuid
  ORDER BY created_at DESC
  LIMIT 10
) subq;

-- ========================================
-- 3. 创建测试班级
-- ========================================

INSERT INTO classes (name, grade, class_code, teacher_id) VALUES
('初一(1)班', '初一', 'MATH01', teacher_uuid)
RETURNING id INTO class_id_1;

-- ========================================
-- 3.5 学生加入班级
-- ========================================

INSERT INTO class_students (class_id, student_id) VALUES
(class_id_1, student_uuid);

-- ========================================
-- 4. 创建测试试卷
-- ========================================

-- 试卷1：数学基础练习（15道题，已提交）
INSERT INTO papers (name, question_ids, created_by) VALUES
('数学基础练习', question_ids[1:15], teacher_uuid)
RETURNING id INTO paper_id_1;

-- 试卷2：方程专项练习（10道题，待完成）
INSERT INTO papers (name, question_ids, created_by) VALUES
('方程与不等式专项', question_ids_2, teacher_uuid)
RETURNING id INTO paper_id_2;

-- 试卷3：综合测试（混合题目，已逾期未提交）
INSERT INTO papers (name, question_ids, created_by) VALUES
('期中综合测试', array_cat(question_ids[1:8], question_ids_2[1:5]), teacher_uuid)
RETURNING id INTO paper_id_3;

-- ========================================
-- 5. 发布测试作业
-- ========================================

-- 作业1：数学基础练习，已提交（截止时间：未来7天）
INSERT INTO assignments (class_id, paper_id, deadline, status, created_by) VALUES
(class_id_1, paper_id_1, NOW() + INTERVAL '7 days', 'published', teacher_uuid)
RETURNING id INTO assignment_id_1;

-- 作业2：方程专项练习，待完成（截止时间：未来3天）
INSERT INTO assignments (class_id, paper_id, deadline, status, created_by) VALUES
(class_id_1, paper_id_2, NOW() + INTERVAL '3 days', 'published', teacher_uuid)
RETURNING id INTO assignment_id_2;

-- 作业3：期中综合测试，已逾期（截止时间：过去2天）
INSERT INTO assignments (class_id, paper_id, deadline, status, created_by) VALUES
(class_id_1, paper_id_3, NOW() - INTERVAL '2 days', 'published', teacher_uuid)
RETURNING id INTO assignment_id_3;

-- ========================================
-- 6. 学生提交作业（包含一些错题）
-- ========================================

-- 作业1：已提交，包含3道错题，得分 80分
INSERT INTO submissions (assignment_id, student_id, answers, score) VALUES
(assignment_id_1, student_uuid, jsonb_build_object(
  question_ids[1]::text, 'B',  -- 正确
  question_ids[2]::text, 'A',  -- 错误，正确答案是C
  question_ids[3]::text, 'D',  -- 正确
  question_ids[4]::text, 'B',  -- 错误，正确答案是A
  question_ids[5]::text, 'B',  -- 正确
  question_ids[6]::text, 'B',  -- 正确
  question_ids[7]::text, 'A',  -- 正确
  question_ids[8]::text, 'D',  -- 正确
  question_ids[9]::text, 'A',  -- 错误，正确答案是B
  question_ids[10]::text, 'C', -- 正确
  question_ids[11]::text, '11',-- 正确
  question_ids[12]::text, '2a',-- 正确
  question_ids[13]::text, '7', -- 正确
  question_ids[14]::text, '2x - 2 + 3 = 7, 2x = 6, x = 3',
  question_ids[15]::text, '4x'
), 80.0);

RAISE NOTICE '===================================';
RAISE NOTICE '本地测试数据插入完成！';
RAISE NOTICE '===================================';
RAISE NOTICE '教师账号: teacher@test.com / test123456';
RAISE NOTICE '学生账号: student@test.com / test123456';
RAISE NOTICE '-----------------------------------';
RAISE NOTICE '班级: 初一(1)班 (class_code: MATH01)';
RAISE NOTICE '学生已加入班级: ✓';
RAISE NOTICE '-----------------------------------';
RAISE NOTICE '试卷1: 数学基础练习 (15道题)';
RAISE NOTICE '试卷2: 方程与不等式专项 (10道题)';
RAISE NOTICE '试卷3: 期中综合测试 (13道题)';
RAISE NOTICE '-----------------------------------';
RAISE NOTICE '作业1: 数学基础练习 [已提交，分数 80分，含3道错题]';
RAISE NOTICE '作业2: 方程与不等式专项 [待完成，截止: +3天]';
RAISE NOTICE '作业3: 期中综合测试 [已逾期，截止: -2天]';
RAISE NOTICE '-----------------------------------';
RAISE NOTICE '学生可体验功能:';
RAISE NOTICE '  ✓ 我的作业 - 查看3个作业（已提交/待完成/已逾期）';
RAISE NOTICE '  ✓ 作答界面 - 完成待完成作业';
RAISE NOTICE '  ✓ 错题本 - 查看3道错题及知识点';
RAISE NOTICE '  ✓ 加入班级 - 使用班级代码 MATH01';
RAISE NOTICE '===================================';

END $$;
