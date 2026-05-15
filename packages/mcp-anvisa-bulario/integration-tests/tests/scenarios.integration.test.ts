import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDevCatalogoScenario } from "../scenarios/dev-catalogo.js";
import { runEdgeCasesScenario } from "../scenarios/edge-cases.js";
import { runFarmaceuticoTarjaScenario } from "../scenarios/farmaceutico-tarja.js";
import { runMedicoPrescricaoScenario } from "../scenarios/medico-prescricao.js";
import { makeIntegrationServer } from "../setup/helpers.js";

type Suite = ReturnType<typeof makeIntegrationServer>;

describe("Cenário: Médico verificando medicamento antes de prescrever", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("completes full prescription verification flow", async () => {
    const result = await runMedicoPrescricaoScenario(suite.server);
    for (const step of result.steps) {
      expect(step.passed, `Step "${step.step}" failed: ${step.error}`).toBe(true);
    }
    expect(result.passed).toBe(true);
  });
});

describe("Cenário: Farmacêutico verificando tarja de dispensação", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("correctly identifies controlled vs OTC medications", async () => {
    const result = await runFarmaceuticoTarjaScenario(suite.server);
    for (const step of result.steps) {
      expect(step.passed, `Step "${step.step}" failed: ${step.error}`).toBe(true);
    }
    expect(result.passed).toBe(true);
  });
});

describe("Cenário: Dev healthtech integrando catálogo de medicamentos", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("all tools output conformant schemas with no PHI", async () => {
    const result = await runDevCatalogoScenario(suite.server);
    for (const step of result.steps) {
      expect(step.passed, `Step "${step.step}" failed: ${step.error}`).toBe(true);
    }
    expect(result.passed).toBe(true);
  });
});

describe("Cenário: Casos extremos e tratamento de erros", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("handles invalid inputs and source failures gracefully", async () => {
    const result = await runEdgeCasesScenario(suite.server);
    for (const step of result.steps) {
      expect(step.passed, `Step "${step.step}" failed: ${step.error}`).toBe(true);
    }
    expect(result.passed).toBe(true);
  });
});
