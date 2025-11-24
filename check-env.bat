@echo off
echo === 检查系统环境变量 ===
echo.
echo NEXT_PUBLIC_SUPABASE_URL:
echo %NEXT_PUBLIC_SUPABASE_URL%
echo.
echo NEXT_PUBLIC_SUPABASE_ANON_KEY (前30字符):
echo %NEXT_PUBLIC_SUPABASE_ANON_KEY:~0,30%
echo.
if "%NEXT_PUBLIC_SUPABASE_URL%"=="" (
    echo [OK] NEXT_PUBLIC_SUPABASE_URL 未设置 - 方案B已完成
) else (
    echo [WARNING] NEXT_PUBLIC_SUPABASE_URL 仍然存在 - 方案B未完成
)
echo.
if "%NEXT_PUBLIC_SUPABASE_ANON_KEY%"=="" (
    echo [OK] NEXT_PUBLIC_SUPABASE_ANON_KEY 未设置 - 方案B已完成
) else (
    echo [WARNING] NEXT_PUBLIC_SUPABASE_ANON_KEY 仍然存在 - 方案B未完成
)
