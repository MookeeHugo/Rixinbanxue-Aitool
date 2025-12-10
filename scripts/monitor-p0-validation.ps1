# P0 小流量验证实时监控脚本
# 监控关键日志指标

Write-Host "=== P0 验证实时监控 ===" -ForegroundColor Green
Write-Host "监控中... (按 Ctrl+C 停止)`n" -ForegroundColor Yellow

$watchedPaths = @(
    "logs\upload-*.log",
    "logs\gemini-*.log",
    "paddleocr-service\logs\out.log"
)

# 记录已显示的行数
$lastLines = @{}
foreach ($pattern in $watchedPaths) {
    $lastLines[$pattern] = 0
}

# 统计指标
$stats = @{
    total_uploads = 0
    截断填空题 = 0
    裁剪拒绝_尺寸过小 = 0
    裁剪拒绝_宽高比极端 = 0
    裁剪拒绝_几乎全图 = 0
    refined_bbox整数 = 0
    iou_fallback = 0
}

while ($true) {
    foreach ($pattern in $watchedPaths) {
        $files = Get-ChildItem $pattern -ErrorAction SilentlyContinue

        foreach ($file in $files) {
            if (-not $lastLines.ContainsKey($file.FullName)) {
                $lastLines[$file.FullName] = 0
            }

            $allLines = Get-Content $file.FullName -ErrorAction SilentlyContinue
            if ($allLines.Count -gt $lastLines[$file.FullName]) {
                $newLines = $allLines[$lastLines[$file.FullName]..($allLines.Count-1)]
                $lastLines[$file.FullName] = $allLines.Count

                foreach ($line in $newLines) {
                    # 检测关键事件
                    if ($line -match '\[gemini\] 截断填空题答案') {
                        Write-Host "✂️  $line" -ForegroundColor Cyan
                        $stats.截断填空题++
                    }
                    elseif ($line -match 'filtered by validation.*尺寸过小') {
                        Write-Host "📏 $line" -ForegroundColor Yellow
                        $stats.裁剪拒绝_尺寸过小++
                    }
                    elseif ($line -match 'filtered by validation.*宽高比极端') {
                        Write-Host "📐 $line" -ForegroundColor Yellow
                        $stats.裁剪拒绝_宽高比极端++
                    }
                    elseif ($line -match 'filtered by validation.*几乎覆盖全图') {
                        Write-Host "🖼️  $line" -ForegroundColor Yellow
                        $stats.裁剪拒绝_几乎全图++
                    }
                    elseif ($line -match 'refined_bbox.*\[\d+,\s*\d+,\s*\d+,\s*\d+\]') {
                        Write-Host "📍 $line" -ForegroundColor Green
                        $stats.refined_bbox整数++
                    }
                    elseif ($line -match 'status.*fallback') {
                        Write-Host "⚠️  IoU fallback: $line" -ForegroundColor Magenta
                        $stats.iou_fallback++
                    }
                    elseif ($line -match 'upload.*completed|success') {
                        Write-Host "✅ $line" -ForegroundColor Green
                        $stats.total_uploads++
                    }
                }
            }
        }
    }

    # 每 5 秒显示一次统计
    Start-Sleep -Seconds 2
    Clear-Host
    Write-Host "=== P0 验证实时统计 ===" -ForegroundColor Green
    Write-Host "时间: $(Get-Date -Format 'HH:mm:ss')`n" -ForegroundColor Gray

    Write-Host "📊 成功率指标:" -ForegroundColor White
    Write-Host "  总上传数: $($stats.total_uploads)" -ForegroundColor White

    Write-Host "`n✂️  JSON 清理:" -ForegroundColor Cyan
    Write-Host "  填空题截断: $($stats.截断填空题)" -ForegroundColor Cyan

    Write-Host "`n📏 裁剪验证拒绝:" -ForegroundColor Yellow
    Write-Host "  尺寸过小: $($stats.裁剪拒绝_尺寸过小)" -ForegroundColor Yellow
    Write-Host "  宽高比极端: $($stats.裁剪拒绝_宽高比极端)" -ForegroundColor Yellow
    Write-Host "  几乎全图: $($stats.裁剪拒绝_几乎全图)" -ForegroundColor Yellow

    Write-Host "`n📍 坐标格式:" -ForegroundColor Green
    Write-Host "  整数坐标: $($stats.refined_bbox整数)" -ForegroundColor Green

    Write-Host "`n⚠️  IoU:" -ForegroundColor Magenta
    Write-Host "  Fallback 次数: $($stats.iou_fallback)" -ForegroundColor Magenta

    if ($stats.total_uploads -gt 0) {
        $fallbackRate = ($stats.iou_fallback / $stats.total_uploads * 100)
        if ($fallbackRate -gt 30) {
            Write-Host "`n  ⚠️  Fallback 率: $([math]::Round($fallbackRate, 1))% (>30%, 需调整)" -ForegroundColor Red
        } else {
            Write-Host "`n  ✅ Fallback 率: $([math]::Round($fallbackRate, 1))% (<30%, 正常)" -ForegroundColor Green
        }
    }

    Write-Host "`n按 Ctrl+C 停止监控" -ForegroundColor Gray
}
