#!/usr/bin/env python3
"""测试 refine-bbox 端点"""

import requests
import json

base_url = "http://localhost:8000/api/refine-bbox"

# 测试数据 - rough_bbox 通过查询参数传递
rough_bbox = [200, 150, 400, 600]  # 0-1000 归一化坐标

# 构建查询参数
params = [('rough_bbox', str(v)) for v in rough_bbox]
url = base_url + '?' + '&'.join([f"{k}={v}" for k, v in params])

# Form 数据
form_data = {
    "binary_path": "D:\\rixinwork\\Rixindemo-codex-m1\\tmp\\image-pipeline\\test-phase1-001-binary.png",
    "image_width": 1133,
    "image_height": 1594
}

# 发送请求
try:
    print(f"URL: {url}")
    response = requests.post(url, data=form_data)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'response'):
        print(f"Response Text: {e.response.text}")
