#!/bin/sh
# run_docker.sh — Constrói e executa os testes integrados em Docker
#
# Uso: sh 08_testes_integrados/binarios/scripts/run_docker.sh
#
# O que este script faz:
#   1. Constrói a imagem Docker com blast compilado do fonte
#   2. Tenta baixar um DBC real do DATASUS durante o build
#   3. Executa npm run test:integration com blast real no PATH
#
# Saída esperada: 101/101 PASS (com DBC fixture disponível: blast usa DBC real em FTP07)

set -e

cd "$(dirname "$0")/../../.."

IMAGE="mcp-cnes-inttest"

echo "🐳 MCP CNES — Testes Integrados com blast real"
echo "================================================"
echo ""
echo "📦 Construindo imagem Docker (blast será compilado do fonte)..."
docker build -f Dockerfile.inttest -t "$IMAGE" .

echo ""
echo "🧪 Executando testes integrados..."
echo ""
docker run --rm -e CI=true "$IMAGE"
