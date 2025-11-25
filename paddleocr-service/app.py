"""
PaddleOCR 布局分析服务 - FastAPI实现
提供HTTP API接口供Next.js调用
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ocr_analyzer import analyze_document_layout
import io
from PIL import Image
import logging
import time

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="PaddleOCR Layout Analysis Service",
    description="文档布局分析服务，使用PP-StructureV3识别图片中的文本和图片区域",
    version="1.0.0"
)

# CORS配置（仅允许Next.js开发环境）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        # 生产环境需要添加实际域名
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路径，返回服务信息"""
    return {
        "service": "PaddleOCR Layout Analysis Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "/health": "健康检查",
            "/api/analyze-layout": "POST 分析图片布局"
        }
    }


@app.get("/health")
async def health_check():
    """
    健康检查接口
    用于Docker健康检查和监控
    """
    return {
        "status": "ok",
        "service": "paddleocr-layout-analysis",
        "timestamp": time.time()
    }


@app.post("/api/analyze-layout")
async def analyze_layout(file: UploadFile = File(...)):
    """
    分析图片布局，返回文本块和图片块的坐标

    请求:
        file: 上传的图片文件（支持 PNG, JPG, JPEG）

    返回格式:
    {
      "success": true,
      "data": {
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
      },
      "processing_time": 2.5
    }

    错误返回:
    {
      "success": false,
      "error": "错误信息"
    }
    """
    start_time = time.time()
    logger.info(f"📥 收到布局分析请求: {file.filename}")

    try:
        # 验证文件类型
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型: {file.content_type}，仅支持图片文件"
            )

        # 读取图片数据
        contents = await file.read()
        logger.info(f"📷 图片大小: {len(contents)} bytes ({len(contents) / 1024:.1f} KB)")

        # 转换为PIL Image
        try:
            image = Image.open(io.BytesIO(contents))
            # 转换为RGB（处理RGBA等格式）
            if image.mode != 'RGB':
                image = image.convert('RGB')
            logger.info(f"   图片尺寸: {image.size}, 模式: {image.mode}")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"图片格式错误: {str(e)}"
            )

        # 调用OCR分析
        logger.info("🔍 开始布局分析...")
        result = analyze_document_layout(image)

        processing_time = time.time() - start_time
        logger.info(f"✅ 布局分析完成，耗时: {processing_time:.2f}s")
        logger.info(f"   识别区块: {len(result['blocks'])} 个")

        # 统计各类型区块
        type_counts = {}
        for block in result['blocks']:
            btype = block['type']
            type_counts[btype] = type_counts.get(btype, 0) + 1
        logger.info(f"   区块统计: {type_counts}")

        return JSONResponse(content={
            "success": True,
            "data": result,
            "processing_time": round(processing_time, 2),
            "stats": type_counts
        })

    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"❌ 布局分析失败: {e}")
        logger.error(f"   耗时: {processing_time:.2f}s")

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "processing_time": round(processing_time, 2)
            }
        )


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"❌ 未捕获的异常: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "服务器内部错误",
            "detail": str(exc)
        }
    )


if __name__ == "__main__":
    import uvicorn

    logger.info("=" * 60)
    logger.info("🚀 启动 PaddleOCR 布局分析服务")
    logger.info("=" * 60)
    logger.info("   端口: 8000")
    logger.info("   健康检查: http://localhost:8000/health")
    logger.info("   API接口: http://localhost:8000/api/analyze-layout")
    logger.info("=" * 60)

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开发环境自动重载
        log_level="info"
    )
