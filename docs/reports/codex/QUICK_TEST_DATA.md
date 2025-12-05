# 🚀 快速导入测试数据（3分钟完成）

## 步骤1️⃣: 注册测试账号 (1分钟)

访问 http://localhost:3002/register

| 角色 | 邮箱 | 密码 | 姓名 |
|------|------|------|------|
| 教师 | `teacher@test.com` | `123456` | `李老师` |
| 学生 | `student@test.com` | `123456` | `张三` |

注册完两个账号后登出。

---

## 步骤2️⃣: 获取UUID (30秒)

1. 打开 Supabase Dashboard → SQL Editor
2. 执行 `db/get-user-ids.sql`
3. 复制显示的两个 UUID

**示例输出**:
```
teacher_uuid: a1b2c3d4-e5f6-7890-abcd-ef1234567890
student_uuid: f1e2d3c4-b5a6-9876-fedc-ba0987654321
```

---

## 步骤3️⃣: 执行导入脚本 (1分钟)

1. 打开 `db/seed-test-data.sql`
2. 找到第14-15行，替换UUID：

```sql
-- 修改前：
teacher_id uuid := 'YOUR_TEACHER_UUID_HERE';
student_id uuid := 'YOUR_STUDENT_UUID_HERE';

-- 修改后：
teacher_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
student_id uuid := 'f1e2d3c4-b5a6-9876-fedc-ba0987654321';
```

3. 在 Supabase SQL Editor 中执行整个脚本
4. 看到 "测试数据插入完成！" 提示

---

## ✅ 导入完成！立即体验

### 教师端登录 (teacher@test.com / 123456)

访问路径 | 预期效果
---------|----------
[题库管理](http://localhost:3002/questions) | 看到 30 道题目
[智能组卷](http://localhost:3002/papers) | 看到 2 个试卷
[班级管理](http://localhost:3002/classes) | 看到 2 个班级
[作业管理](http://localhost:3002/assignments) | 看到 2 个作业
[教学分析](http://localhost:3002/teacher-analytics) | 看到学生表现和知识点分析

### 学生端登录 (student@test.com / 123456)

访问路径 | 预期效果
---------|----------
[我的作业](http://localhost:3002/my-assignments) | 看到 2 个作业（已提交）
[错题本](http://localhost:3002/my-mistakes) | 看到 7-8 道错题
[学情分析](http://localhost:3002/analytics) | 看到知识点掌握情况

---

## 📊 测试数据详情

### 题目数据 (30道)
- **选择题**: 20道（有理数10 + 整式5 + 方程5）
- **填空题**: 5道
- **解答题**: 5道

涵盖知识点：
- 有理数的加减、乘除、概念、绝对值、大小比较
- 整式的加减、幂的运算、平方差公式、因式分解
- 一元一次方程、一元二次方程、二元一次方程组
- 代数式、勾股定理

### 班级数据 (2个)
- **初一(1)班** - 班级代码: `MATH01`
- **初二(3)班** - 班级代码: `MATH23`

### 试卷数据 (2个)
- **有理数与整式基础练习** (15题)
- **方程综合测试** (10题)

### 作业数据 (2个)
- **基础练习** - 初一(1)班，已截止 ⏰
- **方程测试** - 初二(3)班，进行中 ✅

### 提交数据 (2份)
- **基础练习提交**: 15题，对10错5，得分 **66.7分**
- **方程测试提交**: 10题，对7错3，得分 **70.0分**

### 错题分布（用于测试错题本）
涉及知识点：
- ❌ 有理数的乘除
- ❌ 有理数的大小比较
- ❌ 因式分解（2次）
- ❌ 一元一次方程
- ❌ 一元二次方程
- ❌ 整式的加减

---

## 🎯 测试建议流程

### 完整测试流程（15分钟）

1. **教师端**（8分钟）
   - [ ] 查看题库管理（30道题）
   - [ ] 查看智能组卷（2个试卷）
   - [ ] 尝试新建试卷（选择5道题）
   - [ ] 查看班级管理（2个班级）
   - [ ] 查看作业管理（2个作业，查看提交情况）
   - [ ] 查看教学分析（学生表现、知识点掌握）

2. **学生端**（7分钟）
   - [ ] 查看我的作业（2个已提交作业）
   - [ ] 查看错题本（7-8道错题，测试筛选功能）
   - [ ] 查看学情分析（总体统计、知识点掌握情况）
   - [ ] 切换时间范围（近一周、近一月、全部）
   - [ ] 阅读学习建议

3. **完整流程测试**（10分钟）
   - [ ] 教师：创建新题目
   - [ ] 教师：智能组卷（选择刚创建的题）
   - [ ] 教师：发布新作业
   - [ ] 学生：查看新作业
   - [ ] 学生：在线作答并提交
   - [ ] 教师：查看新提交并批改
   - [ ] 学生：查看成绩和错题

---

## ⚠️ 常见问题

### Q: 脚本执行失败，提示 "Foreign key violation"
**A**: UUID 未正确替换，请检查步骤2️⃣

### Q: 学生看不到作业
**A**: 确认作业状态为 "published"，可在作业列表查看

### Q: 错题本是空的
**A**: 需要先有提交记录，且答案与正确答案不同

### Q: 想要重新导入数据
**A**: 在 Supabase SQL Editor 执行以下清理脚本，然后重新导入：

```sql
DELETE FROM submissions WHERE student_id = '你的学生UUID';
DELETE FROM assignments WHERE created_by = '你的教师UUID';
DELETE FROM papers WHERE created_by = '你的教师UUID';
DELETE FROM classes WHERE teacher_id = '你的教师UUID';
DELETE FROM questions WHERE created_by = '你的教师UUID';
```

---

## 📞 需要帮助？

- 📖 详细指南: [db/SEED_DATA_GUIDE.md](db/SEED_DATA_GUIDE.md)
- 🔧 数据库配置: [db/README.md](db/README.md)
- 📊 项目进度: [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md)

---

**祝测试愉快！** 🎉

如有问题，请检查：
1. ✅ Supabase 项目是否正常运行
2. ✅ 环境变量 (.env.local) 是否正确配置
3. ✅ 数据库表结构 (schema.sql) 是否已执行
4. ✅ UUID 是否正确替换
