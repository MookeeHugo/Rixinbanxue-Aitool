# AI题库 - PaddleOCR集成规划方案

> **规划时间**: 2025-11-25
> **目标**: 实现基于真实OCR坐标的题目配图裁剪功能
> **状态**: 📋 设计阶段

---

## 问题背景

### 当前问题
- ❌ Qwen3-VL-Flash 无法提供精确的像素级坐标（会产生幻觉数据）
- ❌ 无法实现"每道题显示独立配图"的功能
- ✅ Sharp裁剪工具已准备就绪，等待真实坐标输入

### 解决思路
集成 **PaddleOCR + PP-StructureV3** 进行文档布局分析，获取真实的像素级坐标，然后用于图片裁剪。

---

## 技术架构

### 整体流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 用户上传图片 (5道几何题)                                       │
│    → Supabase Storage 存储原图                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PaddleOCR 布局分析（新增步骤）                                 │
│    → PP-StructureV3 识别文档结构                                  │
│    → 输出：每个文本块/图片块的精确坐标 {x, y, w, h}                │
│    → 示例输出：                                                    │
│      [                                                            │
│        {type: "text", bbox: [10, 20, 500, 80], text: "1. ..."}, │
│        {type: "figure", bbox: [50, 120, 300, 250]},             │
│        {type: "text", bbox: [10, 280, 500, 340], text: "2. ..."}│
│      ]                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 智能坐标匹配（新增逻辑）                                        │
│    → 分析题号和配图的空间关系                                       │
│    → 匹配规则：                                                    │
│      - 几何题：配图通常在题目文字下方或右侧                          │
│      - 距离阈值：<100px 认为是同一题的配图                          │
│      - 面积过滤：>5000px² 才认为是有效配图                          │
│    → 输出：题号 → 配图区域的映射                                    │
│      {                                                            │
│        "1": {x: 50, y: 120, width: 300, height: 250},           │
│        "3": {x: 50, y: 450, width: 280, height: 220}            │
│      }                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Qwen3-VL-Flash 内容解析                                        │
│    → OCR结果 + 原图 → Qwen3-VL-Flash                              │
│    → 提示词优化：                                                  │
│      "已知图片中包含以下文本块：[OCR结果]"                           │
│      "请解析题目内容，输出JSON格式"                                 │
│    → 输出：题目内容、选项、答案、知识点等                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. 合并坐标与内容                                                  │
│    → 将 PaddleOCR 的配图坐标 合并到 Qwen3-VL 的解析结果            │
│    → questions[i].image_region = ocrCoordinates[questions[i].number] │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Sharp 裁剪配图（现有逻辑）                                      │
│    → cropQuestionImages(buffer, questions, userId, taskId)       │
│    → 批量裁剪并上传到 Supabase Storage                             │
│    → 返回：question_image_url 映射表                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. 保存到数据库                                                    │
│    → original_image_url: 原始完整图                                │
│    → question_image_url: 裁剪后的独立配图                          │
│    → image_region: OCR识别的坐标（用于调试）                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. 前端渲染（现有逻辑）                                            │
│    → QuestionContentRenderer 嵌入裁剪后的配图                      │
│    → Dialog查看原图                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 技术选型

### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **方案A：PaddleOCR Python服务** | ✅ 官方库，成熟稳定<br>✅ 准确率高<br>✅ 支持PP-StructureV3布局分析 | ❌ 需要单独部署Python服务<br>❌ 增加架构复杂度 | ⭐⭐⭐⭐⭐ **推荐** |
| 方案B：PaddleOCR.js (Node.js) | ✅ 集成到Next.js项目<br>✅ 无需额外服务 | ❌ 功能不如Python版完整<br>❌ 性能较差<br>❌ 不支持PP-StructureV3 | ⭐⭐ 不推荐 |
| 方案C：第三方OCR API（Azure/AWS） | ✅ 无需部署<br>✅ 按需付费 | ❌ 成本高<br>❌ 数据隐私风险<br>❌ 依赖外部服务 | ⭐⭐⭐ 可选 |
| 方案D：自训练模型（YOLOv8） | ✅ 针对性强<br>✅ 速度快 | ❌ 需要大量标注数据<br>❌ 训练成本高 | ⭐⭐ 长期方案 |

### 选定方案：**方案A - PaddleOCR Python服务**

**技术栈**:
```
PaddleOCR 2.8+ (Python)
↓
Flask/FastAPI REST API
↓
Docker 容器化
↓
Next.js 调用 HTTP API
```

---

## 实施方案

