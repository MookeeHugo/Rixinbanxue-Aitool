# PowerShell 一键启动 PaddleOCR 服务（默认端口 8000）
# 需提前安装：
#   pip install "paddlepaddle==2.6.0" "paddleocr==2.7.0.3"
# 如需 GPU，请安装匹配显卡/驱动的 paddlepaddle-gpu 版本。

param(
    [int]$Port = 8000
)

Write-Host "启动 PaddleOCR 服务，端口: $Port"

# 2.7+ 版本要求子命令在前，这里用 ocr 子命令，并开启 serve 模式
# 使用 python -m 调用，避免 paddleocr 可执行文件不在 PATH 的问题
$cmd = "python -m paddleocr ocr --serve --port $Port --det db --rec crnn --use_angle_cls true --use_space_char true"

try {
    # 直接前台启动，方便查看日志
    iex $cmd
} catch {
    Write-Error "启动失败，请确认已安装 paddleocr，并检查 Python 环境。命令: $cmd"
    exit 1
}
