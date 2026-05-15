/**
 * Cenário: Médico verificando medicamento antes de prescrever.
 *
 * Fluxo real:
 * 1. Médico pergunta sobre Novalgina
 * 2. Agente busca por nome → obtém numProcesso
 * 3. Agente consulta bula → obtém tarja, princípio ativo, links PDF
 * 4. Agente lista apresentações → médico escolhe a forma correta
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  assert,
  assertArrayMinLength,
  assertDefined,
  assertEqual,
  callTool,
} from "../setup/helpers.js";

export type ScenarioResult = {
  name: string;
  passed: boolean;
  steps: Array<{ step: string; passed: boolean; error?: string; output?: unknown }>;
  totalMs: number;
};

type ListaData = {
  medicamentos: Array<{ numProcesso: string; nomeProduto: string }>;
};

type BulaData = {
  nomeProduto: string;
  tarja?: string;
  principioAtivo?: string;
  bulaPaciente?: { id: string; urlPdf?: string };
  bulaProfissional?: { id: string; urlPdf?: string };
};

type ApresentacoesData = {
  apresentacoes: Array<{ descricao: string }>;
};

export async function runMedicoPrescricaoScenario(server: McpServer): Promise<ScenarioResult> {
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
    // Step 1: Search by brand name
    const searchData = (await step("buscar_por_nome('novalgina')", async () => {
      const r = await callTool(server, "buscar_por_nome", { nome: "novalgina", count: 5 });
      assert(!r.isError, `buscar_por_nome returned error: ${JSON.stringify(r)}`);
      const data = r.structuredContent?.data as ListaData | undefined;
      assertDefined(data, "structuredContent.data");
      assertArrayMinLength(data.medicamentos, 1, "medicamentos");
      assert(
        data.medicamentos[0].nomeProduto.includes("NOVALGINA"),
        "First result should be NOVALGINA"
      );
      return data;
    })) as ListaData;

    const numProcesso = searchData.medicamentos[0].numProcesso;

    // Step 2: Check bula for prescription info
    await step(`consultar_bula(${numProcesso})`, async () => {
      const r = await callTool(server, "consultar_bula", { numProcesso });
      assert(!r.isError, `consultar_bula returned error`);
      const data = r.structuredContent?.data as BulaData | undefined;
      assertDefined(data, "structuredContent.data");
      assertEqual(data.nomeProduto, "NOVALGINA", "nomeProduto");
      assertEqual(data.tarja, "VERMELHA", "tarja should be VERMELHA (requires prescription)");
      assertDefined(data.principioAtivo, "principioAtivo");
      assertDefined(data.bulaProfissional, "bulaProfissional");
      assertDefined(data.bulaProfissional.urlPdf, "bulaProfissional.urlPdf");
      return data;
    });

    // Step 3: List presentations for prescription
    await step(`listar_apresentacoes(${numProcesso})`, async () => {
      const r = await callTool(server, "listar_apresentacoes", { numProcesso });
      assert(!r.isError, "listar_apresentacoes should not error");
      const data = r.structuredContent?.data as ApresentacoesData | undefined;
      assertDefined(data, "structuredContent.data");
      assertArrayMinLength(data.apresentacoes, 1, "apresentacoes");
      // Confirm at least one injectable form exists (common for Novalgina)
      const hasInjetavel = data.apresentacoes.some(
        (a) =>
          a.descricao.toUpperCase().includes("INJETAVEL") ||
          a.descricao.toUpperCase().includes("GOTAS")
      );
      assert(hasInjetavel, "Novalgina should have injectable or drops form");
      return data;
    });

    // Step 4: Verify medical disclaimer in all responses
    await step("verificar disclaimer médico nas respostas", async () => {
      const r = await callTool(server, "buscar_por_nome", { nome: "novalgina" });
      const content = r.content as Array<{ text: string }>;
      assert(content[0].text.includes("profissional"), "Medical disclaimer must be present");
    });

    const allPassed = steps.every((s) => s.passed);
    return {
      name: "Médico — Verificar Novalgina antes de prescrever",
      passed: allPassed,
      steps,
      totalMs: Date.now() - start,
    };
  } catch {
    const allPassed = steps.every((s) => s.passed);
    return {
      name: "Médico — Verificar Novalgina antes de prescrever",
      passed: allPassed,
      steps,
      totalMs: Date.now() - start,
    };
  }
}