### 阶段一：PaddleOCR服务搭建

#### 1.1 创建Python服务

**目录结构**:
```
rixindemo-codex-m1/
├── paddleocr-service/          # 新建目录
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py                  # FastAPI服务
│   ├── ocr_analyzer.py         # OCR核心逻辑
│   └── test_images/            # 测试图片
```

**requirements.txt**:
```txt
paddleocr==2.8.1
paddlepaddle==2.6.0
fastapi==0.109.0
uvicorn==0.27.0
python-multipart==0.0.9
pillow==10.2.0
```

**app.py** (FastAPI服务):
```python
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ocr_analyzer import analyze_document_layout
import io
from PIL import Image

app = FastAPI(title="PaddleOCR Layout Analysis Service")

# CORS配置（仅允许Next.js开发环境）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

@app.post("/api/analyze-layout")
async def analyze_layout(file: UploadFile = File(...)):
    """
    分析图片布局，返回文本块和图片块的坐标

    返回格式：
    {
      "blocks": [
        {
          "type": "text",
          "bbox": [x, y, width, height],
          "text": "1. 如图，在△ABC中...",
          "confidence": 0.95
        },
        {
          "type": "figure",
          "bbox": [x, y, width, height],
          "confidence": 0.98
        }
      ],
      "image_size": [width, height]
    }
    """
    try:
        # 读取图片
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # 调用OCR分析
        result = analyze_document_layout(image)

        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**ocr_analyzer.py** (核心逻辑):
```python
from paddleocr import PaddleOCR, PPStructure
import numpy as np

# 初始化PP-StructureV3（文档布局分析）
structure_engine = PPStructure(
    layout_model='picodet_lcnet_x1_0_fgd_layout_cdla',
    show_log=False,
    use_gpu=False  # 生产环境根据实际情况调整
)

def analyze_document_layout(image):
    """
    使用PP-StructureV3分析文档布局

    返回：
    {
        "blocks": [
            {"type": "text", "bbox": [x, y, w, h], "text": "...", "confidence": 0.95},
            {"type": "figure", "bbox": [x, y, w, h], "confidence": 0.98}
        ],
        "image_size": [width, height]
    }
    """
    # 转换为numpy数组
    img_array = np.array(image)

    # PP-StructureV3分析
    result = structure_engine(img_array)

    blocks = []
    for item in result:
        bbox = item['bbox']  # [x1, y1, x2, y2]
        block_type = item['type']  # 'text', 'figure', 'table', etc.

        # 转换坐标格式：[x1, y1, x2, y2] → [x, y, width, height]
        x, y = bbox[0], bbox[1]
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]

        block = {
            "type": block_type,
            "bbox": [int(x), int(y), int(width), int(height)],
            "confidence": item.get('score', 0.0)
        }

        # 如果是文本块，提取文字内容
        if block_type == 'text' and 'res' in item:
            text_lines = [line['text'] for line in item['res']]
            block['text'] = '\n'.join(text_lines)

        blocks.append(block)

    return {
        "blocks": blocks,
        "image_size": [image.width, image.height]
    }
```

**Dockerfile**:
```dockerfile
FROM python:3.10-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 安装Python依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 下载PaddleOCR模型（避免每次启动都下载）
RUN python -c "from paddleocr import PPStructure; PPStructure(show_log=False)"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**启动命令**:
```bash
# 开发环境
cd paddleocr-service
docker build -t paddleocr-service .
docker run -p 8000:8000 paddleocr-service

# 测试健康检查
curl http://localhost:8000/health
```

---

### 阶段二：Next.js集成

#### 2.1 创建OCR客户端

**文件**: `src/lib/ai-question-bank/paddleocr-client.ts` (新建)

```typescript
/**
 * PaddleOCR服务客户端
 */

export interface OCRBlock {
  type: 'text' | 'figure' | 'table' | 'title';
  bbox: [number, number, number, number]; // [x, y, width, height]
  text?: string;
  confidence: number;
}

export interface OCRResult {
  blocks: OCRBlock[];
  image_size: [number, number];
}

/**
 * 调用PaddleOCR服务分析图片布局
 */
export async function analyzeImageLayout(imageBuffer: Buffer): Promise<OCRResult> {
  const ocrServiceUrl = process.env.PADDLEOCR_SERVICE_URL || 'http://localhost:8000';

  console.log('[PaddleOCR] 开始布局分析');

  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('file', blob, 'image.png');

    const response = await fetch(`${ocrServiceUrl}/api/analyze-layout`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`PaddleOCR服务响应错误: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`PaddleOCR分析失败: ${result.error}`);
    }

    console.log('[PaddleOCR] 布局分析完成', {
      blockCount: result.data.blocks.length,
      imageSize: result.data.image_size
    });

    return result.data;
  } catch (error) {
    console.error('[PaddleOCR] 布局分析失败', error);
    throw error;
  }
}

