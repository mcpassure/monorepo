# run_docker.ps1 — Constrói e executa os testes integrados em Docker (Windows)
#
# Uso: .\08_testes_integrados\binarios\scripts\run_docker.ps1
#
# Requer: Docker Desktop para Windows em execução

$ErrorActionPreference = "Stop"

$root = Join-Path $PSScriptRoot "../../.."
Set-Location $root

$IMAGE = "mcp-cnes-inttest"

Write-Host "MCP CNES - Testes Integrados com blast real" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Construindo imagem Docker (blast sera compilado do fonte)..." -ForegroundColor Yellow
docker build -f Dockerfile.inttest -t $IMAGE .

Write-Host ""
Write-Host "Executando testes integrados..." -ForegroundColor Yellow
Write-Host ""
docker run --rm -e CI=true $IMAGE
