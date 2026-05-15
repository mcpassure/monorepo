#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ensureDataset } from "./bootstrap.js";
import { getDb } from "./db/connection.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const result = await ensureDataset();
  if (!result.ok) {
    process.stderr.write(`[bootstrap] FATAL: ${result.reason}\n`);
    process.exit(1);
  }
  process.stderr.write(`[bootstrap] OK (${result.action}, versão ${result.version})\n`);

  // Warm up the DB connection after bootstrap
  getDb();

  const server = createServer();
  const transport = new StdioServerTransport();

  function shutdown(): void {
    try {
      getDb().close();
    } catch {
      // already closed or not opened
    }
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
