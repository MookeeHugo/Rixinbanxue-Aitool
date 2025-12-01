# AI题库 - 阿里云OCR功能测试指南

> **测试时间**: 2025-11-26
> **状态**: ✅ 基础配置已验证，待进行集成测试

---

## 测试状态总结

### ✅ 已完成的验证

1. **环境变量配置** ✅
   - ALIYUN_ACCESS_KEY_ID: 已配置
   - ALIYUN_ACCESS_KEY_SECRET: 已配置
   - OCR_REGION: cn-hangzhou

2. **依赖安装** ✅
   - @alicloud/ocr-api20210707@3.1.3
   - @alicloud/openapi-client@0.4.15
   - 相关依赖包齐全

3. **数据库迁移** ✅
   - 字段已添加: `question_image_url`
   - 字段已添加: `image_region`
   - 所有迁移已应用

4. **代码模块** ✅
   - aliyun-ocr-client.ts - OCR客户端
   - image-region-detector.ts - 区域检测
   - question-image-matcher.ts - 智能匹配
   - image-cropper.ts - 图片裁剪
   - process-upload.ts - 流程集成

5. **Supabase服务** ✅
   - 本地Supabase正在运行
   - API URL: http://127.0.0.1:54321
   - Studio URL: http://127.0.0.1:54323

---

## 集成测试步骤

### 步骤 1: 准备测试图片

**要求**:
- 格式: PNG, JPG, JPEG
- 大小: 建议 < 5MB
- 内容: 3-5道题目，每题有配图（几何图形、函数图像等）
- 分辨率: 建议 800x1200 或更高
- 题号格式: "1." "2." "3." 等

**推荐测试场景**:
- ✅ 标准试卷（每题1个配图）
- ✅ 部分题目无配图
- ✅ 配图位置不规则

### 步骤 2: 启动开发服务器

```bash
npm run dev:legacy
```

服务将运行在: http://localhost:3002

### 步骤 3: 登录并上传

1. 访问 http://localhost:3002
2. 使用测试账号登录:
   - 教师账号: `teacher@test.com` / `test123456`
3. 进入"AI题库"功能
4. 上传准备好的测试图片

### 步骤 4: 观察处理日志

在开发服务器的控制台中，你应该看到以下日志：

```
开始处理上传任务 { taskId: '...', fileName: '...', fileUrl: '...' }
开始下载文件 { fileUrl: '...' }
文件下载完成 { size: 123456 }

[阿里云OCR] 开始识别图片布局 { taskId: '...' }
[阿里云OCR] 识别完成 {
  taskId: '...',
  wordCount: 523,
  imageSize: '1200x1600'
}

[图像区域检测] 检测完成 {
  taskId: '...',
  imageRegionCount: 5,
  questionRegionCount: 5
}

调用 Qwen3-VL-Flash 解析 { taskId: '...' }
解析完成 {
  taskId: '...',
  questionCount: 5,
  avgConfidence: 0.95
}

[智能匹配] 开始匹配题目与配图 { taskId: '...' }
[智能匹配] 匹配完成 {
  taskId: '...',
  totalQuestions: 5,
  matchedCount: 4,
  matchRate: '80%'
}

[图片裁剪] 开始裁剪题目配图 { taskId: '...', count: 4 }
[图片裁剪] 题目配图处理完成 { questionNumber: '1', croppedUrl: '...' }
[图片裁剪] 题目配图处理完成 { questionNumber: '2', croppedUrl: '...' }
[图片裁剪] 题目配图处理完成 { questionNumber: '3', croppedUrl: '...' }
[图片裁剪] 题目配图处理完成 { questionNumber: '4', croppedUrl: '...' }
[图片裁剪] 裁剪完成 { taskId: '...', croppedCount: 4 }

解析结果已保存 { taskId: '...', count: 5, withImages: 4 }
```

### 步骤 5: 验证前端显示

1. 查看解析结果页面
2. 确认每道题目是否显示了裁剪后的配图
3. 检查配图是否对应正确

### 步骤 6: 验证数据库记录

打开Supabase Studio: http://127.0.0.1:54323

执行SQL查询：

```sql
-- 查看最新的上传任务
SELECT
  id,
  file_name,
  status,
  total_questions,
  created_at
FROM upload_tasks
ORDER BY created_at DESC
LIMIT 5;

-- 查看解析的题目和配图信息
SELECT
  type,
  content,
  question_image_url,
  image_region,
  confidence_score
FROM parsed_questions
WHERE upload_task_id IN (
  SELECT id FROM upload_tasks ORDER BY created_at DESC LIMIT 1
)
ORDER BY created_at ASC;
```

