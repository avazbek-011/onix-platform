# Frontend ni mahalliy ishga tushirish (port 20151)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\frontend

if (-not (Test-Path .\node_modules)) {
    Write-Host "npm paketlar o'rnatilmoqda..." -ForegroundColor Cyan
    npm install
}

if (-not (Test-Path .\.env.local)) {
    Copy-Item .env.local.example .env.local
}

Write-Host "Frontend ishga tushmoqda: http://localhost:20151" -ForegroundColor Green
npm run dev
