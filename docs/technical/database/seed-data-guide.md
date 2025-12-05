# 测试数据导入指南（Seed Workflow）

> 适用场景：本地或预发布环境需要快速生成老师/学生/作业等演示数据。

## 1. 注册测试账号

访问 `http://localhost:3002/register`，创建：

- **教师账号**：`teacher@test.com` / 密码 `123456` / 角色 `teacher`
- **学生账号**：`student@test.com` / 密码 `123456` / 角色 `student`

## 2. 获取用户 UUID

1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 选择项目。
2. 打开 **Authentication > Users**。
3. 复制上述两个账号的 `user id`（UUID）。

## 3. 执行 `seed-test-data.sql`

1. 打开 **SQL Editor**，新建 Query。
2. 粘贴 `db/seed-test-data.sql`。
3. 将脚本顶部的变量替换为真实 UUID：

```sql
teacher_id uuid := '你的教师 UUID';
student_id uuid := '你的学生 UUID';
```

4. 点击 **Run**。

### 导入后的结构

- 题库：30 道（选择 20、填空 5、解答 5）
- 班级：`MATH01`、`MATH23`
- 试卷：2 套（15 & 10 题）
- 作业：2 个（各对应一个班级）
- 提交记录：2 份，包含 7 条错题

## 4. 典型验证路径

### 教师端

1. 登录 `teacher@test.com`。
2. 检查题库、班级、试卷、作业是否出现预期数量。
3. 打开“学情分析”，确认错题统计/知识点分布存在数据。

### 学生端

1. 登录 `student@test.com`。
2. 进入“我的作业”，应看到 1 个已提交、1 个待完成。
3. 查看“我的错题”，应显示 7 条示例题。

## 5. 重置数据

若需重新导入，可在 SQL Editor 依次执行：

```sql
DELETE FROM submissions WHERE student_id = '学生 UUID';
DELETE FROM assignments WHERE created_by = '教师 UUID';
DELETE FROM papers WHERE created_by = '教师 UUID';
DELETE FROM classes WHERE teacher_id = '教师 UUID';
DELETE FROM questions WHERE created_by = '教师 UUID';
```

然后重新运行 `seed-test-data.sql`。

## 6. 注意事项

- **UUID 必须准确**：确保脚本变量与真实账号对应。
- **先注册后导入**：必须先创建 Supabase 用户再执行脚本。
- **数据隔离**：演示数据仅对该教师/学生可见，避免混入真实课堂。
- **RLS 检查**：若 seed 失败，请先确认 `db/migrations` 中的策略已同步。

## 7. 常见问题

| 问题 | 解决方案 |
| --- | --- |
| “Foreign key violation” | 确认教师/学生 UUID 是否正确，并已存在于 `profiles`。 |
| 学生看不到作业 | 目前 Demo 版本未实现班级-学生关联，所有发布的作业默认对所有学生可见。 |
| 错题列表为空 | 确认学生确实提交过作业；可在 `submissions` 表检索记录。 |
| 学情分析无数据 | 检查作业状态是否为 `published`，以及提交记录是否可见。 |
