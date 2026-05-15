#!/usr/bin/env tsx
/**
 * run-all.ts
 *
 * Orquestrador dos testes integrados.
 * Executa todas as suites sequencialmente e gera relatório consolidado.
 *
 * Uso:
 *   npm run run-all
 *   npm run run-all -- --skip-download   (reutiliza banco existente)
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import { INTEGRATION_DB_PATH, dbHasData, openIntegrationDb } from "./lib/db.js";
import { gerarRelatorioFinal, type SuiteResult } from "./lib/reporter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const skipDownload = process.argv.includes("--skip-download");

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  TESTES INTEGRADOS — vetrum-tuss-mcp                    ║");
  console.log(`║  ${new Date().toISOString()}                 ║`);
  console.log("╚══════════════════════════════════════════════════════════╝");

  // ─── Etapa 1: Download / verificação do banco ───
  if (!skipDownload) {
    console.log("\n[1/3] Verificando banco de dados real...");
    const db = openIntegrationDb();
    const temDados = dbHasData(db);
    db.close();

    if (!temDados) {
      console.log("  → Banco vazio. Iniciando download das bases ANS...");
      const { default: downloadMain } = await import("./01-download-bases.js");
    } else {
      console.log(`  → Banco existente com dados: ${INTEGRATION_DB_PATH}`);
      console.log("  → Use --skip-download para pular esta verificação.");
    }
  } else {
    console.log("\n[1/3] Download pulado (--skip-download).");
  }

  // Verificar se banco tem dados antes de continuar
  const db = openIntegrationDb();
  const temDados = dbHasData(db);
  db.close();

  if (!temDados) {
    console.error("\n❌ Banco sem dados. Execute 01-download-bases.ts primeiro.");
    console.error("   npm run download");
    process.exit(1);
  }

  // ─── Etapa 2: Executar todas as suites ───
  console.log("\n[2/3] Executando suites de teste...\n");

  const suites: SuiteResult[] = [];

  const arquivos = [
    "02-smoke-tools.js",
    "03-buscar-codigo.js",
    "04-buscar-descricao.js",
    "05-validar-cobertura.js",
    // "06-cbhpm.js" removido em 2026-05-15 — CBHPM fora de escopo permanente (PI da AMB)
    "07-categorias.js",
    "08-cobertura-obrigatoria.js",
    "09-status.js",
    "10-simul-faturista.js",
    "11-simul-auditor.js",
    "12-simul-dev.js",
    "13-performance.js",
  ];

  for (const arquivo of arquivos) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`▶  ${arquivo}`);
    try {
      const modUrl = pathToFileURL(path.join(__dirname, arquivo)).href;
      const mod = await import(modUrl);
      if (typeof mod.run === "function") {
        const resultado = await mod.run() as SuiteResult;
        suites.push(resultado);
      }
    } catch (err) {
      console.error(`  ❌ Erro ao executar ${arquivo}:`, err instanceof Error ? err.message : err);
    }
  }

  // ─── Etapa 3: Relatório final ───
  console.log("\n\n[3/3] Gerando relatório final...");
  gerarRelatorioFinal(suites);

  const falhouGlobal = suites.reduce((s, r) => s + r.falhou, 0);
  process.exit(falhouGlobal > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Erro fatal no orquestrador:", err);
  process.exit(1);
});
