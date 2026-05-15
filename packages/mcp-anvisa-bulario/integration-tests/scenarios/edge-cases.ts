/**
 * Cenário: Casos extremos e tratamento de erros.
 *
 * Casos:
 * A) Input inválido → erro Zod antes de chamar a fonte
 * B) numProcesso inexistente → isError com mensagem legível
 * C) String vazia → rejeição de schema
 * D) Cache hit após primeira chamada bem-sucedida
 * E) count=1 respects page size
 * F) Fonte indisponível → isError em todas as 6 tools
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BularioRepository } from "../../src/domain/repository.js";
import { createServer } from "../../src/server.js";
import { getRegisteredTools } from "../../test-utils/mcp-helpers.js";
import { FailingSource, FixtureSource } from "../setup/fixture-source.js";
import { assert, assertDefined, assertEqual, callTool } from "../setup/helpers.js";
import type { ScenarioResult } from "./medico-prescricao.js";

type ListaData = {
  medicamentos: unknown[];
};

export async function runEdgeCasesScenario(server: McpServer): Promise<ScenarioResult> {
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
    // A: Invalid tarja enum
    await step("tarja inválida → isError (Zod antes de chamar fonte)", async () => {
      const r = await callTool(server, "filtrar_por_tarja", { tarja: "AMARELA" });
      assert(r.isError === true, "invalid tarja should return isError");
    });

    // B: Unknown numProcesso
    await step("numProcesso desconhecido → isError com mensagem legível", async () => {
      const r = await callTool(server, "consultar_bula", { numProcesso: "9999999999999" });
      assert(r.isError === true, "unknown numProcesso should return isError");
      const content = r.content as Array<{ text: string }>;
      assert(typeof content[0].text === "string", "error message should be a string");
      assert(content[0].text.length > 0, "error message should not be empty");
    });

    // C: Empty string input
    await step("nome vazio → isError (Zod min(1))", async () => {
      const r = await callTool(server, "buscar_por_nome", { nome: "" });
      assert(r.isError === true, "empty nome should fail validation");
    });

    // D: Source is called every time in v2.0 (SQLite is in-process, no separate cache)
    await step(
      "source é chamada a cada requisição (v2.0 — sem cache em memória separado)",
      async () => {
        const source = new FixtureSource();
        const repository = new BularioRepository(source);
        const testServer = createServer(repository);

        await callTool(testServer, "buscar_por_nome", { nome: "novalgina" });
        const callCount1 = source.callLog.filter((c) => c.method === "searchByName").length;
        assertEqual(callCount1, 1, "first call hits source");

        await callTool(testServer, "buscar_por_nome", { nome: "novalgina" });
        const callCount2 = source.callLog.filter((c) => c.method === "searchByName").length;
        assertEqual(callCount2, 2, "second call also hits source (v2.0 no in-memory cache)");
      }
    );

    // E: count=1 pagination
    await step("count=1 → retorna exatamente 1 resultado", async () => {
      const r = await callTool(server, "buscar_por_nome", {
        nome: "dipirona",
        count: 1,
        pagina: 1,
      });
      const data = r.structuredContent?.data as ListaData | undefined;
      assertDefined(data, "structuredContent.data");
      assertEqual(data.medicamentos.length, 1, "exactly 1 result");
    });

    // F: All 6 tools handle source failure gracefully
    await step("fonte indisponível → todas as 6 tools retornam isError", async () => {
      const failSource = new FailingSource(new Error("ANVISA API offline"));
      const failRepo = new BularioRepository(failSource);
      const failServer = createServer(failRepo);

      const calls = [
        { tool: "buscar_por_nome", args: { nome: "test" } },
        { tool: "buscar_por_principio_ativo", args: { principioAtivo: "test" } },
        { tool: "buscar_por_classe_terapeutica", args: { classeTerapeutica: "test" } },
        { tool: "filtrar_por_tarja", args: { tarja: "VERMELHA" } },
        { tool: "consultar_bula", args: { numProcesso: "25351617747202347" } },
        { tool: "listar_apresentacoes", args: { numProcesso: "25351617747202347" } },
      ];

      for (const { tool, args } of calls) {
        const r = await callTool(failServer, tool, args);
        assert(r.isError === true, `${tool} should return isError when source fails`);
        const content = r.content as Array<{ text: string }>;
        assert(!content[0].text.includes("stack"), "error should not leak stack trace");
      }
    });

    // G: annotations are present on all tools
    await step("annotations corretos em todas as tools", async () => {
      const registeredTools = getRegisteredTools(server);
      const toolNames = [
        "buscar_por_nome",
        "buscar_por_principio_ativo",
        "buscar_por_classe_terapeutica",
        "filtrar_por_tarja",
        "consultar_bula",
        "listar_apresentacoes",
      ];
      for (const name of toolNames) {
        assert(registeredTools[name] !== undefined, `Tool ${name} should be registered`);
        const annotations = registeredTools[name].annotations as
          | Record<string, boolean>
          | undefined;
        assert(annotations?.readOnlyHint === true, `${name}: readOnlyHint should be true`);
        assert(annotations?.destructiveHint === false, `${name}: destructiveHint should be false`);
        assert(
          annotations?.openWorldHint === false,
          `${name}: openWorldHint should be false (v2.0 local SQLite)`
        );
      }
    });

    // H: Missing required field
    await step("campo obrigatório ausente → isError", async () => {
      const r = await callTool(server, "consultar_bula", {});
      assert(r.isError === true, "missing numProcesso should fail");
    });

    const allPassed = steps.every((s) => s.passed);
    return {
      name: "Casos extremos e tratamento de erros",
      passed: allPassed,
      steps,
      totalMs: Date.now() - start,
    };
  } catch {
    const allPassed = steps.every((s) => s.passed);
    return {
      name: "Casos extremos e tratamento de erros",
      passed: allPassed,
      steps,
      totalMs: Date.now() - start,
    };
  }
}
