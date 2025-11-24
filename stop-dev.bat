@echo off
chcp 65001 >nul
echo ========================================
echo   日新教学平台 - 停止开发环境
echo ========================================
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0stop-dev.ps1"

echo.
pause
