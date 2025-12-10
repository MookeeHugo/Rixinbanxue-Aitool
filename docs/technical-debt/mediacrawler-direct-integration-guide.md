# MediaCrawler 直接集成指南

**创建日期**: 2025-12-11
**目标**: 直接集成 MediaCrawler 到 Next.js 项目，无需逆向或重写

---

## 🎯 核心理念：直接使用，不要重复造轮子

MediaCrawler 是**开源项目**，我们可以：
- ✅ **直接使用** - 作为依赖或子进程
- ✅ **直接调用** - 通过 Python API 或命令行
- ✅ **直接集成** - 添加薄薄的 HTTP API 层
- ❌ **不需要逆向** - 代码完全开源可见
- ❌ **不需要重写** - 已验证可行的方案

---

## 📋 三种直接集成方案

### 方案1: 作为子进程调用（最简单，推荐快速验证）⭐⭐⭐⭐

**原理**: Next.js API 直接调用 MediaCrawler 的 Python 脚本

**优点**:
- ✅ 最快实现（1-2小时）
- ✅ 不需要额外服务
- ✅ 代码在同一个仓库

**缺点**:
- ⚠️ 每次请求启动新进程（性能较低）
- ⚠️ 需要服务器安装 Python 环境

#### 实施步骤

**1. 克隆 MediaCrawler 到项目中 (5分钟)**

```bash
# 在项目根目录
git clone https://github.com/NanmiCoder/MediaCrawler.git media-crawler

cd media-crawler
pip install -r requirements.txt
playwright install chromium
```

**项目结构**:
```
项目根目录/
├── src/                    # Next.js 代码
├── media-crawler/          # MediaCrawler (NEW)
│   ├── config/
│   ├── media_platform/
│   │   └── xhs/            # 小红书爬虫
│   └── main.py
├── package.json
└── README.md
```

**2. 创建配置文件 (10分钟)**

```python
# media-crawler/config/xiaohongshu_config.py
XHS_CONFIG = {
    "platform": "xhs",
    "login_type": "cookie",  # 使用 cookie 登录
    "cookies_file": "../test-reports/xiaohongshu-cookies.json",
    "crawler_type": "search",  # 搜索模式
    "enable_comment": False,  # 不爬取评论（提高速度）
    "max_note_count": 10,
}
```

**3. 创建 Python 调用脚本 (15分钟)**

```python
# media-crawler/crawl_api.py
import sys
import json
import asyncio
from media_platform.xhs.core import XiaoHongShuCrawler

async def search_notes(keyword: str, max_count: int = 10):
    """搜索小红书笔记"""
    crawler = XiaoHongShuCrawler()

    try:
        await crawler.start()

        # 搜索笔记
        notes = await crawler.search(keyword, max_count)

        # 返回 JSON
        result = {
            "success": True,
            "data": notes,
            "count": len(notes)
        }
        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))

    finally:
        await crawler.close()

if __name__ == "__main__":
    keyword = sys.argv[1] if len(sys.argv) > 1 else "初中数学"
    max_count = int(sys.argv[2]) if len(sys.argv) > 2 else 10

    asyncio.run(search_notes(keyword, max_count))
```

**4. Next.js API 路由集成 (20分钟)**

```typescript
// src/app/api/crawl/xiaohongshu/route.ts
import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { keyword, maxResults = 10 } = await req.json();

    // 验证参数
    if (!keyword) {
      return Response.json(
        { error: '关键词不能为空' },
        { status: 400 }
      );
    }

    // 调用 MediaCrawler Python 脚本
    const result = await callMediaCrawler(keyword, maxResults);

    if (!result.success) {
      return Response.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // 保存到数据库
    await savePostsToDatabase(result.data);

    return Response.json({
      success: true,
      count: result.count,
      posts: result.data
    });

  } catch (error) {
    console.error('[Crawl API] Error:', error);
    return Response.json(
      { error: '爬取失败' },
      { status: 500 }
    );
  }
}

async function callMediaCrawler(
  keyword: string,
  maxResults: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      process.cwd(),
      'media-crawler',
      'crawl_api.py'
    );

    const pythonProcess = spawn('python', [
      scriptPath,
      keyword,
      maxResults.toString()
    ]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}\n${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });

    // 设置超时（5分钟）
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python process timeout'));
    }, 5 * 60 * 1000);
  });
}
```

**5. 前端调用示例 (10分钟)**

```typescript
// 在你的 AI Creator 页面中
async function handleCrawl() {
  setLoading(true);

  try {
    const response = await fetch('/api/crawl/xiaohongshu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: '初中数学',
        maxResults: 10
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(`成功爬取 ${result.count} 个帖子`);
      setPosts(result.posts);
    } else {
      console.error('爬取失败:', result.error);
    }
  } catch (error) {
    console.error('请求失败:', error);
  } finally {
    setLoading(false);
  }
}
```

