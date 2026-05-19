# Backend ni mahalliy ishga tushirish (port 20150)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\backend

if (-not (Test-Path .\venv)) {
    Write-Host "Virtual environment yaratilmoqda..." -ForegroundColor Cyan
    python -m venv venv
}

.\venv\Scripts\Activate.ps1

Write-Host "Paketlar tekshirilmoqda..." -ForegroundColor Cyan
pip install -q -r requirements.txt
pip install -q "bcrypt==4.0.1"

if (-not (Test-Path .\.env)) {
    Write-Host ".env fayl topilmadi. .env.example dan nusxa olinmoqda..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "MUHIM: .env faylida TG_API_ID va TG_API_HASH ni to'ldiring!" -ForegroundColor Red
    notepad .env
}

Write-Host "Backend ishga tushmoqda: http://localhost:20150" -ForegroundColor Green
python run.py
