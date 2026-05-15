import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["integration-tests/tests/**/*.integration.test.ts"],
    globals: false,
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 15000,
    reporters: ["verbose", "json"],
    outputFile: {
      json: path.join(import.meta.dirname, "results", "vitest-results.json"),
    },
    // Vitest 4 defaults to forks pool; explicit pool/poolOptions config removed
    // (typing for poolOptions is currently restricted in v4 InlineConfig).
    // Each test uses mkdtempSync for isolated SQLite files, so single-fork is not required.
  },
});
