Write-Host "=== Check System Environment Variables ===" -ForegroundColor Cyan
Write-Host ""

$url = [System.Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL", "User")
$key = [System.Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY", "User")

Write-Host "User Environment Variables:" -ForegroundColor Yellow
Write-Host "  NEXT_PUBLIC_SUPABASE_URL: " -NoNewline
if ([string]::IsNullOrEmpty($url)) {
    Write-Host "[NOT SET]" -ForegroundColor Green
} else {
    Write-Host $url -ForegroundColor Red
}

Write-Host "  NEXT_PUBLIC_SUPABASE_ANON_KEY: " -NoNewline
if ([string]::IsNullOrEmpty($key)) {
    Write-Host "[NOT SET]" -ForegroundColor Green
} else {
    Write-Host $key.Substring(0, [Math]::Min(30, $key.Length)) -ForegroundColor Red
}

Write-Host ""

$sysUrl = [System.Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL", "Machine")
$sysKey = [System.Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Machine")

Write-Host "System Environment Variables:" -ForegroundColor Yellow
Write-Host "  NEXT_PUBLIC_SUPABASE_URL: " -NoNewline
if ([string]::IsNullOrEmpty($sysUrl)) {
    Write-Host "[NOT SET]" -ForegroundColor Green
} else {
    Write-Host $sysUrl -ForegroundColor Red
}

Write-Host "  NEXT_PUBLIC_SUPABASE_ANON_KEY: " -NoNewline
if ([string]::IsNullOrEmpty($sysKey)) {
    Write-Host "[NOT SET]" -ForegroundColor Green
} else {
    Write-Host $sysKey.Substring(0, [Math]::Min(30, $sysKey.Length)) -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Result ===" -ForegroundColor Cyan
if ([string]::IsNullOrEmpty($url) -and [string]::IsNullOrEmpty($key) -and [string]::IsNullOrEmpty($sysUrl) -and [string]::IsNullOrEmpty($sysKey)) {
    Write-Host "[OK] Plan B completed successfully! All environment variables cleared." -ForegroundColor Green
} else {
    Write-Host "[WARNING] Plan B not completed. Please remove the variables shown in RED above." -ForegroundColor Red
}
