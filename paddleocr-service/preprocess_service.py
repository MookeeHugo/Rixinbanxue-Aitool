"""
RixinMath 图像预处理 / 坐标精修 / 锚点校验服务

功能：
- /api/preprocess/upload  ：多文件上传 -> 生成 original/grid/binary
- /api/refine-bbox       ：OpenCV 轮廓修正（带 run_in_executor）
- /api/anchor-verify     ：锚点 OCR inclusion-rejection
"""

from __future__ import annotations

import io
import os
from dataclasses import dataclass
from pathlib import Path
import time
from typing import List, Optional, Tuple

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
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
            draw.text((x + 4, 4), f"{int(i / cols * 1000)}", fill=(255, 0, 0))

    for j in range(rows + 1):
        y = round(j * step_y)
        draw.line([(0, y), (meta.width, y)], fill=(255, 0, 0, 128), width=1)
        if j % 2 == 0:
            draw.text((4, y + 4), f"{int(j / rows * 1000)}", fill=(255, 0, 0))

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def preprocess_binary_adaptive(buffer: bytes, strategy: str = "otsu") -> bytes:
    """支持多策略二值化，默认 Otsu。"""
    image = Image.open(io.BytesIO(buffer)).convert("L")
    np_img = np.array(image)

    if strategy == "adaptive_gaussian":
        binary = cv2.adaptiveThreshold(
            np_img,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            15,
            8,
        )
    elif strategy == "hybrid":
        background = cv2.GaussianBlur(np_img, (51, 51), 0)
        diff = cv2.subtract(background, np_img)
        norm = cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX)
        _, binary = cv2.threshold(norm, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    else:
        # 默认 Otsu
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
    strategy = os.getenv("BINARY_STRATEGY", "otsu").strip().lower()
    binary_bytes = await run_in_thread(preprocess_binary_adaptive, content, strategy)

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


def _parse_kernel() -> Tuple[int, int]:
    raw = os.getenv("OPENCV_KERNEL_SIZE", "15,10")
    try:
        parts = [int(x) for x in raw.split(",")]
        if len(parts) >= 2 and parts[0] > 0 and parts[1] > 0:
            return parts[0], parts[1]
    except Exception:
        pass
    return 15, 10


def _get_iterations() -> int:
    try:
        value = int(os.getenv("OPENCV_KERNEL_ITERATIONS", "1"))
        return max(1, value)
    except Exception:
        return 1


def calculate_iou(box1: List[float], box2: List[float], img_w: int, img_h: int) -> float:
    """计算两个归一化（0-1000）框的 IoU。"""
    def _to_px(box: List[float]) -> Tuple[int, int, int, int]:
        y_min = int(box[0] / 1000 * img_h)
        x_min = int(box[1] / 1000 * img_w)
        y_max = int(box[2] / 1000 * img_h)
        x_max = int(box[3] / 1000 * img_w)
        return x_min, y_min, x_max, y_max

    x1_min, y1_min, x1_max, y1_max = _to_px(box1)
    x2_min, y2_min, x2_max, y2_max = _to_px(box2)

    inter_xmin = max(x1_min, x2_min)
    inter_ymin = max(y1_min, y2_min)
    inter_xmax = min(x1_max, x2_max)
    inter_ymax = min(y1_max, y2_max)

    inter_area = max(0, inter_xmax - inter_xmin) * max(0, inter_ymax - inter_ymin)

    area1 = max(0, x1_max - x1_min) * max(0, y1_max - y1_min)
    area2 = max(0, x2_max - x2_min) * max(0, y2_max - y2_min)
    union_area = area1 + area2 - inter_area

    return float(inter_area) / max(union_area, 1)


def calculate_refine_quality_score(
    rough_bbox: List[float],
    refined_bbox: List[float],
    roi: np.ndarray,
    img_w: int,
    img_h: int,
) -> dict:
    """计算精修质量评分，仅用于日志/监控。"""
    iou = calculate_iou(rough_bbox, refined_bbox, img_w, img_h)

    rough_area = ((rough_bbox[2] - rough_bbox[0]) * img_h / 1000) * (
        (rough_bbox[3] - rough_bbox[1]) * img_w / 1000
    )
    refined_area = ((refined_bbox[2] - refined_bbox[0]) * img_h / 1000) * (
        (refined_bbox[3] - refined_bbox[1]) * img_w / 1000
    )
    area_change = (refined_area - rough_area) / max(rough_area, 1)

    edges = cv2.Canny(roi, 50, 150)
    edge_ratio = float(np.sum(edges > 0)) / max(edges.size, 1)

    confidence = (
        iou * 0.5 + min(1.0, max(0, 1 - abs(area_change))) * 0.3 + edge_ratio * 0.2
    )

    return {
        "iou": round(iou, 3),
        "area_change": round(area_change, 3),
        "edge_density": round(edge_ratio, 3),
        "confidence": round(confidence, 3),
    }


@app.post("/api/refine-bbox")
async def refine_bbox(
    rough_bbox: List[float] = Query(...),
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
    top = max(0, int((ymin / 1000) * image_height - pad_y))
    bottom = min(image_height, int((ymax / 1000) * image_height + pad_y))
    left = max(0, int((xmin / 1000) * image_width - pad_x))
    right = min(image_width, int((xmax / 1000) * image_width + pad_x))
    roi = binary_img[top:bottom, left:right]

    def _process_roi():
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, _parse_kernel())
        dilated = cv2.dilate(roi, kernel, iterations=_get_iterations())
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
            (top + y) / image_height * 1000,
            (left + x) / image_width * 1000,
            (top + y + h) / image_height * 1000,
            (left + x + w) / image_width * 1000,
        )
        return [int(round(v)) for v in refined]

    refined = await run_in_thread(_process_roi)
    if refined is None:
        return {"status": "fallback", "refined_bbox": rough_bbox}
    iou_threshold = float(os.getenv("OPENCV_IOU_THRESHOLD", "0.3"))
    iou_score = calculate_iou(rough_bbox, refined, image_width, image_height)

    quality_enabled = os.getenv("ENABLE_QUALITY_SCORE", "false").lower() == "true"
    quality = None
    if quality_enabled:
        quality = calculate_refine_quality_score(
            rough_bbox, refined, roi, image_width, image_height
        )

    if iou_score < iou_threshold:
        return {
            "status": "fallback",
            "refined_bbox": rough_bbox,
            "reason": f"IoU too low: {iou_score:.3f}",
            **({"quality": quality} if quality else {}),
        }

    return {
        "status": "ok",
        "refined_bbox": refined,
        "iou": round(iou_score, 3),
        **({"quality": quality} if quality else {}),
    }


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
