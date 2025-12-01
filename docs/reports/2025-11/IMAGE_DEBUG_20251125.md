# 图片显示问题调试报告 - 2025-11-25

## 问题现状

**症状**: 浏览器中点击"查看完整原图"按钮，Dialog弹出但图片无法加载显示

**签名URL示例**:
```
http://127.0.0.1:54321/storage/v1/object/sign/question-files/ai-question-bank/aaaaaaaa-1111-1111-1111-111111111111/1764053463668-vf5u97.png?token=...
```

## 服务端验证 ✅

使用curl测试URL：
```bash
curl -I "http://127.0.0.1:54321/storage/v1/object/sign/..."
```

**结果**:
- HTTP 200 OK
- Content-Type: image/png
- Content-Length: 252495 (约252KB)
- Access-Control-Allow-Origin: * (CORS已开启)

**结论**: 服务端完全正常，图片已成功上传并可访问。

---

## 可能的原因分析

### 1. 浏览器控制台错误（最可能）

**需要检查**: 打开浏览器开发者工具（F12），切换到Console标签，查看是否有以下错误：

#### A. CORS错误
```
Access to image at '...' from origin 'http://localhost:3002' has been blocked by CORS policy
```
**解决方案**:
- 检查Supabase本地配置的CORS设置
- 修改 `supabase/config.toml` 添加允许的域名

#### B. CSP (Content Security Policy) 错误
```
Refused to load the image '...' because it violates the following Content Security Policy directive: "img-src 'self'"
```
**解决方案**:
- 修改 `next.config.js` 添加CSP配置
- 允许从127.0.0.1加载图片

#### C. 混合内容错误
```
Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure image '...'
```
**解决方案**:
- 确保开发环境都使用HTTP或都使用HTTPS

### 2. Next.js 图片优化

Next.js默认会通过自己的Image Optimization API处理图片，可能导致问题。

**当前方案**: 使用原生`<img>`标签（已实现）

### 3. Supabase Storage配置

检查Supabase本地服务是否正确配置了存储桶权限。

---

## 立即排查步骤

### Step 1: 打开浏览器控制台
1. 访问审核页面: `http://localhost:3002/tools/ingest/[taskId]/review`
2. 按 F12 打开开发者工具
3. 切换到 **Console** 标签
4. 点击"查看完整原图"按钮
5. **截图或复制控制台中的错误信息**

### Step 2: 检查Network标签
1. 切换到 **Network** 标签
2. 筛选 "Img" 类型
3. 点击"查看完整原图"
4. 查看图片请求的状态：
   - **Status Code**: 200 (成功) / 4xx, 5xx (失败)
   - **Response Headers**: 检查CORS相关头
   - **Preview**: 查看是否能预览图片

### Step 3: 测试直接访问
在浏览器地址栏直接粘贴签名URL：
```
http://127.0.0.1:54321/storage/v1/object/sign/question-files/...?token=...
```

**预期结果**:
- ✅ 如果能直接看到图片 → CORS或CSP问题
- ❌ 如果也无法显示 → Supabase配置问题

---

## 临时解决方案（如果是CORS问题）

### 方案1: 修改Supabase配置

编辑 `supabase/config.toml`:
```toml
[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[storage]
enabled = true
file_size_limit = "50MiB"

# 添加CORS配置
[storage.cors]
allowed_origins = ["http://localhost:3002", "http://127.0.0.1:3002"]
```

重启Supabase:
```bash
npx supabase stop
npx supabase start
```

### 方案2: 使用代理API路由

创建 `src/app/api/image-proxy/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
  }

  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()

    return new NextResponse(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}
```

修改 `question-content-renderer.tsx`:
```typescript
// 使用代理URL代替直接访问
const proxyImageUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`

<img src={proxyImageUrl} alt="题目原图" />
```

### 方案3: Base64内嵌（不推荐，仅临时测试）

在服务端将图片转为Base64：
```typescript
import { getSignedUrl } from '@/lib/storage'

// 在review/page.tsx
const imageData = await fetch(signedUrl)
const buffer = await imageData.arrayBuffer()
const base64 = Buffer.from(buffer).toString('base64')
const dataUrl = `data:image/png;base64,${base64}`

// 传递dataUrl给客户端
```

---

## 下一步行动

1. **用户提供浏览器控制台截图** - 这是最重要的！
2. 根据错误信息选择对应的解决方案
3. 如果是CORS问题，使用方案1或方案2
4. 如果都不行，使用方案3作为临时方案

---

## 技术细节

### 当前实现流程
```
上传图片 → Supabase Storage
    ↓
保存 original_image_url (key)
    ↓
服务端生成签名URL (createSignedUrl)
    ↓
传递给客户端 (imageUrls prop)
    ↓
Dialog中显示 <img src={signedUrl} />
    ↓
❌ 浏览器拒绝加载（原因未知）
```

### 调试日志
服务端已添加详细日志：
- `[Review Page] 需要生成签名URL的图片`
- `[Review Page] ✅ 签名URL生成成功`
- `[ClientReviewPage] 接收到的props`
- `[QuestionContentRenderer] 渲染内容`
- `[QuestionContentRenderer] ✅ Dialog图片加载成功` (未触发)
- `[QuestionContentRenderer] ❌ Dialog图片加载失败` (应该触发了)

---

## 结论

问题出在**浏览器端**，而非服务端。需要查看浏览器控制台的具体错误信息才能定位根本原因。

**最有可能的原因排序**:
1. 🔴 CORS配置问题（90%）
2. 🟡 浏览器CSP策略（5%）
3. 🟢 其他浏览器安全策略（5%）
