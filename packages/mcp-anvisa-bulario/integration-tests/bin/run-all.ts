#!/usr/bin/env tsx

/**
 * Executa toda a suite de testes de integração e gera relatório JSON + resumo no console.
 * Uso: npx tsx integration-tests/bin/run-all.ts
 */

import { runDevCatalogoScenario } from "../scenarios/dev-catalogo.js";
import { runEdgeCasesScenario } from "../scenarios/edge-cases.js";
import { runFarmaceuticoTarjaScenario } from "../scenarios/farmaceutico-tarja.js";
import { runMedicoPrescricaoScenario } from "../scenarios/medico-prescricao.js";
import type { TestResult } from "../setup/helpers.js";
import { makeIntegrationServer, saveResults } from "../setup/helpers.js";

async function main() {
  const globalStart = Date.now();
  process.stdout.write("\n╔════════════════════════════════════════════════════════╗\n");
  process.stdout.write("║     MCP ANVISA Bulário — Integration Test Suite        ║\n");
  process.stdout.write("╚════════════════════════════════════════════════════════╝\n\n");

  const allResults: TestResult[] = [];
  const scenarioResults: unknown[] = [];

  const { server, cleanup } = makeIntegrationServer();

  try {
    // ── Scenarios ──────────────────────────────────────────────────────────
    process.stdout.write("▶ Running user scenarios...\n");

    for (const [name, fn] of [
      [
        "Médico — Verificar Novalgina antes de prescrever",
        () => runMedicoPrescricaoScenario(server),
      ],
      ["Farmacêutico — Verificar tarja de dispensação", () => runFarmaceuticoTarjaScenario(server)],
      ["Dev healthtech — Integrar catálogo de medicamentos", () => runDevCatalogoScenario(server)],
      ["Casos extremos e tratamento de erros", () => runEdgeCasesScenario(server)],
    ] as [
      string,
      () => Promise<{
        passed: boolean;
        steps: Array<{ step: string; passed: boolean; error?: string }>;
      }>,
    ][]) {
      const t0 = Date.now();
      const r = await fn();
      const ms = Date.now() - t0;

      for (const s of r.steps) {
        allResults.push({
          name: `[${name}] ${s.step}`,
          passed: s.passed,
          durationMs: 0,
          error: s.error,
        });
      }
      scenarioResults.push(r);
      process.stdout.write(`  ${r.passed ? "✓" : "✗"} ${name} (${ms}ms)\n`);
    }
  } finally {
    cleanup();
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const passed = allResults.filter((r) => r.passed).length;
  const total = allResults.length;
  const failed = allResults.filter((r) => !r.passed);
  const totalMs = Date.now() - globalStart;

  process.stdout.write("\n══════════════════════════════════════════════════════════\n");
  process.stdout.write(`  TOTAL: ${passed}/${total} passed in ${totalMs}ms\n`);

  if (failed.length > 0) {
    process.stdout.write("\n  FAILURES:\n");
    for (const f of failed) {
      process.stdout.write(`    ✗ ${f.name}\n`);
      if (f.error) process.stdout.write(`      ${f.error}\n`);
    }
  }
  process.stdout.write("══════════════════════════════════════════════════════════\n\n");

  // ── Save results ───────────────────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const report = {
    timestamp: new Date().toISOString(),
    summary: { passed, total, failed: total - passed, durationMs: totalMs },
    scenarios: scenarioResults,
    allSteps: allResults,
  };

  saveResults(`run-all-${timestamp}.json`, report);
  saveResults("run-all-latest.json", report);

  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
