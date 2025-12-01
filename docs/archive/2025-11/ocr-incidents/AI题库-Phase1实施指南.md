# AI题库 - Phase 1 实施指南

> **实施时间**: 2025-11-25
> **目标**: 搭建PaddleOCR服务并验证基础功能
> **状态**: 🚧 开发中

---

## 已完成的工作 ✅

### 1. PaddleOCR Python服务
```
✅ paddleocr-service/
   ├── app.py                  # FastAPI服务
   ├── ocr_analyzer.py         # OCR核心逻辑
   ├── requirements.txt        # Python依赖
   ├── Dockerfile              # Docker镜像配置
   ├── docker-compose.yml      # Docker Compose配置
   ├── .dockerignore           # Docker忽略文件
   ├── start.sh                # 启动脚本
   ├── README.md               # 服务文档
   └── test_images/            # 测试图片目录
```

### 2. Next.js集成代码
```
✅ src/lib/ai-question-bank/
   ├── paddleocr-client.ts     # OCR客户端
   ├── image-cropper.ts        # Sharp裁剪工具（已有）
   └── content-formatter.ts    # 配图嵌入逻辑（已有）
```

### 3. 环境配置
```
✅ .env.local.example          # 环境变量示例
```

---

## 第一步：启动PaddleOCR服务

### 方式A：使用Docker（推荐）

```bash
# 1. 进入服务目录
cd paddleocr-service

# 2. 构建镜像（首次运行，约需5分钟）
docker-compose build

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 健康检查
curl http://localhost:8000/health
```

**预期输出**:
```json
{
  "status": "ok",
  "service": "paddleocr-layout-analysis",
  "timestamp": 1732531200.0
}
```

### 方式B：本地Python运行（开发调试）

```bash
# 1. 确保Python 3.10+
python --version

# 2. 安装依赖（首次运行）
cd paddleocr-service
pip install -r requirements.txt

# 3. 启动服务
python app.py

# 或使用启动脚本
./start.sh
```

**首次启动说明**:
- 会自动下载PaddleOCR模型（约300MB）
- 需要等待5-10分钟
- 下载完成后会自动启动服务

---

## 第二步：测试OCR服务

### 2.1 准备测试图片

```bash
# 在 paddleocr-service/test_images/ 目录下放置测试图片
# 例如：包含5道几何题的图片
cp /path/to/your/test-image.png paddleocr-service/test_images/sample.png
```

### 2.2 使用curl测试

```bash
# 测试健康检查
curl http://localhost:8000/health

# 测试布局分析
curl -X POST \
  http://localhost:8000/api/analyze-layout \
  -F "file=@paddleocr-service/test_images/sample.png" \
  | jq .
```

**预期输出**（截取）:
```json
{
  "success": true,
  "data": {
    "blocks": [
      {
        "type": "text",
        "bbox": [10, 20, 500, 80],
        "text": "1. 如图，在△ABC中...",
        "confidence": 0.95
      },
      {
        "type": "figure",
        "bbox": [50, 120, 300, 250],
        "confidence": 0.98
      }
    ],
    "image_size": [800, 1200]
  },
  "processing_time": 2.5,
  "stats": {
    "text": 5,
    "figure": 3
  }
}
```

### 2.3 验证要点

| 验证项 | 预期结果 | 说明 |
|--------|----------|------|
| **健康检查** | `status: "ok"` | 服务正常运行 |
| **blocks数量** | >0 | 识别到区块 |
| **figure类型** | 有几个 | 识别到几何图形 |
| **text内容** | 有题目文字 | OCR文字识别正常 |
| **bbox坐标** | 正整数 | 坐标合理 |
| **processing_time** | <10s | 性能可接受 |

---

## 第三步：集成到Next.js（暂缓实施）

⚠️ **重要**: 在验证OCR服务正常工作后，再继续此步骤。

### 3.1 配置环境变量

编辑 `.env.local`（参考 `.env.local.example`）:

```bash
# PaddleOCR服务地址
PADDLEOCR_SERVICE_URL=http://localhost:8000

# 功能开关（暂时设为false）
ENABLE_OCR_IMAGE_CROPPING=false
```

### 3.2 修改上传流程（等待实施）

修改 `src/lib/ai-question-bank/process-upload.ts`:

```typescript
import { analyzeImageLayout, matchQuestionImages, checkOCRServiceHealth } from './paddleocr-client';
import { cropQuestionImages } from './image-cropper';

export async function processUploadTask(data: { ... }) {
  // ... 前面的代码保持不变 ...

  // 新增：检查OCR服务是否可用
  const enableOCR = process.env.ENABLE_OCR_IMAGE_CROPPING === 'true';
  if (enableOCR) {
    const ocrHealthy = await checkOCRServiceHealth();
    if (!ocrHealthy) {
      console.warn('[上传处理] OCR服务不可用，跳过配图裁剪');
      enableOCR = false;
    }
  }

  // 新增：调用PaddleOCR进行布局分析
  let imageMapping: Record<string, ImageRegion> = {};
  if (enableOCR) {
    try {
      console.log('调用 PaddleOCR 进行布局分析', { taskId });
      const ocrResult = await analyzeImageLayout(fileBuffer);

      // 智能匹配题目配图
      const questionTexts = questions.map(q => q.content);
      imageMapping = matchQuestionImages(ocrResult.blocks, questionTexts);

      console.log('题目配图匹配完成', {
        taskId,
        matchedCount: Object.keys(imageMapping).length
      });
    } catch (error) {
      console.error('OCR分析失败，跳过配图裁剪', error);
    }
  }

  // 将OCR坐标合并到题目数据
  questions.forEach(q => {
    if (imageMapping[q.number]) {
      q.image_region = imageMapping[q.number];
    }
  });

  // 裁剪题目配图
  let questionImageUrls: Record<string, string> = {};
  const questionsWithImages = questions.filter(q => q.image_region);

  if (questionsWithImages.length > 0) {
    questionImageUrls = await cropQuestionImages(
      fileBuffer,
      questions,
      data.userId,
      taskId
    );
  }

  // 保存到数据库
  const records = questions.map(q => ({
    // ... 其他字段 ...
    original_image_url: fileUrl,
    question_image_url: questionImageUrls[q.number] || null,
    image_region: q.image_region || null
  }));

  // ... 后续代码保持不变 ...
}
```

