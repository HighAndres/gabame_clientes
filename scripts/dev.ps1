# Arranca el entorno local completo (Windows / PowerShell).
# Uso:  .\scripts\dev.ps1
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot

Write-Host "1/3  Levantando PostgreSQL y Mailhog..." -ForegroundColor Cyan
docker compose -f "$raiz\docker-compose.yml" up -d

Write-Host "2/3  Backend en http://localhost:8000/docs" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$raiz\backend'; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload"

Write-Host "3/3  Frontend en http://localhost:3000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$raiz\frontend'; npm run dev"

Write-Host "Mailhog: http://localhost:8025" -ForegroundColor Green
