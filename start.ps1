# LegacyLock Platform Launch Script
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Legacy Lock Platform (Production Build)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/2] Launching NestJS Backend on http://localhost:3000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; node dist/main"

Write-Host "[2/2] Launching Frontend Web Server on http://localhost:5500 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\DOC-20260830-WA0017'; python -m http.server 5500"

Start-Sleep -Seconds 3
Write-Host "Opening LegacyLock in default browser..." -ForegroundColor Green
Start-Process "http://localhost:5500/legacylock_landing_page.html"

Write-Host "LegacyLock platform is active and ready for evaluation!" -ForegroundColor Green
