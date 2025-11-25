# 题目显示问题修复报告

> **修复时间**: 2025-11-25
> **问题**: LaTeX公式不显示 + 图片404错误 + CSP违规

---

## 问题诊断

### 问题1: CSP (Content Security Policy) 违规
```
Loading the stylesheet 'https://cdn.jsdelivr.net/...' violates the following
Content Security Policy directive: "style-src 'self' 'unsafe-inline'"
```

**原因**: 尝试从CDN动态加载KaTeX库，但Next.js的CSP策略阻止了外部资源加载

### 问题2: 图片404错误
```
1764011611776-wgobh2.png:1 Failed to load resource: 404 (Not Found)
```

**原因**:
- 数据库存储的是相对路径：`ai-question-bank/{userId}/{timestamp}-{random}.png`
- 前端直接当作URL使用，没有转换为Supabase Storage的签名URL
- 存储桶 `question-files` 是**私有的**（`public: false`），需要签名URL才能访问

---

## 修复方案

### 方案1: LaTeX公式高亮显示（轻量级）

**决策**: 不使用CDN渲染库，改用CSS高亮显示LaTeX语法

**实现**: [src/components/question-content-renderer.tsx](../src/components/question-content-renderer.tsx)

**效果**:
- 行内公式 `$x^2 + y^2 = r^2$` → 黄色背景高亮
- 块级公式 `$$\int_0^1 f(x)dx$$` → 蓝色边框代码块

**优势**:
- ✅ 无CSP违规
- ✅ 无外部依赖
- ✅ 加载速度快
- ✅ 公式语法可见可复制

**限制**:
- ⚠️ 不渲染为数学符号（显示原始LaTeX语法）
- 💡 如需完整渲染，需安装本地katex包并配置CSP

---

### 方案2: 服务端生成签名URL

**实现位置**: [src/app/actions/question-upload.ts:199-226](../src/app/actions/question-upload.ts)

**核心逻辑**:
```typescript
// 为每个题目的原始图片生成签名URL
const questionsWithSignedUrls = await Promise.all(
  (questions || []).map(async (q) => {
    if (q.original_image_url) {
      // 生成1小时有效期的签名URL
      const { data: signedData } = await supabase.storage
        .from('question-files')
        .createSignedUrl(q.original_image_url, 3600);

      return {
        ...q,
        original_image_url: signedData?.signedUrl || q.original_image_url
      };
    }
    return q;
  })
);
```

**工作流程**:
1. Server Action查询 `parsed_questions` 表
2. 检测 `original_image_url` 字段（存储的是相对路径）
3. 调用 `supabase.storage.createSignedUrl()` 生成临时URL（1小时有效）
4. 替换原字段为完整的签名URL
5. 返回给客户端，直接可用

**优势**:
- ✅ 符合私有存储桶的安全策略
- ✅ 客户端无需处理，直接使用URL
- ✅ 签名URL包含身份验证信息
- ✅ 自动过期（1小时），防止链接泄露

---

## 修改的文件

### 新增 (0个)
无新增文件，复用现有迁移和组件

### 修改 (2个)

#### 1. [src/components/question-content-renderer.tsx](../src/components/question-content-renderer.tsx)
**变更**: 完全重写，移除CDN加载逻辑

**关键代码**:
```typescript
// LaTeX块级公式 - 蓝色边框
processed = processed.replace(
  /\$\$([\s\S]+?)\$\$/g,
  '<div class="bg-blue-50 ... rounded p-3">$$1$$</div>'
)

// LaTeX行内公式 - 黄色背景
processed = processed.replace(
  /\$([^\$]+?)\$/g,
  '<code class="bg-yellow-50 ... px-1.5">$$1$</code>'
)
```

#### 2. [src/app/actions/question-upload.ts](../src/app/actions/question-upload.ts)
**变更**: `getTaskQuestions()` 函数添加签名URL生成逻辑

**新增代码**: 第199-226行（共28行）

---

## 测试验证

### 测试步骤

1. **上传包含LaTeX公式的图片**
   - 访问 `/tools/ingest`
   - 上传数学题图片（包含公式）
   - 等待AI解析完成

