# PaddleOCR 布局分析服务 - Docker镜像
# 基于 Python 3.10-slim 构建轻量级镜像

FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
# libgomp1: OpenMP运行时库（PaddlePaddle需要）
# libglib2.0-0, libsm6, libxext6, libxrender-dev: OpenCV依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
# --no-cache-dir: 不缓存pip包，减小镜像体积
RUN pip install --no-cache-dir -r requirements.txt

# 预下载PaddleOCR模型（避免首次运行时下载）
# 这会在构建镜像时下载模型，增加镜像体积但提升启动速度
RUN python -c "from paddleocr import PPStructure; PPStructure(show_log=False, lang='ch')" || true

# 复制应用代码
COPY app.py .
COPY ocr_analyzer.py .

# 创建测试图片目录
RUN mkdir -p test_images

# 暴露端口
EXPOSE 8000

# 健康检查
# 每30秒检查一次，超时10秒，连续失败3次认为不健康
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# 启动命令
# --host 0.0.0.0: 监听所有网络接口
# --port 8000: 监听端口
# --workers 1: 单进程（开发环境），生产环境可增加
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
