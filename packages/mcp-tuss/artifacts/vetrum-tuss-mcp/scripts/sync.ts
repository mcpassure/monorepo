#!/usr/bin/env node
import { openDb } from "../src/db/client.js";
import { applySchema } from "../src/db/schema.js";
import { checkAndSync } from "../src/sync/scheduler.js";
import { ingestAll } from "../src/sync/ingestor.js";

async function main() {
  const force = process.argv.includes("--force");

  console.log("[sync] Iniciando sincronização do banco TUSS...");
  const db = openDb();
  applySchema(db);

  if (force) {
    console.log("[sync] Modo --force: sincronização completa forçada.");
    await ingestAll(db);
  } else {
    await checkAndSync(db);
  }

  console.log("[sync] Concluído.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[sync] Erro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