/**
 * 智能匹配题目配图
 * @param ocrBlocks OCR识别的所有块
 * @param questionTexts 题目文本列表 ["1. ...", "2. ...", ...]
 * @returns 题号到配图区域的映射 {"1": {x, y, width, height}, ...}
 */
export function matchQuestionImages(
  ocrBlocks: OCRBlock[],
  questionTexts: string[]
): Record<string, { x: number; y: number; width: number; height: number }> {
  const mapping: Record<string, { x: number; y: number; width: number; height: number }> = {};

  // 提取题号
  const questionNumbers = questionTexts.map(text => {
    const match = text.match(/^(\d+)[.、]/);
    return match ? match[1] : null;
  }).filter(Boolean) as string[];

  // 提取文本块和图片块
  const textBlocks = ocrBlocks.filter(b => b.type === 'text');
  const figureBlocks = ocrBlocks.filter(b => b.type === 'figure');

  console.log('[图片匹配] 开始匹配', {
    questionCount: questionNumbers.length,
    textBlockCount: textBlocks.length,
    figureBlockCount: figureBlocks.length
  });

  // 为每个题号寻找最近的图片块
  for (const questionNum of questionNumbers) {
    // 找到题号对应的文本块
    const textBlock = textBlocks.find(block =>
      block.text?.includes(`${questionNum}.`) || block.text?.includes(`${questionNum}、`)
    );

    if (!textBlock) {
      console.warn(`[图片匹配] 未找到题号 ${questionNum} 的文本块`);
      continue;
    }

    // 找到距离该文本块最近的图片块（通常在下方或右侧）
    const [textX, textY, textW, textH] = textBlock.bbox;
    const textBottom = textY + textH;

    let nearestFigure: OCRBlock | null = null;
    let minDistance = Infinity;

    for (const figure of figureBlocks) {
      const [figX, figY, figW, figH] = figure.bbox;

      // 过滤太小的图片块（可能是装饰性图标）
      if (figW < 80 || figH < 80) continue;

      // 计算距离（优先考虑下方或右侧的图片）
      let distance: number;

      if (figY > textBottom) {
        // 图片在文字下方
        distance = figY - textBottom;
      } else if (figX > textX + textW) {
        // 图片在文字右侧
        distance = figX - (textX + textW);
      } else {
        // 图片在其他位置，使用欧氏距离
        const centerTextX = textX + textW / 2;
        const centerTextY = textY + textH / 2;
        const centerFigX = figX + figW / 2;
        const centerFigY = figY + figH / 2;
        distance = Math.sqrt(
          Math.pow(centerFigX - centerTextX, 2) +
          Math.pow(centerFigY - centerTextY, 2)
        );
      }

      // 距离阈值：200px内认为是同一题的配图
      if (distance < minDistance && distance < 200) {
        minDistance = distance;
        nearestFigure = figure;
      }
    }

    if (nearestFigure) {
      const [x, y, width, height] = nearestFigure.bbox;
      mapping[questionNum] = { x, y, width, height };
      console.log(`[图片匹配] 题号 ${questionNum} 匹配成功`, {
        bbox: nearestFigure.bbox,
        distance: minDistance
      });
    } else {
      console.warn(`[图片匹配] 题号 ${questionNum} 未找到配图`);
    }
  }

  return mapping;
}
```

#### 2.2 修改上传处理流程

**文件**: `src/lib/ai-question-bank/process-upload.ts` (修改)

```typescript
import { analyzeImageLayout, matchQuestionImages } from './paddleocr-client';
import { cropQuestionImages } from './image-cropper';