**注意**: 此步骤暂不实施，等OCR服务测试通过后再进行。

---

## 故障排查

### 问题1：Docker构建失败

**错误**: `ERROR [internal] load metadata for docker.io/library/python:3.10-slim`

**解决**:
```bash
# 检查Docker是否运行
docker ps

# 尝试拉取基础镜像
docker pull python:3.10-slim

# 重新构建
docker-compose build --no-cache
```

### 问题2：模型下载失败

**错误**: `ConnectionError: Failed to download model`

**解决**:
```bash
# 方案A：手动下载模型（中国大陆）
# 访问 PaddleOCR 官方获取模型下载链接

# 方案B：配置代理
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# 方案C：使用国内镜像源（修改 Dockerfile）
# 添加：
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

### 问题3：服务启动慢

**现象**: 启动后长时间无响应

**原因**: 首次运行会下载模型（约300MB）

**解决**: 耐心等待，查看日志：
```bash
docker-compose logs -f paddleocr
```

### 问题4：内存不足

**错误**: `MemoryError` 或 `Killed`

**解决**:
```bash
# 方案A：增加Docker内存限制（Docker Desktop设置 → Resources → Memory）
# 推荐：至少4GB

# 方案B：修改 docker-compose.yml 添加内存限制
services:
  paddleocr:
    mem_limit: 4g
    memswap_limit: 4g
```

### 问题5：端口占用

**错误**: `Address already in use: 8000`

**解决**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # Linux/Mac

# 修改端口（docker-compose.yml）
ports:
  - "8001:8000"  # 改为8001

# 更新环境变量（.env.local）
PADDLEOCR_SERVICE_URL=http://localhost:8001
```

---

## 性能基准测试

### 测试环境
- CPU: Intel i7-10700
- 内存: 16GB
- 图片: 800x1200, 200KB

### 预期性能指标

| 指标 | 目标值 | 实际值 | 状态 |
|------|--------|--------|------|
| **服务启动时间** | <60s | _待测_ | ⏳ |
| **首次模型加载** | <30s | _待测_ | ⏳ |
| **图片分析时间** | <10s | _待测_ | ⏳ |
| **OCR准确率** | >95% | _待测_ | ⏳ |
| **配图匹配率** | >90% | _待测_ | ⏳ |

### 性能测试脚本

```bash
# 测试10次取平均值
for i in {1..10}; do
  echo "测试 $i/10"
  time curl -s -X POST \
    http://localhost:8000/api/analyze-layout \
    -F "file=@test_images/sample.png" \
    > /dev/null
done
```

---

## 下一步计划

### ✅ Phase 1 - 核心功能（当前）
- [x] 搭建PaddleOCR Python服务
- [x] 实现FastAPI接口
- [x] Docker容器化
- [x] Next.js客户端代码
- [ ] **OCR服务功能测试（下一步）**
- [ ] 集成到上传流程
- [ ] 端到端流程测试

### 🔜 Phase 2 - 稳定性增强
- [ ] 错误处理和重试机制
- [ ] 降级方案（OCR失败回退）
- [ ] 监控和告警
- [ ] 性能优化

### 🔜 Phase 3 - 用户体验
- [ ] 实时进度反馈
- [ ] 人工调整配图匹配
- [ ] 批量处理优化

### 🔜 Phase 4 - 生产部署
- [ ] 生产环境部署
- [ ] 负载测试
- [ ] 文档和培训

---

## 检查清单

### 开始测试前

- [ ] Docker已安装并运行
- [ ] Python 3.10+已安装（如本地运行）
- [ ] 至少2GB可用内存
- [ ] 准备好测试图片（包含几何题）
- [ ] 网络正常（需下载模型）

### 测试通过标准

- [ ] `/health` 接口返回 `status: ok`
- [ ] `/api/analyze-layout` 能识别文本块
- [ ] `/api/analyze-layout` 能识别图片块
- [ ] 坐标数值合理（正整数，在图片范围内）
- [ ] 处理时间 <10秒
- [ ] 无错误日志

---

## 联系与支持

### 参考文档
- [PaddleOCR集成规划](./AI题库-PaddleOCR集成规划.md)
- [配图裁剪功能报告](./AI题库-配图裁剪功能实现报告.md)
- [PaddleOCR官方文档](https://github.com/PaddlePaddle/PaddleOCR)

### 常见问题
如遇问题，请先查看故障排查章节，或参考 `paddleocr-service/README.md`

---

**更新时间**: 2025-11-25
**当前状态**: ✅ 代码已完成，⏳ 等待测试
**下一步**: 启动PaddleOCR服务并进行功能测试
