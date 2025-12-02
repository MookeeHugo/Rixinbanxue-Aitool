"""
RixinMath 图像预处理 / 坐标精修 / 锚点校验服务

功能：
- /api/preprocess/upload  ：多文件上传 -> 生成 original/grid/binary
- /api/refine-bbox       ：OpenCV 轮廓修正（带 run_in_executor）
- /api/anchor-verify     ：锚点 OCR inclusion-rejection
"""

from __future__ import annotations

import io
import math
from dataclasses import dataclass
from pathlib import Path
import time
from typing import List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from PIL import Image, ImageDraw

app = FastAPI(title="RixinMath Pipeline Service", version="0.1.0")
ROOT_DIR = Path(__file__).resolve().parents[1]
STORAGE_DIR = ROOT_DIR / "tmp" / "image-pipeline"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
SERVICE_START_TIME = time.time()

try:
    from paddle.base import libpaddle as _libpaddle  # type: ignore[import-not-found]
except Exception:  # pragma: no cover
    _libpaddle = None

try:
    from paddleocr import PaddleOCR  # type: ignore[import-not-found]
except Exception as import_error:  # pragma: no cover
    PaddleOCR = None  # type: ignore[assignment]
    OCR_IMPORT_ERROR = str(import_error)
else:
    OCR_IMPORT_ERROR = None

if _libpaddle and hasattr(_libpaddle, "AnalysisConfig") and not hasattr(
    _libpaddle.AnalysisConfig, "set_optimization_level"
):
    def _noop_set_opt(self, level):
        return None
    _libpaddle.AnalysisConfig.set_optimization_level = _noop_set_opt  # type: ignore[attr-defined]

_OCR_INSTANCE = None


def get_ocr_client():
    global _OCR_INSTANCE
    if PaddleOCR is None:
        raise RuntimeError(f"PaddleOCR 未安装: {OCR_IMPORT_ERROR}")
    if _OCR_INSTANCE is None:
        _OCR_INSTANCE = PaddleOCR(use_angle_cls=True, lang="ch")
    return _OCR_INSTANCE


@dataclass
class ImageMeta:
    width: int
    height: int


def save_buffer_to_png(buffer: bytes, path: Path) -> ImageMeta:
    image = Image.open(io.BytesIO(buffer)).convert("RGB")
    image.save(path, format="PNG")
    return ImageMeta(width=image.width, height=image.height)


