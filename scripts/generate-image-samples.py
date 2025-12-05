#!/usr/bin/env python
"""
批量扫描测试图片并更新 tests/image-samples.json。
默认读取题目示例路径，可通过 --pattern 自定义匹配规则。
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List

from PIL import Image


DEFAULT_PATTERN = "中考专题讲练-金思维数学-*.jpg"
REPO_ROOT = Path(__file__).resolve().parents[1]
SAMPLE_ROOT = REPO_ROOT / "legacy/shijuanceshi"
OUTPUT_PATH = REPO_ROOT / "tests" / "image-samples.json"


def scan_images(pattern: str) -> List[dict]:
    records: List[dict] = []
    for path in sorted(SAMPLE_ROOT.glob(pattern)):
        if not path.is_file():
            continue
        with Image.open(path) as img:
            width, height = img.size

        records.append(
            {
                "id": path.stem,
                "file_name": path.name,
                "relative_path": str(path.relative_to(REPO_ROOT)).replace("\\", "/"),
                "resolution": f"{width}x{height}",
                "width": width,
                "height": height,
                "manual_label": "待补充",
                "qa_notes": "",
                "last_verified": None,
            }
        )
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="生成 image-samples.json")
    parser.add_argument(
        "--pattern",
        default=DEFAULT_PATTERN,
        help="glob 模式（默认：%(default)s）",
    )
    args = parser.parse_args()

    records = scan_images(args.pattern)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"写入 {OUTPUT_PATH}，共 {len(records)} 条记录")


if __name__ == "__main__":
    main()
