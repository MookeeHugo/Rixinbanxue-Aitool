@echo off
chcp 65001 >nul
echo ========================================
echo   日新教学平台 - 开发环境启动脚本
echo ========================================
echo.

echo 正在启动 PowerShell 脚本...
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo 启动失败，请检查错误信息
    pause
)
