# 阿里云OCR 403 "Not Purchased" 错误排查指南

## 错误现象

```
InvalidApi.NotPurchase: code: 403
Specified api is not purchased
```

**症状**: 题目解析成功，但没有生成每题的单独配图，所有题目显示原始上传图片。

## 根本原因

阿里云OCR API服务未正确激活或配置错误。

---

## 排查步骤

### 步骤 1: 确认开通正确的服务

1. **登录阿里云控制台**: https://ocr.console.aliyun.com/

2. **检查服务状态**:
   - 进入 "通用文字识别" 页面
   - 确认页面顶部显示 **"已开通"** 状态
   - 如果显示"未开通"，点击 **"立即开通"** 按钮

3. **重要**: 必须开通的是 **"通用文字识别"** 产品，而不是:
   - ❌ 文档识别（Document Recognition）
   - ❌ 卡证识别（Card Recognition）
   - ✅ 通用文字识别（Character Recognition）

### 步骤 2: 确认API版本和计费方式

1. **检查API类型**:
   - 产品名称: **通用文字识别**
   - API方法: **RecognizeCharacter**
   - 版本: **2019-12-30**

2. **确认计费方式**:
   - 默认有 **5,000次/月** 的免费额度
   - 查看 "资源包管理" 确认免费额度状态
   - 网址: https://ocr.console.aliyun.com/resourcePackage

3. **检查账户余额**:
   - 确保账户有余额（即使有免费额度也需要）
   - 网址: https://usercenter2.aliyun.com/finance/prepaycard/overview

### 步骤 3: 验证AccessKey权限

1. **登录RAM控制台**: https://ram.console.aliyun.com/users

2. **检查AccessKey权限**:
   - 点击使用的RAM用户
   - 检查"权限管理" → "权限策略"
   - 必须包含以下权限:
     ```json
     {
       "Action": [
         "ocr:RecognizeCharacter"
       ],
       "Resource": "*",
       "Effect": "Allow"
     }
     ```

3. **推荐的权限策略**:
   - 使用系统策略: **AliyunOCRFullAccess**
   - 或自定义策略包含OCR读写权限

### 步骤 4: 确认地域配置

1. **检查当前配置**:
   ```bash
   # 查看 .env.local 文件
   cat .env.local | grep OCR_REGION
   ```

2. **推荐地域**:
   - 默认: `cn-shanghai` (华东2-上海)
   - 备选: `cn-beijing` (华北2-北京)
   - 备选: `cn-hangzhou` (华东1-杭州)

3. **确保控制台和代码使用相同地域**

### 步骤 5: 等待服务激活生效

- 首次开通服务后，需要 **5-30分钟** 才能生效
- 在此期间会持续返回403错误
- 建议等待后重新测试

---

## 验证方法

### 方法 1: 使用诊断脚本

```bash
# 运行OCR诊断脚本
npx tsx scripts/diagnose-aliyun-ocr.ts
```

该脚本会检查:
- ✅ 环境变量配置
- ✅ AccessKey有效性
- ✅ 网络连接
- ✅ API调用权限

### 方法 2: 通过阿里云CLI测试

```bash
# 安装阿里云CLI
npm install -g @alicloud/cli

# 配置凭证
aliyun configure

# 测试OCR API
aliyun ocr RecognizeCharacter \
  --RegionId cn-shanghai \
  --ImageURL https://example.com/test-image.jpg
```

### 方法 3: 通过控制台在线测试

1. 访问: https://next.api.aliyun.com/api/ocr/2019-12-30/RecognizeCharacter
2. 点击 "调试"
3. 上传测试图片
4. 查看返回结果

---

## 常见问题

### Q1: 显示"已开通"但仍然403

**可能原因**:
1. 激活未生效（等待10-30分钟）
2. AccessKey没有OCR权限
3. 使用了错误的API版本
4. 账户欠费

**解决方法**:
```bash
# 1. 检查AccessKey权限
# 登录 https://ram.console.aliyun.com/users
# 为RAM用户添加 AliyunOCRFullAccess 权限

# 2. 检查账户余额
# 访问 https://usercenter2.aliyun.com/finance/prepaycard/overview

# 3. 重新创建AccessKey
# 旧的Key可能有缓存问题
```

### Q2: 使用主账号AccessKey仍然403

**原因**: 主账号可能没有开通服务

**解决方法**:
1. 使用主账号登录阿里云控制台
2. 访问 https://ocr.console.aliyun.com/
3. 点击"立即开通"
4. 同意服务协议
5. 等待10分钟后测试

### Q3: 不同地域是否需要分别开通？

**答案**: 不需要

- OCR是全局服务，一次开通全地域可用
- 但API调用时需要指定地域endpoint
- 建议使用 `cn-shanghai` （网络延迟较低）

### Q4: 免费额度用完了会怎样？

**答案**:
- 免费额度: 5,000次/月
- 超出后按量计费: ¥0.001/次
- 需要账户有余额才能继续调用
- 可在控制台查看用量统计

---

## 应急方案

如果短期内无法解决阿里云OCR 403问题，可以暂时使用以下方案:

### 方案A: 使用腾讯云OCR (备选)

成本更低（¥0.0015/次，免费额度1000次/月）:

```bash
# 安装腾讯云SDK
pnpm add tencentcloud-sdk-nodejs-ocr
```

参考实现: [docs/AI题库-腾讯云OCR成本分析.md](./AI题库-腾讯云OCR成本分析.md)

### 方案B: 暂时跳过配图裁剪

系统已实现优雅降级:
- OCR失败时自动跳过配图裁剪
- 题目解析功能正常使用
- 所有题目共用原图（非最优但可用）

### 方案C: 手动裁剪后上传

1. 使用工具预先裁剪题目配图
2. 每题一张单独的图片文件
3. 在题目编辑页面单独上传

---

## 成功标志

当OCR正常工作时，日志应该显示:

```
[阿里云OCR] 配置检查: 已配置
[阿里云OCR] 开始识别图片布局
[阿里云OCR] 客户端初始化成功
[阿里云OCR] 识别完成 ✅
  processingTime: 1234ms
  textLength: 1500
  wordCount: 350
  imageSize: 1920x1080
[配图裁剪] 检测到 3 个图像区域
[配图裁剪] 成功匹配: 题目1 → 图像区域2
[配图裁剪] 成功匹配: 题目2 → 图像区域3
[配图裁剪] 裁剪并上传 2 张配图
```

---

## 技术支持

- **阿里云工单**: https://selfservice.console.aliyun.com/ticket/createIndex
- **OCR产品文档**: https://help.aliyun.com/product/442322.html
- **API参考**: https://next.api.aliyun.com/api/ocr/2019-12-30/RecognizeCharacter

---

## 更新日志

- 2025-11-26: 创建排查指南
- 诊断状态: 🔍 正在排查 403 错误
