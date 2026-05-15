#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ensureDataset } from "./bootstrap.js";
import { getDb } from "./db/connection.js";
import { TussRepository } from "./repositories/tuss.repository.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const result = await ensureDataset();
  if (!result.ok) {
    process.stderr.write(`[bootstrap] FATAL: ${result.reason}\n`);
    process.exit(1);
  }
  process.stderr.write(`[bootstrap] OK (${result.action}, versão ${result.version})\n`);

  const db = getDb();
  const repo = new TussRepository(db);
  const server = createServer(repo);
  const transport = new StdioServerTransport();

  function shutdown(): void {
    db.close();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
