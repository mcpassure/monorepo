/**
 * Cenário: Desenvolvedor healthtech integrando catálogo de medicamentos.
 *
 * Fluxo real:
 * 1. Listar antibióticos disponíveis (busca por classe terapêutica)
 * 2. Buscar princípio ativo para preencher dropdown de prescrição
 * 3. Obter apresentações disponíveis para determinado produto
 * 4. Verificar que estruturedContent é parseável para um schema Zod
 * 5. Verificar que nenhuma resposta contém PHI/PII
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ApresentacoesOutputSchema,
  BulaOutputSchema,
  MedicamentoListaOutputSchema,
} from "../../src/schemas/tools.js";
import { assert, assertArrayMinLength, assertDefined, callTool } from "../setup/helpers.js";
import type { ScenarioResult } from "./medico-prescricao.js";

const PHI_PATTERNS = [
  /cpf/i,
  /rg\b/i,
  /prontuario/i,
  /paciente_id/i,
  /user_id/i,
  /email/i,
  /telefone/i,
];

function containsPHI(data: unknown): boolean {
  const str = JSON.stringify(data);
  return PHI_PATTERNS.some((p) => p.test(str));
}

type ListaData = {
  medicamentos: Array<{ numProcesso: string; nomeProduto: string }>;
};

type ApresentacoesData = {
  apresentacoes: Array<{ descricao: string }>;
};

export async function runDevCatalogoScenario(server: McpServer): Promise<ScenarioResult> {
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
    // Step 1: Search antibiotics by therapeutic class
    await step(
      "buscar_por_classe_terapeutica('antibiotico') — dropdown de antibióticos",
      async () => {
        const r = await callTool(server, "buscar_por_classe_terapeutica", {
          classeTerapeutica: "antibiotico",
          count: 10,
        });
        assert(!r.isError, "class search should succeed");
        const data = r.structuredContent?.data as ListaData | undefined;
        assertDefined(data, "structuredContent.data");
        assertArrayMinLength(data.medicamentos, 1, "medicamentos");

        // Validate against Zod schema — passes the full envelope { data, _meta }
        const parsed = MedicamentoListaOutputSchema.safeParse(r.structuredContent);
        assert(
          parsed.success,
          `structuredContent does not conform to MedicamentoListaOutputSchema: ${parsed.error}`
        );
        assert(!containsPHI(r.structuredContent), "response should not contain PHI/PII");
        return data;
      }
    );

    // Step 2: Search by active ingredient for auto-complete
    await step(
      "buscar_por_principio_ativo('ibuprofeno') — autocomplete de princípio ativo",
      async () => {
        const r = await callTool(server, "buscar_por_principio_ativo", {
          principioAtivo: "ibuprofeno",
        });
        const data = r.structuredContent?.data as ListaData | undefined;
        assertDefined(data, "structuredContent.data");
        const parsed = MedicamentoListaOutputSchema.safeParse(r.structuredContent);
        assert(parsed.success, "should match output schema");
        assert(!containsPHI(r.structuredContent), "no PHI");
        return data;
      }
    );

    // Step 3: Get presentations for prescription dropdown
    await step("listar_apresentacoes(AMOXIL) — dropdown de formas farmacêuticas", async () => {
      const r = await callTool(server, "listar_apresentacoes", { numProcesso: "2599202214972" });
      assert(!r.isError, "listar_apresentacoes should succeed");
      const data = r.structuredContent?.data as ApresentacoesData | undefined;
      assertDefined(data, "structuredContent.data");
      const parsed = ApresentacoesOutputSchema.safeParse(r.structuredContent);
      assert(
        parsed.success,
        `structuredContent does not match ApresentacoesOutputSchema: ${parsed.error}`
      );
      assertArrayMinLength(data.apresentacoes, 2, "apresentacoes for AMOXIL");
      assert(!containsPHI(r.structuredContent), "no PHI");
      return data;
    });

    // Step 4: Validate full bula output schema
    await step("consultar_bula(ADVIL) — dados estruturados validados por Zod", async () => {
      const r = await callTool(server, "consultar_bula", { numProcesso: "25351400358202201" });
      const parsed = BulaOutputSchema.safeParse(r.structuredContent);
      assert(parsed.success, `BulaOutputSchema failed: ${parsed.error}`);
      assert(!containsPHI(r.structuredContent), "no PHI in bula");
      return r.structuredContent;
    });

    // Step 5: Multi-page search simulating UI pagination
    await step("paginação — buscar_por_nome('dipirona') páginas 1 e 2", async () => {
      const p1 = await callTool(server, "buscar_por_nome", {
        nome: "dipirona",
        pagina: 1,
        count: 1,
      });
      const p2 = await callTool(server, "buscar_por_nome", {
        nome: "dipirona",
        pagina: 2,
        count: 1,
      });
      const d1 = p1.structuredContent?.data as ListaData | undefined;
      const d2 = p2.structuredContent?.data as ListaData | undefined;
      assertDefined(d1, "page 1 data");
      assertDefined(d2, "page 2 data");
      // With 2 fixture results: page 1 has result, page 2 is empty or different
      assert(d1.medicamentos.length <= 1, "page size respected");
      assert(Array.isArray(d2.medicamentos), "page 2 is array");
      return { p1: d1, p2: d2 };
    });

    // Step 6: Verify structuredContent is always defined (never undefined in success case)
    await step("structuredContent sempre definido em respostas de sucesso", async () => {
      const tools = [
        { tool: "buscar_por_nome", args: { nome: "novalgina" } },
        { tool: "buscar_por_principio_ativo", args: { principioAtivo: "dipirona" } },
        { tool: "buscar_por_classe_terapeutica", args: { classeTerapeutica: "analgesico" } },
        { tool: "filtrar_por_tarja", args: { tarja: "VERMELHA" } },
        { tool: "consultar_bula", args: { numProcesso: "25351617747202347" } },
        { tool: "listar_apresentacoes", args: { numProcesso: "25351617747202347" } },
      ];
      for (const { tool, args } of tools) {
        const r = await callTool(server, tool, args);
        assert(!r.isError, `${tool} should not error`);
        assertDefined(r.structuredContent, `${tool}.structuredContent`);
      }
    });

    const allPassed = steps.every((s) => s.passed);
    return {
      name: "Dev healthtech — Integrar catálogo de medicamentos",
      passed: allPassed,
      steps,
      totalMs: Date.now() - start,
    };
  } catch {
    const allPassed = steps.every((s) => s.passed);
    return {
      name: "Dev healthtech — Integrar catálogo de medicamentos",
      passed: allPassed,
      steps,
      totalMs: Date.now() - start,
    };
  }
}
