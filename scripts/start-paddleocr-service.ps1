# PowerShell 一键启动 paddleocr-service（FastAPI + uvicorn，默认端口 8000）
# 需已安装 Python 且满足 paddleocr-service/requirements.txt

param(
    [int]$Port = 8000
)

Set-Location "$PSScriptRoot/../paddleocr-service"

Write-Host "安装/校验依赖（paddleocr-service/requirements.txt）..."
pip install -r requirements.txt

Write-Host "启动 paddleocr-service，端口: $Port"
try {
    python -m uvicorn app:app --host 0.0.0.0 --port $Port
} catch {
    Write-Error "启动失败，请检查 Python/依赖/端口占用。"
    exit 1
}