**总计时间**: 约 1 小时

---

### 方案2: 作为独立微服务（推荐生产环境）⭐⭐⭐⭐⭐

**原理**: MediaCrawler 运行为独立 HTTP 服务，Next.js 通过 API 调用

**优点**:
- ✅ 性能最好（进程常驻）
- ✅ 独立部署和扩展
- ✅ 不阻塞 Next.js 主进程

**缺点**:
- ⚠️ 需要部署额外服务
- ⚠️ 稍微复杂一些

#### 实施步骤

**1. 为 MediaCrawler 添加 HTTP API 层 (30分钟)**

```python
# media-crawler/api_server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from media_platform.xhs.core import XiaoHongShuCrawler
import asyncio

app = FastAPI(title="MediaCrawler API")

# 全局爬虫实例（复用浏览器）
crawler = None

class SearchRequest(BaseModel):
    keyword: str
    max_results: int = 10

class CrawlResponse(BaseModel):
    success: bool
    data: list
    count: int

@app.on_event("startup")
async def startup():
    global crawler
    crawler = XiaoHongShuCrawler()
    await crawler.start()
    print("✓ MediaCrawler 服务已启动")

@app.on_event("shutdown")
async def shutdown():
    global crawler
    if crawler:
        await crawler.close()
    print("✓ MediaCrawler 服务已关闭")

@app.post("/api/search", response_model=CrawlResponse)
async def search_notes(request: SearchRequest):
    """搜索小红书笔记"""
    try:
        notes = await crawler.search(
            request.keyword,
            request.max_results
        )

        return {
            "success": True,
            "data": notes,
            "count": len(notes)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"爬取失败: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "service": "MediaCrawler API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
```

**2. 安装 FastAPI 依赖**

```bash
cd media-crawler
pip install fastapi uvicorn pydantic
```

**3. 启动 MediaCrawler 服务**

```bash
# 开发环境
python api_server.py

# 生产环境（使用 gunicorn）
gunicorn api_server:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**4. Docker 部署（可选）**

```dockerfile
# media-crawler/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY . .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install fastapi uvicorn pydantic

# 安装 Playwright 浏览器
RUN playwright install chromium
RUN playwright install-deps chromium

# 暴露端口
EXPOSE 8000

# 启动服务
CMD ["python", "api_server.py"]
```

**启动 Docker 容器**:
```bash
docker build -t mediacrawler-api ./media-crawler
docker run -d -p 8000:8000 \
  -v $(pwd)/test-reports:/app/cookies \
  mediacrawler-api
