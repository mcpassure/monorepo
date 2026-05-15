#!/usr/bin/env tsx

/**
 * Executa os cenários de simulação de usuário.
 * Uso: npx tsx integration-tests/bin/run-scenarios.ts
 */

import { runDevCatalogoScenario } from "../scenarios/dev-catalogo.js";
import { runEdgeCasesScenario } from "../scenarios/edge-cases.js";
import { runFarmaceuticoTarjaScenario } from "../scenarios/farmaceutico-tarja.js";
import type { ScenarioResult } from "../scenarios/medico-prescricao.js";
import { runMedicoPrescricaoScenario } from "../scenarios/medico-prescricao.js";
import { makeIntegrationServer, saveResults } from "../setup/helpers.js";

async function main() {
  const { server, cleanup } = makeIntegrationServer();
  const allScenarios: ScenarioResult[] = [];
  let totalPassed = 0;
  let totalSteps = 0;

  process.stdout.write("\n=== Simulação de Usuários — MCP ANVISA Bulário ===\n\n");

  try {
    const scenarios: Array<[string, () => Promise<ScenarioResult>]> = [
      [
        "Médico — Verificar Novalgina antes de prescrever",
        () => runMedicoPrescricaoScenario(server),
      ],
      ["Farmacêutico — Verificar tarja de dispensação", () => runFarmaceuticoTarjaScenario(server)],
      ["Dev healthtech — Integrar catálogo de medicamentos", () => runDevCatalogoScenario(server)],
      ["Casos extremos e tratamento de erros", () => runEdgeCasesScenario(server)],
    ];

    for (const [label, fn] of scenarios) {
      process.stdout.write(`▶ ${label}\n`);
      const r = await fn();
      allScenarios.push(r);

      for (const s of r.steps) {
        const icon = s.passed ? "  ✓" : "  ✗";
        const err = s.error ? ` — ${s.error}` : "";
        process.stdout.write(`${icon} ${s.step}${err}\n`);
        totalSteps++;
        if (s.passed) totalPassed++;
      }
      process.stdout.write(`  → ${r.passed ? "PASSOU" : "FALHOU"}\n\n`);
    }
  } finally {
    cleanup();
  }

  process.stdout.write(`══════════════════════════════════════════\n`);
  process.stdout.write(
    `Cenários: ${allScenarios.filter((s) => s.passed).length}/${allScenarios.length} passaram\n`
  );
  process.stdout.write(`Passos:   ${totalPassed}/${totalSteps} passaram\n\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  saveResults(`run-scenarios-${timestamp}.json`, {
    timestamp: new Date().toISOString(),
    scenarios: allScenarios,
    summary: { totalPassed, totalSteps },
  });
  saveResults("run-scenarios-latest.json", {
    timestamp: new Date().toISOString(),
    scenarios: allScenarios,
    summary: { totalPassed, totalSteps },
  });

  process.exit(totalPassed === totalSteps ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
