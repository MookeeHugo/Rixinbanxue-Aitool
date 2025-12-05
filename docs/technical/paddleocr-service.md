# PaddleOCR 布局分析服务运维手册

> 版本：2025-12-04。该服务基于 PaddleOCR PP-StructureV3，实现页面级文字/图像区域检测，并通过 FastAPI 暴露统一接口。

## 功能概览

- **多类型版面识别**：文本、表格、公式、图片等区域统一返回。
- **精确坐标**：输出左上/右下像素坐标，可直接用于题目切图或高亮。
- **REST API**：FastAPI 服务支持 JSON/Multipart 请求，便于被 Next.js、脚本或 Inngest 任务调用。
- **容器化部署**：提供 Dockerfile 与 docker-compose，支持 `--restart=always` 自愈。
- **健康检查**：`/health` 返回版本与时间戳，可用于监控。

## 快速启动

### 方式一：Docker（推荐）

```bash
# 构建镜像
docker build -t paddleocr-service .

# 运行容器
docker run -d \
  --name paddleocr \
  -p 8000:8000 \
  --restart=always \
  paddleocr-service

# 或 docker-compose
docker-compose up -d
```

### 方式二：本地 Python

```bash
pip install -r requirements.txt
python app.py
```

默认暴露在 `http://localhost:8000`。

## API 列表

### 1. 健康检查

```
GET /health
```

响应示例：

```json
{
  "status": "ok",
  "service": "paddleocr-layout-analysis",
  "timestamp": 1732531200.0
}
```

### 2. 布局分析

```
POST /api/analyze-layout
Content-Type: multipart/form-data
```

参数：
- `file`：PNG/JPG/JPEG 图片。

响应示例：

```json
{
  "success": true,
  "data": {
    "blocks": [
      {
        "type": "text",
        "bbox": [10, 20, 500, 80],
        "text": "1. 如图，在△ABC中……",
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

## 测试方式

```bash
# curl 健康检查
curl http://localhost:8000/health

# curl 布局分析
curl -X POST \
  http://localhost:8000/api/analyze-layout \
  -F "file=@test.png" | jq .
```

Python 示例：

```python
import requests

with open('test.png', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/analyze-layout',
        files={'file': f}
    )

result = response.json()
print(f"检测出 {len(result['data']['blocks'])} 个区域")
```

## 配置与优化

### 环境变量

- `LOG_LEVEL`：日志级别，默认 `info`。
- `PYTHONUNBUFFERED`：是否关闭 Python 缓冲，默认 `1`。

### GPU 加速（可选）

在 `ocr_analyzer.py` 中启用：

```python
structure_engine = PPStructure(
    use_gpu=True,
    gpu_mem=8000
)
```

并安装 GPU 版本 PaddlePaddle：

```bash
pip install paddlepaddle-gpu
```

## 常见问题

| 场景 | 处理建议 |
| --- | --- |
| 首次启动缓慢 | 模型文件约 700MB，会自动下载，耐心等待即可。 |
| 内存不足 | 建议至少 2GB 可用内存；必要时降低并发或切换 GPU。 |
| 识别效果差 | 提升图片清晰度（>600 DPI）、校正方向、必要时做二值化预处理。 |
| 调用失败 | 先访问 `/health` 确认服务在线，再检查日志是否存在 Paddle 依赖报错。 |

## 项目结构

```
paddleocr-service/
├── app.py                 # FastAPI 主入口
├── ocr_analyzer.py        # OCR 逻辑
├── requirements.txt       # Python 依赖
├── Dockerfile / docker-compose.yml
├── .dockerignore
├── test_images/           # 示例图片
└── README.md（已迁移至 docs/technical/paddleocr-service.md）
```

相关链接：
- [PaddleOCR 官方仓库](https://github.com/PaddlePaddle/PaddleOCR)
- [PP-StructureV3 论文](https://arxiv.org/abs/2303.05971)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