```

**5. Next.js API 调用微服务**

```typescript
// src/app/api/crawl/xiaohongshu/route.ts
const MEDIACRAWLER_URL = process.env.MEDIACRAWLER_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  const { keyword, maxResults = 10 } = await req.json();

  try {
    // 调用 MediaCrawler 微服务
    const response = await fetch(`${MEDIACRAWLER_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        max_results: maxResults
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail);
    }

    const result = await response.json();

    // 保存到数据库
    await savePostsToDatabase(result.data);

    return Response.json(result);

  } catch (error) {
    console.error('[Crawl API] Error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**6. 环境变量配置**

```bash
# .env.local
MEDIACRAWLER_URL=http://localhost:8000
```

**总计时间**: 约 2-3 小时

---

### 方案3: 作为 Git Submodule（推荐团队协作）⭐⭐⭐⭐

**原理**: 将 MediaCrawler 作为 Git 子模块，方便版本管理和更新

**优点**:
- ✅ 版本可控
- ✅ 方便团队协作
- ✅ 可以跟踪 MediaCrawler 更新

**实施步骤**:

```bash
# 1. 添加为子模块
git submodule add https://github.com/NanmiCoder/MediaCrawler.git media-crawler

# 2. 初始化子模块
git submodule init
git submodule update

# 3. 更新到最新版本
cd media-crawler
git pull origin main

# 4. 提交子模块变更
cd ..
git add media-crawler
git commit -m "chore: 更新 MediaCrawler 子模块"
```

**然后按照方案1或方案2集成**

---

## 📊 方案对比

| 特性 | 方案1: 子进程 | 方案2: 微服务 | 方案3: Submodule |
|------|-------------|--------------|-----------------|
| **实施时间** | 1小时 | 2-3小时 | +方案1/2 |
| **性能** | 中等 | 最好 | 取决于集成方式 |
| **部署复杂度** | 低 | 中 | 低 |
| **生产就绪** | ⚠️ | ✅ | ✅ |
| **推荐度** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 推荐实施路径

### 阶段1: 快速验证（今天）
1. 使用**方案1: 子进程调用**
2. 验证 MediaCrawler 在你的环境中可以正常工作
3. 测试关键词搜索功能
4. 预计时间: **1小时**

### 阶段2: 生产优化（本周）
1. 迁移到**方案2: 微服务**
2. 添加 FastAPI HTTP 层
3. 部署为 Docker 容器
4. 预计时间: **2-3小时**

### 阶段3: 版本管理（后续）
1. 改用**方案3: Git Submodule**
2. 便于跟踪 MediaCrawler 更新
3. 团队协作更方便

---

## 💡 关键要点

### ✅ 我们应该做的

1. **直接��用 MediaCrawler**
   - 它是开源的，无需重写
   - 代码已验证可行
   - 社区活跃，持续更新

2. **添加薄薄的集成层**
   - HTTP API 或子进程调用
   - 数据转换和存储
   - 错误处理

3. **专注于业务逻辑**
   - AI 分析
   - 内容推荐
   - 配额管理

### ❌ 我们不应该做的

1. ~~逆向小红书 API~~
   - MediaCrawler 已经做了
   - 不需要重复工作

2. ~~用 TypeScript 重写爬虫~~
   - 耗时 2-3 周
   - 维护成本高
   - 不如直接用现成的

3. ~~深入研究签名算法~~
   - MediaCrawler 已处理
   - 通过 JS 表达式获取

---

## 🛠️ 实战：30分钟快速上手

### 第一步：克隆 MediaCrawler (2分钟)

```bash
cd ~/projects/Rixindemo-codex-m1
git clone https://github.com/NanmiCoder/MediaCrawler.git media-crawler
cd media-crawler
```

### 第二步：安装依赖 (5分钟)

```bash
pip install -r requirements.txt
playwright install chromium
```

### 第三步：配置 Cookie (5分钟)

```bash
# 复制你的 cookies 文件
cp ../test-reports/xiaohongshu-cookies.json ./cookies/xhs_cookies.json
```

### 第四步：测试爬虫 (3分钟)

```bash
# 修改 config/base_config.py
# CRAWLER_TYPE = "search"
# KEYWORDS = "初中数学"
# MAX_NOTE_COUNT = 5

python main.py
```

**预期输出**:
```
[XHS] 开始爬取...
[XHS] 搜索关键词: 初中数学
[XHS] 找到 20 个笔记
[XHS] 正在获取详情...
[XHS] 成功爬取 5 个笔记
[XHS] 数据已保存到 data/xhs/search_初中数学.json
```

### 第五步：创建 API 脚本 (10分钟)

按照上面"方案1"的代码创建 `crawl_api.py`

### 第六步：Next.js 集成 (5分钟)

创建 API 路由，调用 Python 脚本

---

## 📝 常见问题

### Q1: MediaCrawler 需要手动登录吗？

**A**: 可以使用 Cookie 文件登录，不需要���次手动操作。

```python
# config/base_config.py
LOGIN_TYPE = "cookie"  # 使用 cookie 登录
COOKIES_DIR_PATH = "./cookies"
```

### Q2: 如何更新 MediaCrawler？

**A**: 如果使用 Git Submodule：
```bash
cd media-crawler
git pull origin main
cd ..
git add media-crawler
git commit -m "chore: 更新 MediaCrawler"
```

### Q3: 性能如何？

**A**:
- 子进程调用: ~10-30秒/次（启动开销）
- 微服务: ~2-5秒/次（浏览器常驻）

### Q4: 会被封禁吗？

**A**: MediaCrawler 已实现：
- 随机延迟
- IP 代理池（可选）
- 请求频率控制
- 模拟真实用户行为

正常使用不容易被封。

---

## 🚀 立即开始

**最快验证路径**（今天完成）：

```bash
# 1. 克隆 MediaCrawler
git clone https://github.com/NanmiCoder/MediaCrawler.git media-crawler

# 2. 测试是否可用
cd media-crawler
pip install -r requirements.txt
python main.py

# 3. 如果成功，创建 API 脚本
# 参考上面的 crawl_api.py

# 4. Next.js 调用
# 参考上面的 API 路由代码
```

**预计总时间**: 1小时

---

## ✅ 总结

| 问题 | 答案 |
|------|------|
| **能直接用吗？** | ✅ 可以！MediaCrawler 是开源的 |
| **需要逆向吗？** | ❌ 不需要！直接集成即可 |
| **需要重写吗？** | ❌ 不需要！添加 API 层就行 |
| **多久能完成？** | ✅ 1小时（子进程）或 2-3小时（微服务） |
| **生产可用吗？** | ✅ 可以！很多项目在用 |

**下一步行动**：
1. 今天：快速验证（方案1）
2. 本周：生产优化（方案2）
3. 后续：版本管理（方案3）

---

**文档版本**: 2.0
**最后更新**: 2025-12-11
**纠正说明**: 删除了"逆向"和"重写"的误导性建议，强调直接集成开源项目
