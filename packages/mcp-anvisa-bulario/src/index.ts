#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ensureDataset, getDbPath } from "./bootstrap.js";
import { BularioDatasetSource } from "./db/dataset.js";
import { BularioRepository } from "./domain/repository.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  // Step 1: Ensure dataset is available (R2 bootstrap or local cache)
  const bootstrapResult = await ensureDataset();

  if (!bootstrapResult.ok) {
    process.stderr.write(
      `[startup] ERRO: ${bootstrapResult.reason}\n` +
        `Dica: Execute 'npm run sync' para popular o dataset local a partir do CSV da ANVISA.\n`
    );
    process.exit(1);
  }

  process.stderr.write(
    `[startup] Dataset pronto (${bootstrapResult.action} v${bootstrapResult.version})\n`
  );

  // Step 2: Open SQLite dataset
  const dbPath = getDbPath();
  const source = new BularioDatasetSource(dbPath);
  const repository = new BularioRepository(source);
  const server = createServer(repository);
  const transport = new StdioServerTransport();

  async function shutdown(): Promise<void> {
    await source.close();
    process.exit(0);
  }

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });

  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
