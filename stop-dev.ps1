# ===================================
# 日新教学平台 - 停止开发环境
# ===================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  日新教学平台 - 停止开发环境" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# 步骤 1: 停止 Node.js 进程
Write-Host "[1/2] 停止 Node.js 开发服务器..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  发现 $($nodeProcesses.Count) 个 Node.js 进程，正在停止..." -ForegroundColor Yellow
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "  ✓ Node.js 进程已停止" -ForegroundColor Green
} else {
    Write-Host "  ✓ 没有运行中的 Node.js 进程" -ForegroundColor Green
}
Write-Host ""

# 步骤 2: 停止 Supabase
Write-Host "[2/2] 停止本地 Supabase..." -ForegroundColor Yellow
$supabaseStatus = npx supabase status 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Supabase 正在运行，正在停止..." -ForegroundColor Yellow
    npx supabase stop
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Supabase 已停止" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Supabase 停止失败" -ForegroundColor Red
    }
} else {
    Write-Host "  ✓ Supabase 未在运行" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ 开发环境已停止" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
