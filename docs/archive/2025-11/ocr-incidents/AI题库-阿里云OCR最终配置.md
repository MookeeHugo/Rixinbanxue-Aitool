# 阿里云OCR最终配置指南

## 📋 配置清单

### 1. 环境变量配置 (.env.local)

```bash
# 阿里云 OCR 配置
ALIYUN_ACCESS_KEY_ID=your-aliyun-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-aliyun-access-key-secret
OCR_REGION=cn-shanghai
```

### 2. 代码配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 默认地域 | `cn-shanghai` | 华东2（上海） |
| Endpoint格式 | `ocr.${regionId}.aliyuncs.com` | 标准格式 |
| API方法 | `recognizeCharacterAdvance` | 支持Buffer上传 |
| outputProbability | `true` | 输出置信度 |
| minHeight | `10` | 最小文字高度(像素) |

### 3. API版本

- **产品**: 通用文字识别（Character Recognition）
- **版本**: 2019-12-30
- **SDK**: @alicloud/ocr20191230 v4.0.1

---

## ✅ 诊断验证

所有技术配置均已通过验证：

```
✅ 环境变量配置: AccessKey已配置
✅ AccessKey格式: 24/30字符（标准格式）
✅ 网络连接: ocr.cn-shanghai.aliyuncs.com 可访问
✅ OCR客户端: 初始化成功
✅ 代码实现: SDK调用正确
```

---

## ⚠️ 待完成：服务开通

### 当前状态
```
❌ InvalidApi.NotPurchase (403)
   服务未在阿里云账户端开通
```

### 开通步骤

#### 步骤1: 访问控制台
```
https://ocr.console.aliyun.com/
```

#### 步骤2: 开通服务

1. 左侧菜单选择 **"通用文字识别"**（重要：不是文档识别）
2. 如果显示"未开通"，点击 **"立即开通"** 按钮
3. 阅读并同意服务协议
4. 确认开通

#### 步骤3: 确认开通成功

查看页面顶部是否显示 **"已开通"** 状态

#### 步骤4: 等待生效

- 首次开通需要 **5-30分钟** 才能生效
- 建议等待 10 分钟后测试

#### 步骤5: 验证开通

运行诊断脚本：
```bash
npx tsx scripts/diagnose-aliyun-ocr.ts
```

**期望结果**:
```
✅ OCR API调用: ✨ API调用成功！服务已正常激活
🎉 所有检查通过！OCR服务配置正确。
```

---

## 🔍 服务开通验证清单

使用此清单确认服务正确开通：

- [ ] **产品名称**: "通用文字识别" ✅
- [ ] **产品代码**: ocr20191230 ✅
- [ ] **服务状态**: "已开通" ⏸️ (待确认)
- [ ] **地域**: cn-shanghai (华东2-上海) ✅
- [ ] **API版本**: 2019-12-30 ✅
- [ ] **免费额度**: 5,000次/月 可见 ⏸️ (待确认)
- [ ] **账户余额**: 有余额 ⏸️ (待确认)

---

## 📊 服务配置详情

### 计费方式
- **计费模式**: 按量付费（推荐）
- **免费额度**: 5,000次/月
- **超额费用**: ¥0.001/次（1分钱/次）

### API接口信息
- **方法名**: RecognizeCharacter
- **Advance版本**: 支持直接上传Buffer
- **返回数据**:
  - 全文内容 (Content)
  - 图片尺寸 (Width/Height)
  - 文字块详情 (PrismWordsInfo)
    - 文字内容 (Word)
    - 坐标位置 (X, Y, Width, Height)
    - 置信度 (Prob)

### Endpoint配置
```typescript
// 标准格式（当前使用）
const endpoint = `ocr.${regionId}.aliyuncs.com`;
// 示例: ocr.cn-shanghai.aliyuncs.com

// ❌ 不要使用 ocr-api 格式（会导致 InvalidVersion 错误）
// const endpoint = `ocr-api.${regionId}.aliyuncs.com`;
```

---

## 🚀 测试步骤

### 1. 诊断脚本测试

```bash
# 完整诊断（推荐）
npx tsx scripts/diagnose-aliyun-ocr.ts
```

**成功标志**:
```
✅ OCR API调用: ✨ API调用成功！服务已正常激活
============================================================
📊 诊断结果汇总
============================================================
总检查项: 6
✅ 通过: 6
❌ 失败: 0
```

### 2. 功能测试脚本

```bash
# 测试完整OCR流程（包含区域检测和智能匹配）
npx tsx scripts/test-aliyun-ocr.ts
```

**成功标志**:
```
[阿里云OCR] 识别完成
   处理时间: 1234ms
   文字长度: 1500
   文字块数: 350
[图像区域检测] 检测到 3 个图像区域
[智能匹配] 成功匹配 3 个题目与图像
```

