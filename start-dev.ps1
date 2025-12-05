Write-Host "========================================"
Write-Host "  Rixindemo Dev Environment Starter"
Write-Host "========================================"
Write-Host ""

# 始终在仓库根目录执行，避免被错误工作目录影响
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptDir) {
    Set-Location $scriptDir
}

# Step 1: Stop old Node processes
Write-Host "[1/5] Cleaning old Node.js processes..."
$nodes = Get-Process node -ErrorAction SilentlyContinue
if ($nodes) {
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  OK - Cleaned $($nodes.Count) processes"
}
else {
    Write-Host "  OK - No processes to clean"
}
Write-Host ""

# Step 2: Clean Next.js cache
Write-Host "[2/5] Cleaning Next.js cache..."
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "  OK - Cache cleaned"
}
else {
    Write-Host "  OK - No cache to clean"
}
Write-Host ""

# Step 3: Check Docker
Write-Host "[3/5] Checking Docker Desktop..."
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK - Docker is running"
    }
    else {
        Write-Host "  ERROR - Docker is not running"
        Write-Host "  Please start Docker Desktop first"
        pause
        exit 1
    }
}
catch {
    Write-Host "  ERROR - Docker is not running"
    pause
    exit 1
}
Write-Host ""

# Step 4: Start Supabase
Write-Host "[4/5] Starting Supabase..."
Write-Host "  (This may take 30-60 seconds...)"
npx supabase status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    npx supabase start
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK - Supabase started"
    }
    else {
        Write-Host "  ERROR - Failed to start Supabase"
        pause
        exit 1
    }
}
else {
    Write-Host "  OK - Supabase already running"
}
Write-Host ""

# Step 5: Set environment and start dev server
Write-Host "[5/5] Starting Next.js dev server..."
$env:NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

Write-Host ""
Write-Host "========================================"
Write-Host "  Environment Ready!"
Write-Host "========================================"
Write-Host ""
Write-Host "Server URL: http://localhost:3002"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server"
Write-Host ""

npm run dev:legacy
