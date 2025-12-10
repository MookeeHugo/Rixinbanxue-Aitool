#!/usr/bin/env python3
"""检查坐标计算问题"""

imageWidth = 1133
imageHeight = 1594
regions = [
    {'x': 813, 'y': 216, 'width': 320, 'height': 333},
    {'x': 754, 'y': 516, 'width': 361, 'height': 355},
    {'x': 754, 'y': 803, 'width': 361, 'height': 353},
    {'x': 813, 'y': 1166, 'width': 320, 'height': 378}
]

paddingPx = max(20, round(min(imageWidth, imageHeight) * 0.02))

print(f"图片尺寸: {imageWidth}x{imageHeight}")
print(f"Padding: {paddingPx}px\n")

for i, r in enumerate(regions, 1):
    print(f"Region {i}:")
    print(f"  原始: x={r['x']}, y={r['y']}, w={r['width']}, h={r['height']}")

    left = round(r['x']) - paddingPx
    top = round(r['y']) - paddingPx
    right = round(r['x'] + r['width']) + paddingPx
    bottom = round(r['y'] + r['height']) + paddingPx

    print(f"  +padding: left={left}, top={top}, right={right}, bottom={bottom}")

    # Clamp
    left = max(0, left)
    top = max(0, top)
    right = min(imageWidth, right)
    bottom = min(imageHeight, bottom)

    finalWidth = right - left
    finalHeight = bottom - top

    print(f"  clamped: left={left}, top={top}, right={right}, bottom={bottom}")
    print(f"  final: width={finalWidth}, height={finalHeight}")

    # 检查问题
    if right > imageWidth or bottom > imageHeight:
        print(f"  ❌ 超出边界！")
    if finalWidth <= 0 or finalHeight <= 0:
        print(f"  ❌ 无效尺寸！")

    # 检查 sharp 是否接受
    if left < 0 or top < 0 or finalWidth <= 0 or finalHeight <= 0:
        print(f"  ❌ Sharp 会拒绝！")

    print()
