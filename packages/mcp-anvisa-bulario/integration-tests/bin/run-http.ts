#!/usr/bin/env tsx

/**
 * run-http.ts — v2.0 stub
 *
 * O HttpClient Playwright foi removido em v2.0.
 * Este script agora valida o CSV da ANVISA em vez do HTTP client.
 */

import type { TestResult } from "../setup/helpers.js";
import { printSummary, runTest, saveResults } from "../setup/helpers.js";

async function main() {
  const results: TestResult[] = [];

  results.push(
    await runTest("CSV ANVISA acessível (smoke test)", async () => {
      const resp = await fetch("https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv", {
        method: "HEAD",
        headers: { "User-Agent": "mcpassure/mcp-anvisa-bulario integration-test" },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    })
  );

  printSummary(results, "HTTP / CSV Integration Tests (v2.0)");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  saveResults(`run-http-${timestamp}.json`, { timestamp: new Date().toISOString(), results });
  saveResults("run-http-latest.json", { timestamp: new Date().toISOString(), results });

  process.exit(results.every((r) => r.passed) ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
