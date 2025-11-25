# PaddleOCR 布局分析服务

基于 PaddleOCR PP-StructureV3 的文档布局分析服务，用于识别图片中的文本和图片区域。

## 功能

- ✅ 文档布局分析（文本、图片、表格识别）
- ✅ 精确的像素级坐标输出
- ✅ FastAPI RESTful API
- ✅ Docker容器化部署
- ✅ 健康检查和监控

## 快速开始

### 方式1：Docker运行（推荐）

```bash
# 构建镜像
docker build -t paddleocr-service .

# 运行容器
docker run -d \
  --name paddleocr \
  -p 8000:8000 \
  --restart=always \
  paddleocr-service

# 或使用 docker-compose
docker-compose up -d
```

### 方式2：本地Python运行

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py
```

服务将在 `http://localhost:8000` 启动。

## API接口

### 1. 健康检查

```bash
GET /health
```

**响应**:
```json
{
  "status": "ok",
  "service": "paddleocr-layout-analysis",
  "timestamp": 1732531200.0
}
```

### 2. 布局分析

```bash
POST /api/analyze-layout
Content-Type: multipart/form-data
```

**请求参数**:
- `file`: 图片文件（支持 PNG, JPG, JPEG）

**响应**:
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

## 测试

### 使用curl测试

```bash
# 健康检查
curl http://localhost:8000/health

# 分析图片
curl -X POST \
  http://localhost:8000/api/analyze-layout \
  -F "file=@test.png" \
  | jq .
```

### 使用Python测试

```python
import requests

# 上传图片
with open('test.png', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/analyze-layout',
        files={'file': f}
    )

result = response.json()
print(f"识别到 {len(result['data']['blocks'])} 个区块")
```

## 配置

### 环境变量

- `LOG_LEVEL`: 日志级别（默认：info）
- `PYTHONUNBUFFERED`: Python输出缓冲（默认：1，无缓冲）

### 性能优化

#### GPU加速（可选）

修改 `ocr_analyzer.py`:

```python
structure_engine = PPStructure(
    use_gpu=True,  # 开启GPU
    gpu_mem=8000   # 分配8GB显存
)
```

需要安装GPU版本的PaddlePaddle:

```bash
pip install paddlepaddle-gpu
```

## 故障排查

### 1. 首次启动慢

首次运行会自动下载模型文件（约300MB），请耐心等待。

### 2. 内存不足

PaddleOCR需要较多内存，建议至少2GB可用内存。

### 3. 识别准确率低

- 确保图片清晰度足够（推荐 >600DPI）
- 调整图片方向（正向为佳）
- 尝试预处理（去噪、二值化等）

## 项目结构

```
paddleocr-service/
├── app.py                  # FastAPI服务
├── ocr_analyzer.py         # OCR核心逻辑
├── requirements.txt        # Python依赖
├── Dockerfile              # Docker镜像配置
├── docker-compose.yml      # Docker Compose配置
├── .dockerignore           # Docker忽略文件
├── README.md               # 本文档
└── test_images/            # 测试图片目录
```

## 许可证

本项目遵循 PaddleOCR 的 Apache-2.0 许可证。

## 相关链接

- [PaddleOCR官方文档](https://github.com/PaddlePaddle/PaddleOCR)
- [PP-StructureV3论文](https://arxiv.org/abs/2303.05971)
- [FastAPI文档](https://fastapi.tiangolo.com/)
