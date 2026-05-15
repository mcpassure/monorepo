#!/usr/bin/env tsx
// Orquestrador principal dos testes de integração MCP CNES.
// Uso: npx tsx integration-tests/bin/run-all.ts [--skip-seed] [--offline] [--no-ftp]
//
//   --skip-seed  Reutiliza banco existente em results/cnes-test.db (sem re-seed)
//   --offline    Pula testes de rede (FTP)
//   --no-ftp     Pula apenas testes FTP
//
// v1.1.1: suite t03 renomeada de "fallback" para "cache-vazio" — fallback REST
// online foi removido. Suite agora valida comportamento correto quando cache
// SQLite está vazio (mensagens claras orientando sync).

import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { applySchema } from "../../src/db/schema.js";
import { Reporter } from "./helpers/reporter.js";
import { seedDatabase } from "./seed/seed-api.js";
import { runQueryTests } from "./tests/t01-queries.js";
import { runToolTests } from "./tests/t02-tools.js";
import { runCacheVazioTests } from "./tests/t03-cache-vazio.js";
import { runFtpTests } from "./tests/t04-ftp.js";
import { runScenarioTests } from "./tests/t05-scenarios.js";
import { runMetaTests } from "./tests/t06-meta.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// ── Argumentos ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const skipSeed = args.includes("--skip-seed");
const offline = args.includes("--offline");
const noFtp = args.includes("--no-ftp") || offline;

// ── Diretórios ────────────────────────────────────────────────────────────────
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const resultsBase = join(ROOT, "integration-tests", "results");
const runDir = join(resultsBase, timestamp);
const dbPath = skipSeed
  ? join(resultsBase, "cnes-test.db")
  : join(runDir, "cnes-test.db");

mkdirSync(runDir, { recursive: true });

console.log("═".repeat(60));
console.log("  MCP CNES — Testes de Integração");
console.log(`  Data: ${new Date().toLocaleString("pt-BR")}`);
console.log(`  Banco: ${dbPath}`);
console.log(`  Resultados: ${runDir}`);
if (skipSeed) console.log("  Modo: --skip-seed (reutilizando banco existente)");
if (offline) console.log("  Modo: --offline (testes de rede pulados)");
if (noFtp && !offline) console.log("  Modo: --no-ftp (FTP pulado)");
console.log("═".repeat(60));

// ── Banco de dados ─────────────────────────────────────────────────────────────
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
applySchema(db);

// ── Seed ───────────────────────────────────────────────────────────────────────
if (!skipSeed) {
  await seedDatabase(db);
} else {
  if (!existsSync(dbPath)) {
    console.error(`\n❌ --skip-seed ativo mas ${dbPath} não existe. Remova a flag.`);
    process.exit(1);
  }
  console.log("\n⏩ Pulando seed — reutilizando banco existente");
}

// ── Runner ─────────────────────────────────────────────────────────────────────
const reporter = new Reporter();

try {
  await runQueryTests(db, reporter);
} catch (err) {
  console.error(`\n❌ Erro fatal em t01-queries: ${err}`);
}

try {
  await runToolTests(db, reporter);
} catch (err) {
  console.error(`\n❌ Erro fatal em t02-tools: ${err}`);
}

// t03-cache-vazio NÃO precisa de rede — sempre executa (mesmo em --offline)
try {
  await runCacheVazioTests(reporter);
} catch (err) {
  console.error(`\n❌ Erro fatal em t03-cache-vazio: ${err}`);
}

if (!noFtp) {
  try {
    await runFtpTests(db, reporter);
  } catch (err) {
    console.error(`\n❌ Erro fatal em t04-ftp: ${err}`);
  }
} else {
  console.log("\n📡 Suite: FTP DATASUS [pulada — modo no-ftp]");
}

try {
  await runScenarioTests(db, reporter);
} catch (err) {
  console.error(`\n❌ Erro fatal em t05-scenarios: ${err}`);
}

try {
  await runMetaTests(db, reporter);
} catch (err) {
  console.error(`\n❌ Erro fatal em t06-meta: ${err}`);
}

// ── Relatório ──────────────────────────────────────────────────────────────────
reporter.printSummary();
reporter.write(runDir);

// Também escreve resultado no latest/ para acesso fácil
const latestDir = join(resultsBase, "latest");
mkdirSync(latestDir, { recursive: true });
reporter.write(latestDir);

// ── Saída ──────────────────────────────────────────────────────────────────────
console.log("\n📁 Arquivos gerados:");
console.log(`   ${join(runDir, "results.json")}`);
console.log(`   ${join(runDir, "summary.md")}`);
console.log(`   ${dbPath}`);
console.log(`   ${join(latestDir, "summary.md")} (latest)`);

db.close();
process.exit(reporter.hasFailed() ? 1 : 0);