2. **查看Review页面**
   ```
   /tools/ingest/{taskId}/review
   ```
   - ✅ 检查原始图片是否显示
   - ✅ 检查LaTeX公式是否高亮（黄色/蓝色）
   - ✅ 检查控制台无404或CSP错误

3. **提交后查看Library**
   ```
   /library
   ```
   - ✅ 检查题目内容中LaTeX公式高亮
   - ⚠️ Library页面不显示原图（设计如此）

### 预期结果

**Review页面**:
- 显示原始上传图片（最大高度600px）
- LaTeX公式用黄色/蓝色高亮
- 有提示文字："公式已高亮显示..."

**Library页面**:
- 只显示LaTeX公式高亮
- 不显示原图（questions表不存原图URL）

**控制台**:
- 无CSP错误
- 无404错误
- 可能有签名URL生成日志

---

## 数据库变更

**已应用的迁移**: `20251125000001_add_original_image_url.sql`

```sql
-- parsed_questions 表新增字段
ALTER TABLE public.parsed_questions
ADD COLUMN IF NOT EXISTS original_image_url TEXT;
```

**字段说明**:
- 存储格式：`ai-question-bank/{userId}/{timestamp}-{random}.{ext}`
- 转换方式：服务端使用 `createSignedUrl()` 生成临时URL
- 有效期：1小时（3600秒）

---

## 未来优化方向

### 选项1: 完整LaTeX渲染（推荐）

**步骤**:
1. 安装依赖（需要解决Node版本问题）:
   ```bash
   npm install katex react-katex
   ```

2. 配置Next.js CSP允许内联样式:
   ```javascript
   // next.config.js
   module.exports = {
     async headers() {
       return [{
         source: '/(.*)',
         headers: [{
           key: 'Content-Security-Policy',
           value: "style-src 'self' 'unsafe-inline';"
         }]
       }]
     }
   }
   ```

3. 使用react-katex组件:
   ```tsx
   import { InlineMath, BlockMath } from 'react-katex';
   import 'katex/dist/katex.min.css';
   ```

### 选项2: 服务端渲染LaTeX

使用Next.js Server Components + katex在服务端渲染，避免CSP问题。

### 选项3: 保持现状

轻量级方案已能满足基本需求，教师可以看到公式原文便于校对。

---

## 技术要点总结

### Supabase Storage签名URL

**为什么需要**:
- `question-files` 存储桶设置为私有（`public: false`）
- RLS策略要求认证用户才能访问
- `getPublicUrl()` 对私有桶无效

**正确用法**:
```typescript
// ✅ 正确 - 生成签名URL（私有桶）
const { data } = await supabase.storage
  .from('question-files')
  .createSignedUrl(path, expiresIn);

// ❌ 错误 - 公开URL（私有桶无法访问）
const { data } = await supabase.storage
  .from('question-files')
  .getPublicUrl(path);
```

### CSP策略与外部资源

**Next.js默认CSP**:
- `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
- `style-src 'self' 'unsafe-inline'`

**不允许**:
- ❌ CDN加载CSS/JS
- ❌ 外部脚本动态注入

**解决方案**:
- ✅ 本地安装依赖
- ✅ 配置CSP白名单
- ✅ 使用轻量级方案（本次采用）

---

## 问题状态

| 问题 | 状态 | 解决方案 |
|------|------|----------|
| CSP违规 | ✅ 已解决 | 移除CDN加载，使用CSS高亮 |
| 图片404 | ✅ 已解决 | 服务端生成签名URL |
| LaTeX渲染 | ⚠️ 部分解决 | 高亮显示，不渲染符号 |

---

**修复完成时间**: 2025-11-25
**验证状态**: 待测试（需重新上传文件验证）
**下一步**: 邀请教师测试完整流程

---

## 相关文档

- [AI题库MVP-完成验证报告](./AI题库MVP-完成验证报告.md)
- [上传&解析修复报告](./UPLOAD_PARSE_FIX_REPORT_20251125.md)
- [Supabase Storage迁移](../supabase/migrations/20241124000002_create_question_files_storage.sql)
