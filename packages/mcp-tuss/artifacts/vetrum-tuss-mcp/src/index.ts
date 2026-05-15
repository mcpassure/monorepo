#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { openDb } from "./db/client.js";
import { applySchema } from "./db/schema.js";
import { isBankEmpty } from "./db/queries.js";
import { ingestAll } from "./sync/ingestor.js";
import { TussRepository } from "./domain/tuss-repository.js";
import { RolAnsRepository } from "./domain/rol-repository.js";
import { CbhpmRepository } from "./domain/cbhpm-repository.js";
import { TerminologiaRepository } from "./domain/repository.js";
import { createServer } from "./server.js";

async function main() {
  const db = openDb();
  applySchema(db);

  if (isBankEmpty(db)) {
    console.error("[mcpassure-mcp-tuss] Banco vazio. Iniciando sincronização inicial (pode levar alguns minutos)...");
    try {
      await ingestAll(db);
      console.error("[mcpassure-mcp-tuss] Sincronização inicial concluída.");
    } catch (err) {
      console.error("[mcpassure-mcp-tuss] AVISO: Sincronização inicial falhou:", err instanceof Error ? err.message : err);
      console.error("[mcpassure-mcp-tuss] O servidor iniciará sem dados. Execute `npx @mcpassure/mcp-tuss sync` para tentar novamente.");
    }
  }

  const tussRepo = new TussRepository(db);
  const rolRepo = new RolAnsRepository(db);
  const cbhpmRepo = new CbhpmRepository(db);
  const repo = new TerminologiaRepository(tussRepo, rolRepo, cbhpmRepo);

  const server = createServer(repo);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[mcpassure-mcp-tuss] Erro fatal:", err);
  process.exit(1);
});
