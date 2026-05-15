/**
 * Cenário: Farmacêutico verificando tarja de dispensação.
 *
 * Casos cobertos:
 * A) Confirmar que Rivotril é PRETA (retenção especial)
 * B) Confirmar que Tylenol é LIVRE (sem receita)
 * C) Filtrar lista de medicamentos PRETA para conferência de estoque
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { assert, assertDefined, assertEqual, callTool } from "../setup/helpers.js";
import type { ScenarioResult } from "./medico-prescricao.js";

type ListaData = {
  medicamentos: Array<{ numProcesso: string; nomeProduto: string }>;
};

type BulaData = {
  nomeProduto: string;
  tarja?: string;
  principioAtivo?: string;
};

export async function runFarmaceuticoTarjaScenario(server: McpServer): Promise<ScenarioResult> {
  const start = Date.now();
  const steps: ScenarioResult["steps"] = [];

  async function step(name: string, fn: () => Promise<unknown>): Promise<unknown> {
    try {
      const output = await fn();
      steps.push({ step: name, passed: true, output });
      return output;
    } catch (err) {
      steps.push({
        step: name,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  try {
    // Case A: RIVOTRIL should be PRETA (controlled substance)
    await step("Rivotril → buscar_por_nome → numProcesso", async () => {
      const r = await callTool(server, "buscar_por_nome", { nome: "rivotril" });
      assert(!r.isError, "search should succeed");
      const data = r.structuredContent?.data as ListaData | undefined;
      assertDefined(data, "structuredContent.data");
      assert(data.medicamentos.length > 0, "should find rivotril");
      assertEqual(data.medicamentos[0].nomeProduto, "RIVOTRIL", "nomeProduto");
      return data.medicamentos[0].numProcesso;
    });

    await step("Rivotril → consultar_bula → confirmar TARJA PRETA", async () => {
      const r = await callTool(server, "consultar_bula", { numProcesso: "25351537388202183" });
      assert(!r.isError, "consultar_bula should succeed");
      const data = r.structuredContent?.data as BulaData | undefined;
      assertDefined(data, "structuredContent.data");
      assertEqual(data.nomeProduto, "RIVOTRIL", "nome");
      assertEqual(
        data.tarja,
        "PRETA",
        "tarja deve ser PRETA — controle especial, retenção de receita especial"
      );
      assertDefined(data.principioAtivo, "principioAtivo");
      assert(
        data.principioAtivo.toUpperCase().includes("CLONAZEPAM"),
        "princípio ativo deve ser clonazepam"
      );
      return data;
    });

    // Case B: TYLENOL should be LIVRE (OTC)
    await step("Tylenol → consultar_bula → confirmar TARJA LIVRE", async () => {
      const r = await callTool(server, "consultar_bula", { numProcesso: "25351464826202349" });
      const data = r.structuredContent?.data as BulaData | undefined;
      assertDefined(data, "structuredContent.data");
      assertEqual(data.nomeProduto, "TYLENOL", "nome");
      assertEqual(data.tarja, "LIVRE", "tylenol deve ser LIVRE — venda sem receita");
      return data;
    });

    // Case C: filtrar_por_tarja PRETA — check stock of controlled substances
    await step("filtrar_por_tarja(PRETA) → lista medicamentos de controle especial", async () => {
      const r = await callTool(server, "filtrar_por_tarja", { tarja: "PRETA" });
      assert(!r.isError, "filtrar_por_tarja PRETA should succeed");
      const data = r.structuredContent?.data as ListaData | undefined;
      assertDefined(data, "structuredContent.data");
      assert(data.medicamentos.length > 0, "should return some PRETA medications");
      assert(
        data.medicamentos.some((m) => m.nomeProduto.toUpperCase().includes("RITALINA")),
        "RITALINA should be in PRETA list"
      );
      return data;
    });

    // Case D: filtrar_por_tarja VERMELHA
    await step("filtrar_por_tarja(VERMELHA) → lista medicamentos com receita simples", async () => {
      const r = await callTool(server, "filtrar_por_tarja", { tarja: "VERMELHA" });
      assert(!r.isError, "filtrar_por_tarja VERMELHA should succeed");
      const data = r.structuredContent?.data as ListaData | undefined;
      assertDefined(data, "structuredContent.data");
      assert(data.medicamentos.length > 0, "should return some VERMELHA medications");
      return data;
    });

    // Case E: tarja inválida → erro de validação
    await step("filtrar_por_tarja(ROXO) → erro de validação Zod", async () => {
      const r = await callTool(server, "filtrar_por_tarja", { tarja: "ROXO" });
      assert(r.isError === true, "invalid tarja should return isError");
      return r;
    });

    const allPassed = steps.every((s) => s.passed);
    return {
      name: "Farmacêutico — Verificar tarja de dispensação",
      passed: allPassed,
      steps,
      totalMs: Date.now() - start,
    };
  } catch {
    const allPassed = steps.every((s) => s.passed);
    return {
      name: "Farmacêutico — Verificar tarja de dispensação",
      passed: allPassed,
      steps,
      totalMs: Date.now() - start,
    };
  }
}
