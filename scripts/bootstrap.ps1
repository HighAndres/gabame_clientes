# Instalacion inicial del entorno local. Se corre una sola vez.
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot

foreach ($par in @(@(".env.example",".env"), @("backend\.env.example","backend\.env"), @("frontend\.env.local.example","frontend\.env.local"))) {
  $src = Join-Path $raiz $par[0]; $dst = Join-Path $raiz $par[1]
  if (-not (Test-Path $dst)) { Copy-Item $src $dst; Write-Host "creado $($par[1])" }
}

Write-Host "Backend: venv + dependencias" -ForegroundColor Cyan
Push-Location "$raiz\backend"
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\pip.exe install -e ".[dev]"
Pop-Location

Write-Host "Frontend: npm install" -ForegroundColor Cyan
Push-Location "$raiz\frontend"; npm install; Pop-Location

Write-Host "Listo. Ahora: docker compose up -d; luego alembic upgrade head" -ForegroundColor Green