**验证点**:
- ✅ `question_image_url` 字段有值（如 `ai-question-bank/user123/question-...png`）
- ✅ `image_region` 字段是JSON格式，包含 `{x, y, width, height}`
- ✅ 坐标值在合理范围内（不为负数，不超出图片尺寸）

---

## 性能指标

### 预期处理时间

| 阶段 | 预期时间 | 说明 |
|------|---------|------|
| 文件下载 | 1-2秒 | 依赖文件大小和网络速度 |
| OCR识别 | 2-4秒 | 调用阿里云API |
| 图像检测 | <0.5秒 | 本地算法计算 |
| Qwen解析 | 5-10秒 | 依赖题目数量 |
| 智能匹配 | <0.2秒 | 本地算法计算 |
| 图片裁剪 | 2-5秒 | 依赖配图数量 |
| **总计** | **10-25秒** | 5道题含配图的情况 |

### 匹配率指标

| 场景 | 目标匹配率 |
|------|-----------|
| 标准试卷（题号清晰） | ≥ 90% |
| 部分配图缺失 | ≥ 70% |
| 复杂布局 | ≥ 60% |

---

## 故障排查

### 问题 1: OCR识别失败

**错误日志**: `[阿里云OCR] 识别失败，跳过配图裁剪`

**可能原因**:
1. AccessKey配置错误
2. 网络连接问题
3. API调用超限（>5,000次/月）

**解决方法**:
```bash
# 检查环境变量
cat .env.local | grep ALIYUN

# 测试网络连接
curl https://ocr-api.cn-hangzhou.aliyuncs.com

# 查看阿里云控制台用量
# https://ocr.console.aliyun.com/overview
```

### 问题 2: 配图匹配率低

**日志显示**: `matchRate: '20%'`（低于预期）

**可能原因**:
1. 题号识别失败
2. 配图与题目距离过远（>300px）
3. 配图在题号上方而非下方

**调整方法**:
- 修改 [question-image-matcher.ts:208](../src/lib/ai-question-bank/question-image-matcher.ts#L208) 中的距离阈值
- 调整边界匹配的容差参数

### 问题 3: 裁剪的配图不正确

**排查步骤**:
1. 查看数据库中的 `image_region` 字段值
2. 检查 `[智能匹配]` 日志中的 `matchMethod`（`boundary` 或 `nearest`）
3. 使用图片编辑器验证坐标是否对应正确区域

### 问题 4: 内存溢出

**现象**: 处理大图片（>10MB）时内存溢出

**解决方法**:
```bash
# 增加Node.js内存限制
NODE_OPTIONS=--max-old-space-size=4096 npm run dev:legacy
```

---

## 测试检查清单

### 功能测试

- [ ] OCR识别成功（日志显示 `[阿里云OCR] 识别完成`）
- [ ] 图像区域检测成功（`imageRegionCount > 0`）
- [ ] 智能匹配成功（`matchRate ≥ 70%`）
- [ ] 图片裁剪成功（`croppedCount > 0`）
- [ ] 前端正确显示配图
- [ ] 数据库记录正确

### 降级测试

- [ ] 删除AccessKey后，上传流程仍能完成（无配图）
- [ ] 使用错误的AccessKey，日志显示错误但不中断流程
- [ ] 图片无配图时，流程正常完成

### 边界测试

- [ ] 超大图片（>10MB）
- [ ] 低分辨率图片（<800px）
- [ ] 纯文字题目（无配图）
- [ ] 题号不规范（如 "第一题"）

---

## 测试结果记录

### 测试 1: 基础配置验证

**执行时间**: 2025-11-26
**测试命令**: `npx tsx scripts/test-ocr-integration.ts`

**结果**: ✅ 通过

```
✅ 环境变量配置完整
✅ 阿里云OCR SDK已安装
✅ OCR配置检查通过
```

### 测试 2: 集成测试

**执行时间**: 待执行
**测试方式**: 前端上传

**结果**: 待测试

---

## 下一步优化方向

1. **提升匹配准确率**
   - 使用题目内容关键词辅助匹配（"如图"、"图中"）
   - 记录历史匹配数据，优化策略

2. **支持多图题目**
   - 修改 `image_region` 为数组类型
   - 前端支持显示多张配图

3. **人工校正界面**
   - 前端显示原图 + 检测到的区域框
   - 用户可拖拽调整位置

4. **OCR结果缓存**
   - 使用Redis缓存识别结果
   - 节省API调用次数

---

## 相关文档

- [阿里云OCR集成完成报告](./AI题库-阿里云OCR集成完成报告.md)
- [阿里云OCR集成方案](./AI题库-阿里云OCR集成方案.md)
- [腾讯云OCR成本分析](./AI题库-腾讯云OCR成本分析.md)

---

**测试负责人**: Claude AI Assistant
**最后更新**: 2025-11-26