### 3. 完整上传测试

1. **重启开发服务器**:
   ```bash
   npm run dev
   ```

2. **上传测试文件**:
   - 访问 AI题库页面
   - 上传包含多题的考试卷图片
   - 等待处理完成

3. **验证结果**:
   - 每个题目应显示独立的配图
   - 而不是所有题目共用原始图片

**成功日志**:
```
[阿里云OCR] 配置检查: 已配置
[阿里云OCR] 识别完成 ✅
[配图裁剪] 检测到 N 个图像区域
[配图裁剪] 成功匹配: 题目1 → 图像区域2
[配图裁剪] 成功匹配: 题目2 → 图像区域3
[配图裁剪] 裁剪并上传 N 张配图
```

---

## 🔧 AccessKey权限配置

如果服务已开通但仍然403，检查AccessKey权限：

### RAM用户权限

1. **访问RAM控制台**:
   ```
   https://ram.console.aliyun.com/users
   ```

2. **添加权限策略**:
   - 系统策略: **AliyunOCRFullAccess** （推荐）
   - 或自定义策略包含:
     ```json
     {
       "Action": [
         "ocr:RecognizeCharacter",
         "ocr:RecognizeCharacterAdvance"
       ],
       "Resource": "*",
       "Effect": "Allow"
     }
     ```

### 主账号

- 主账号默认拥有所有权限
- 但仍需确保服务已开通

---

## 📞 获取帮助

### 1. 查看诊断报告
- [docs/AI题库-OCR 403问题诊断报告.md](./AI题库-OCR 403问题诊断报告.md)
- [docs/AI题库-阿里云OCR 403错误排查指南.md](./AI题库-阿里云OCR 403错误排查指南.md)

### 2. 阿里云工单支持
```
https://selfservice.console.aliyun.com/ticket/createIndex
```

**提供信息**:
- 问题: 通用文字识别API返回403 NotPurchase
- 产品: OCR (ocr20191230)
- 错误代码: InvalidApi.NotPurchase
- 请求ID: (从诊断脚本获取)

### 3. 官方文档
- 服务开通: https://help.aliyun.com/document_detail/465341.html
- API参考: https://next.api.aliyun.com/api/ocr/2019-12-30/RecognizeCharacter
- 错误码: https://help.aliyun.com/document_detail/442322.html

---

## ⚙️ 相关文件

| 文件 | 说明 |
|------|------|
| [src/lib/ai-question-bank/aliyun-ocr-client.ts](../src/lib/ai-question-bank/aliyun-ocr-client.ts) | OCR客户端核心实现 |
| [src/lib/ai-question-bank/image-region-detector.ts](../src/lib/ai-question-bank/image-region-detector.ts) | 图像区域检测算法 |
| [src/lib/ai-question-bank/question-image-matcher.ts](../src/lib/ai-question-bank/question-image-matcher.ts) | 智能匹配算法 |
| [src/lib/ai-question-bank/process-upload.ts](../src/lib/ai-question-bank/process-upload.ts) | 上传处理主流程 |
| [scripts/diagnose-aliyun-ocr.ts](../scripts/diagnose-aliyun-ocr.ts) | 诊断脚本 |
| [scripts/test-aliyun-ocr.ts](../scripts/test-aliyun-ocr.ts) | 功能测试脚本 |

---

## 📈 实施状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| SDK安装 | ✅ 完成 | @alicloud/ocr20191230@4.0.1 |
| 代码实现 | ✅ 完成 | OCR客户端 + 区域检测 + 智能匹配 |
| 配置调试 | ✅ 完成 | cn-shanghai + 标准endpoint |
| 网络验证 | ✅ 通过 | 可访问ocr.cn-shanghai.aliyuncs.com |
| AccessKey | ✅ 配置 | 格式正确，24/30字符 |
| 服务开通 | ⏸️ 待完成 | **需在阿里云控制台开通** |
| 功能测试 | ⏸️ 等待 | 服务开通后执行 |

---

## 🎯 下一步行动

1. **立即执行**:
   - 访问 https://ocr.console.aliyun.com/
   - 开通"通用文字识别"服务

2. **等待生效**: 10-30分钟

3. **验证开通**:
   ```bash
   npx tsx scripts/diagnose-aliyun-ocr.ts
   ```

4. **完整测试**:
   - 重启开发服务器
   - 上传测试图片
   - 验证配图裁剪功能

---

**配置完成时间**: 2025-11-26
**状态**: ✅ 技术配置完成，⏸️ 等待服务开通
**预期结果**: 服务开通后，题目配图将自动裁剪并单独显示