def add_grid_overlay(buffer: bytes, meta: ImageMeta) -> bytes:
    image = Image.open(io.BytesIO(buffer)).convert("RGB")
    draw = ImageDraw.Draw(image)
    rows, cols = 20, 20
    step_x = meta.width / cols
    step_y = meta.height / rows

    for i in range(cols + 1):
        x = round(i * step_x)
        draw.line([(x, 0), (x, meta.height)], fill=(255, 0, 0, 128), width=1)
        if i % 2 == 0:
            draw.text((x + 4, 4), f"{int(i / cols * 100)}", fill=(255, 0, 0))

    for j in range(rows + 1):
        y = round(j * step_y)
        draw.line([(0, y), (meta.width, y)], fill=(255, 0, 0, 128), width=1)
        if j % 2 == 0:
            draw.text((4, y + 4), f"{int(j / rows * 100)}", fill=(255, 0, 0))

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def preprocess_binary(buffer: bytes) -> bytes:
    image = Image.open(io.BytesIO(buffer)).convert("L")
    np_img = np.array(image)
    _, binary = cv2.threshold(np_img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    _, encoded = cv2.imencode(".png", binary)
    return encoded.tobytes()


async def run_in_thread(func, *args):
    return await run_in_threadpool(lambda: func(*args))


@app.post("/api/preprocess/upload")
async def upload_image(task_id: str = Form(...), file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="空文件")

    original_path = STORAGE_DIR / f"{task_id}-original.png"
    grid_path = STORAGE_DIR / f"{task_id}-grid.png"
    binary_path = STORAGE_DIR / f"{task_id}-binary.png"

    meta = await run_in_thread(save_buffer_to_png, content, original_path)
    grid_bytes = await run_in_thread(add_grid_overlay, content, meta)
    binary_bytes = await run_in_thread(preprocess_binary, content)

    grid_path.write_bytes(grid_bytes)
    binary_path.write_bytes(binary_bytes)

    return {
        "task_id": task_id,
        "meta": meta.__dict__,
        "artifacts": {
            "original_path": str(original_path),
            "grid_path": str(grid_path),
            "binary_path": str(binary_path)
        }
    }


def is_near_blank(image: np.ndarray) -> bool:
    ratio = float(np.sum(image == 255)) / image.size
    return ratio < 0.02 or ratio > 0.98


@app.post("/api/refine-bbox")
async def refine_bbox(
    rough_bbox: List[float],
    binary_path: str = Form(...),
    image_width: int = Form(...),
    image_height: int = Form(...)
):
    if len(rough_bbox) != 4:
        raise HTTPException(status_code=400, detail="rough_bbox 长度必须为 4")

    binary_img = cv2.imread(binary_path, cv2.IMREAD_GRAYSCALE)
    if binary_img is None:
        raise HTTPException(status_code=400, detail="无法读取二值图像")

    if is_near_blank(binary_img):
        return {"status": "fallback", "refined_bbox": rough_bbox}

    ymin, xmin, ymax, xmax = rough_bbox
    pad_y = image_height * 0.02
    pad_x = image_width * 0.02
    top = max(0, int((ymin / 100) * image_height - pad_y))
    bottom = min(image_height, int((ymax / 100) * image_height + pad_y))
    left = max(0, int((xmin / 100) * image_width - pad_x))
    right = min(image_width, int((xmax / 100) * image_width + pad_x))
    roi = binary_img[top:bottom, left:right]

    def _process_roi():
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        dilated = cv2.dilate(roi, kernel, iterations=1)
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        filtered = [
            cnt for cnt in contours
            if not np.any((cnt[:, 0, 0] == 0) | (cnt[:, 0, 0] == roi.shape[1] - 1) |
                          (cnt[:, 0, 1] == 0) | (cnt[:, 0, 1] == roi.shape[0] - 1))
        ]
        if not filtered:
            filtered = contours
        if not filtered:
            return None
        areas = [cv2.contourArea(cnt) for cnt in filtered]
        max_idx = int(np.argmax(areas))
        x, y, w, h = cv2.boundingRect(filtered[max_idx])
        refined = (
            (top + y) / image_height * 100,
            (left + x) / image_width * 100,
            (top + y + h) / image_height * 100,
            (left + x + w) / image_width * 100,
        )
        return [round(float(v), 1) for v in refined]

    refined = await run_in_thread(_process_roi)
    if refined is None:
        return {"status": "fallback", "refined_bbox": rough_bbox}
    return {"status": "ok", "refined_bbox": refined}


def fuzzy_match(anchor: str, text: str) -> float:
    if not anchor or not text:
        return 0.0
    anchor_set = set(anchor)
    text_set = set(text)
    return len(anchor_set & text_set) / max(len(anchor_set), 1)


@app.post("/api/anchor-verify")
async def anchor_verify(
    anchor_text_prev: str = Form(...),
    image_path: str = Form(...),
    strip_ratio: float = Form(0.12)
):
    image = Image.open(image_path).convert("RGB")
    height = image.height
    strip_height = int(height * strip_ratio)
    top_strip = image.crop((0, 0, image.width, strip_height))

    try:
        ocr_client = get_ocr_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    def _ocr_top():
        buffer = io.BytesIO()
        top_strip.save(buffer, format="PNG")
        result = ocr_client.ocr(np.array(top_strip), cls=True)
        texts = [line[1][0] for line in result] if result else []
        combined = "".join(texts)
        confidence = fuzzy_match(anchor_text_prev, combined)
        text_bottom = max((line[0][2][1] for line in result), default=strip_height)
        return combined, confidence, text_bottom

    combined_text, confidence, text_bottom = await run_in_thread(_ocr_top)

    if confidence > 0.8:
        new_top = min(height, max(strip_height, text_bottom + 5))
        return {
            "matched": True,
            "confidence": confidence,
            "trim_start": int(new_top),
            "ocr_text": combined_text
        }

    return {"matched": False, "confidence": confidence, "ocr_text": combined_text}


@app.get("/health")
async def health():
    """
    Ready/Liveness probe that is safe for cron or PM2 checks.
    """
    return {
        "status": "ok",
        "ocr_loaded": _OCR_INSTANCE is not None,
        "ocr_import_error": OCR_IMPORT_ERROR,
        "storage_ready": STORAGE_DIR.exists(),
        "artifacts_dir": str(STORAGE_DIR),
        "uptime_seconds": round(time.time() - SERVICE_START_TIME, 1),
    }
