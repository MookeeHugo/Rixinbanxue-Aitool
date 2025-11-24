# AI题库MVP - 系统运行指南

> **更新时间**: 2025-01-24
> **状态**: ✅ 系统运行中，可开始测试

---

## ✅ 当前系统状态

### 运行中的服务

| 服务 | 地址 | 状态 | 说明 |
|------|------|------|------|
| **Next.js** | http://localhost:3002 | ✅ 运行中 | 主应用服务器 |
| **Inngest Dev** | http://localhost:8288 | ✅ 运行中 | 异步任务处理 |
| **Supabase** | http://localhost:54323 | ✅ 运行中 | 数据库 |

### 已修复的问题

1. ✅ Toast Hook缺失 - 已创建
2. ✅ Progress组件缺失 - 已创建
3. ✅ Inngest导入路径错误 - 已修复
4. ✅ 端口配置 - 使用3002端口

---

## 🚀 如何访问系统

### 步骤1: 登录教师账号

**URL**: http://localhost:3002/login

**测试账号**：
```
邮箱: teacher@test.com
密码: test123456
```

### 步骤2: 访问AI题库上传页面

**URL**: http://localhost:3002/tools/ingest

登录成功后会自动跳转或手动输入此URL。

---

## 🧪 完整测试流程

### 测试准备

准备一张包含初中数学题的图片：
- **格式**: JPG/PNG
- **大小**: < 20MB
- **内容**: 清晰的数学题目（1-3道）
- **建议**: 从教材或试卷拍照

### 测试步骤

#### 1️⃣ 测试文件上传

1. 访问 http://localhost:3002/tools/ingest
2. 将图片拖拽到上传区域
3. 或点击"选择文件"按钮选择图片
4. 点击"开始上传"

**预期结果**：
- ✅ 显示"上传成功"提示
- ✅ 文件出现在"上传历史"列表
- ✅ 状态显示"等待中"或"解析中"

#### 2️⃣ 监控解析进度

**方式1: 前端页面**
- 任务列表会每2秒自动刷新
- 观察状态变化：等待中 → 解析中 → 已完成
- 查看进度条（解析中时）

**方式2: Inngest Dashboard**
- 访问 http://localhost:8288
- 查看"Functions" → "process-pdf-upload"
- 实时监控任务执行情况

**预期结果**：
- ✅ 状态变为"解析中"
- ✅ 进度条从0%逐步增加
- ✅ 最终状态变为"已完成"
- ✅ 显示"识别出 N 道题目"

#### 3️⃣ 查看解析结果

点击任务右侧的"查看结果"按钮

**注意**: 此功能是Day 2-3的任务，目前会404，这是正常的！

**临时查看方式**：
1. 访问 http://localhost:54323 (Supabase Studio)
2. 进入"Table Editor"
3. 选择"parsed_questions"表
4. 查看AI解析的题目数据

---

## 📊 验证系统功能

### 检查数据库

访问 Supabase Studio: http://localhost:54323

**检查upload_tasks表**：
```sql
SELECT * FROM upload_tasks
ORDER BY created_at DESC
LIMIT 5;
```

应该看到：
- ✅ 新创建的任务记录
- ✅ status = 'completed'
- ✅ progress = 100
- ✅ total_questions > 0

**检查parsed_questions表**：
```sql
SELECT * FROM parsed_questions
WHERE upload_task_id = 'your_task_id'
ORDER BY created_at;
```

应该看到：
- ✅ AI解析的题目记录
- ✅ type, content, options, answer字段有值
- ✅ tags字段包含知识点和难度
- ✅ confidence_score ≥ 0.8（大部分题目）

### 检查Qwen API调用

查看Next.js控制台日志：
```
✅ Qwen API连接成功
📊 Token使用情况: XXX tokens
```

---

## 🔍 调试技巧

### 查看Next.js日志

Inngest Worker的日志会显示在Next.js控制台中。

### 查看Inngest日志

访问 http://localhost:8288：
1. 点击"Stream" → 查看所有事件
2. 点击具体的Function Run → 查看每一步执行情况
3. 如有错误，会显示详细堆栈信息

### 常见问题排查

**Q: 上传后一直"等待中"？**
- 检查Inngest是否正常运行: http://localhost:8288
- 查看是否有Function注册成功
- 检查API路由是否正确: http://localhost:3002/api/inngest

**Q: 状态变成"失败"？**
- 访问Inngest Dashboard查看错误信息
- 检查Qwen API Key是否正确
- 查看Next.js控制台错误日志

**Q: 解析结果为空？**
- 确认图片足够清晰
- 检查是否包含可识别的题目
- 查看Qwen API返回的原始数据

---

## 📝 Day 1 测试清单

- [ ] 成功登录教师账号
- [ ] 访问 /tools/ingest 页面无报错
- [ ] 文件拖拽上传功能正常
- [ ] 文件点击上传功能正常
- [ ] 文件大小验证正常（测试>20MB文件）
- [ ] 文件格式验证正常（测试其他格式）
- [ ] 上传成功后显示在任务列表
- [ ] 任务状态实时更新（轮询）
- [ ] Inngest Dashboard可访问
- [ ] 数据库表有正确数据

---

## 🎯 Day 2 任务预览

明天（Day 2-3）我们将创建：

### 1. 结果查看页面

**路由**: `/tools/ingest/[id]/review`

**功能**：
- 显示所有解析的题目
- 人工编辑题目内容
- 标记低置信度题目
- 批量选择题目

### 2. QuestionEditor组件

**功能**：
- 编辑题目内容
- 修改选项和答案
- 调整标签和难度
- 保存修改

### 3. 批量提交功能

**功能**：
- 选择要提交的题目
- 调用batch_submit_questions RPC
- 提交到主题库
- 刷新题库列表

---

## 💡 测试建议

### 准备不同类型的测试文件

1. **清晰图片**（80-90%准确率）
   - 教材截图
   - 清晰拍照的试卷

2. **模糊图片**（60-70%准确率）
   - 测试置信度阈值
   - 验证低置信度标记

3. **复杂题目**（多图、表格）
   - 测试AI的识别能力
   - 发现边界情况

### 记录测试数据

- 准确率统计
- 常见错误类型
- 解析时间
- Token消耗

---

## ✅ Day 1 完成标志

当您完成以下所有测试后，Day 1 即宣告完成：

- [x] 系统成功启动（Next.js + Inngest）
- [ ] 成功上传1个测试文件
- [ ] 任务状态正确显示
- [ ] Inngest Worker正确执行
- [ ] 数据库有解析结果
- [ ] Qwen API调用成功

---

## 📞 需要帮助？

如果遇到问题，可以：

1. **查看日志**：
   - Next.js控制台
   - Inngest Dashboard (http://localhost:8288)
   - Supabase Studio (http://localhost:54323)

2. **检查配置**：
   - `.env.local`中的QWEN_API_KEY
   - Supabase连接状态
   - Inngest服务状态

3. **参考文档**：
   - [AI题库MVP最终确认方案.md](AI题库MVP最终确认方案.md)
   - [AI题库MVP-Day1完成报告.md](AI题库MVP-Day1完成报告.md)

---

**最后更新**: 2025-01-24
**系统状态**: ✅ 运行中
**下一步**: 测试上传流程，准备Day 2开发