export async function processUploadTask(data: { ... }) {
  // ... 前面的代码保持不变 ...

  // Step 4: 调用 PaddleOCR 进行布局分析（新增）
  console.log('调用 PaddleOCR 进行布局分析', { taskId });
  await supabase
    .from('upload_tasks')
    .update({ progress: 40, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  const ocrResult = await analyzeImageLayout(fileBuffer);
  console.log('PaddleOCR 布局分析完成', {
    taskId,
    blockCount: ocrResult.blocks.length
  });

  // Step 5: 调用 Qwen3-VL-Flash 解析内容
  console.log('调用 Qwen3-VL-Flash 解析', { taskId });
  await supabase
    .from('upload_tasks')
    .update({ progress: 60, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  const questions = await parseQuestions(imageBase64, {
    mimeType: imageMimeType,
    ocrHint: ocrResult.blocks // 传递OCR结果给Qwen（可选优化）
  });

  // Step 6: 智能匹配题目配图（新增）
  const questionTexts = questions.map(q => q.content);
  const imageMapping = matchQuestionImages(ocrResult.blocks, questionTexts);

  // 将OCR坐标合并到题目数据
  questions.forEach(q => {
    if (imageMapping[q.number]) {
      q.image_region = imageMapping[q.number];
    }
  });

  console.log('题目配图匹配完成', {
    taskId,
    questionCount: questions.length,
    questionsWithImages: questions.filter(q => q.image_region).length
  });

  // Step 7: 裁剪题目配图（恢复原有逻辑）
  await supabase
    .from('upload_tasks')
    .update({ progress: 75, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  let questionImageUrls: Record<string, string> = {};
  const questionsWithImages = questions.filter(q => q.image_region);

  if (questionsWithImages.length > 0) {
    console.log('开始裁剪题目配图', {
      taskId,
      questionCount: questionsWithImages.length
    });

    questionImageUrls = await cropQuestionImages(
      fileBuffer,
      questions,
      data.userId,
      taskId
    );

    console.log('题目配图裁剪完成', {
      taskId,
      croppedCount: Object.keys(questionImageUrls).length
    });
  }

  // Step 8: 保存到数据库
  await supabase
    .from('upload_tasks')
    .update({ progress: 90, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  const records = questions.map(q => ({
    upload_task_id: taskId,
    type: q.type,
    content: q.content,
    options: q.options || null,
    answer: q.answer,
    tags: q.tags,
    confidence_score: q.confidence,
    is_selected: true,
    is_submitted: false,
    original_image_url: fileUrl,
    question_image_url: questionImageUrls[q.number] || null,
    image_region: q.image_region || null
  }));

  await supabase.from('parsed_questions').insert(records);

  // ... 后续代码保持不变 ...
}
```

---

### 阶段三：环境配置

#### 3.1 Docker Compose配置

**文件**: `docker-compose.yml` (新建或修改)

```yaml
version: '3.8'

services:
  # PaddleOCR服务
  paddleocr:
    build: ./paddleocr-service
    ports:
      - "8000:8000"
    environment:
      - LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Next.js开发服务器（可选）
  nextjs:
    build: .
    ports:
      - "3002:3002"
    environment:
      - PADDLEOCR_SERVICE_URL=http://paddleocr:8000
    depends_on:
      - paddleocr
    volumes:
      - ./src:/app/src
```

#### 3.2 环境变量

**文件**: `.env.local` (添加)

```bash
# PaddleOCR服务地址
PADDLEOCR_SERVICE_URL=http://localhost:8000

# 生产环境使用内网地址
# PADDLEOCR_SERVICE_URL=http://paddleocr-service:8000
```

---

## 测试验证

### 测试步骤

1. **启动PaddleOCR服务**
   ```bash
   cd paddleocr-service
   docker-compose up paddleocr
   ```

2. **测试OCR服务**
   ```bash
   curl -X POST http://localhost:8000/api/analyze-layout \
     -F "file=@test-image.png" \
     | jq .
   ```

   预期输出：
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
     }
   }
   ```

3. **测试完整流程**
   - 访问 `http://localhost:3002/tools/ingest`
   - 上传包含5道几何题的图片
   - 等待处理完成
   - 验证：
     - ✅ 每道题显示独立配图（不是完整原图）
     - ✅ 配图位置准确
     - ✅ 数据库中 `question_image_url` 字段有值

### 验收标准

| 指标 | 目标 | 验证方法 |
|------|------|----------|
| **OCR识别准确率** | >95% | 检查 `blocks.confidence` |
| **配图匹配准确率** | >90% | 人工检查匹配结果 |
| **裁剪图片质量** | 清晰无裁切 | 查看裁剪后的图片 |
| **处理速度** | <20秒/图 | 监控日志时间戳 |
| **服务可用性** | >99% | 健康检查 |

---

## 部署方案

### 开发环境
```bash
# 本地启动PaddleOCR服务
docker-compose up paddleocr

# Next.js连接本地服务
PADDLEOCR_SERVICE_URL=http://localhost:8000 npm run dev
```

### 生产环境

#### 选项A：Docker容器化部署
```bash
# 构建镜像
docker build -t paddleocr-service:v1.0 ./paddleocr-service

# 部署到服务器
docker run -d \
  --name paddleocr \
  -p 8000:8000 \
  --restart=always \
  paddleocr-service:v1.0
```

#### 选项B：Kubernetes部署
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paddleocr-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: paddleocr
  template:
    metadata:
      labels:
        app: paddleocr
    spec:
      containers:
      - name: paddleocr
        image: paddleocr-service:v1.0
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
```

---

## 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **OCR服务不稳定** | 高 | 中 | 添加重试机制、健康检查、降级方案 |
| **坐标匹配错误** | 中 | 中 | 人工复核机制、置信度过滤、用户反馈 |
| **性能瓶颈** | 中 | 低 | GPU加速、请求队列、缓存策略 |
| **成本增加** | 低 | 高 | 按需启动、资源限制、监控优化 |
| **依赖冲突** | 低 | 低 | Docker隔离、版本锁定 |

---

## 性能优化建议

### 1. GPU加速（可选）
```python
# ocr_analyzer.py
structure_engine = PPStructure(
    use_gpu=True,  # 开启GPU加速
    gpu_mem=8000   # 分配8GB显存
)
```

### 2. 批量处理
```python
@app.post("/api/analyze-layout-batch")
async def analyze_layout_batch(files: List[UploadFile]):
    """批量处理多张图片"""
    results = []
    for file in files:
        result = await analyze_layout(file)
        results.append(result)
    return {"results": results}
```

### 3. 结果缓存
```typescript
// paddleocr-client.ts
const ocrCache = new Map<string, OCRResult>();

export async function analyzeImageLayout(imageBuffer: Buffer): Promise<OCRResult> {
  const hash = createHash('md5').update(imageBuffer).digest('hex');

  if (ocrCache.has(hash)) {
    console.log('[PaddleOCR] 命中缓存');
    return ocrCache.get(hash)!;
  }

  const result = await fetchOCRResult(imageBuffer);
  ocrCache.set(hash, result);
  return result;
}
```

---

## 实施步骤（按优先级）

### Phase 1: 核心功能（必须）
1. ✅ 搭建PaddleOCR Python服务
2. ✅ 实现FastAPI接口
3. ✅ 集成到Next.js上传流程
4. ✅ 实现智能配图匹配逻辑
5. ✅ 测试验证完整流程

### Phase 2: 稳定性增强（重要）
1. 添加错误处理和重试机制
2. 实现降级方案（OCR失败时回退到原图显示）
3. 添加监控和日志
4. 性能测试和优化

### Phase 3: 用户体验（优化）
1. 添加处理进度实时反馈
2. 支持人工调整配图匹配
3. 配图预览和编辑功能
4. 批量处理优化

### Phase 4: 生产部署（上线）
1. Docker镜像构建和测试
2. 部署到生产环境
3. 监控和告警配置
4. 文档和培训

---

## 预期收益

### 技术收益
- ✅ 真实的像素级坐标，裁剪准确率>95%
- ✅ 完全替代Qwen3-VL的坐标输出（幻觉数据）
- ✅ 保留Sharp裁剪工具和前端渲染逻辑

### 用户体验收益
- ✅ 每道题显示独立配图，不是完整原图
- ✅ 配图位置精确，无冗余内容
- ✅ 几何题阅读体验专业化

### 业务价值
- ✅ AI题库功能完整闭环
- ✅ 差异化竞争力（精确配图裁剪）
- ✅ 可扩展到其他文档类型（试卷、教材等）

---

## 附录

### A. PaddleOCR模型说明

| 模型 | 用途 | 准确率 | 速度 |
|------|------|--------|------|
| **PP-StructureV3** | 文档布局分析 | 95%+ | 快 |
| PaddleOCR-v4 | 文字识别 | 98%+ | 中 |
| PP-Layout | 版面分析 | 90%+ | 快 |

### B. 相关文档
- [PaddleOCR官方文档](https://github.com/PaddlePaddle/PaddleOCR)
- [PP-StructureV3论文](https://arxiv.org/abs/2303.05971)
- [Sharp图片处理库](https://sharp.pixelplumbing.com/)
- [现有Sharp实现](../src/lib/ai-question-bank/image-cropper.ts)

### C. 联系方式
- 技术咨询：参考PaddleOCR社区
- 问题反馈：项目Issues

---

**规划完成时间**: 2025-11-25
**预计开发周期**: 分4个Phase逐步实施
**技术可行性**: ⭐⭐⭐⭐⭐ 高度可行
**ROI评估**: ⭐⭐⭐⭐ 收益显著
