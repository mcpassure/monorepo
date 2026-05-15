#!/usr/bin/env tsx

/**
 * Testa todas as 6 tools individualmente com dados de fixture reais.
 * Uso: npx tsx integration-tests/bin/run-tools.ts
 */

import type { TestResult } from "../setup/helpers.js";
import {
  callTool,
  makeIntegrationServer,
  printSummary,
  runTest,
  saveResults,
} from "../setup/helpers.js";

async function main() {
  const { server, cleanup } = makeIntegrationServer();
  const results: TestResult[] = [];

  try {
    // ── buscar_por_nome ───────────────────────────────────────────────────
    results.push(
      await runTest("buscar_por_nome: novalgina → 2 resultados", async () => {
        const r = await callTool(server, "buscar_por_nome", { nome: "novalgina" });
        if (r.isError) throw new Error("returned isError");
        const sc = r.structuredContent as { medicamentos: unknown[] };
        if (sc.medicamentos.length < 1) throw new Error("empty results");
      })
    );

    results.push(
      await runTest("buscar_por_nome: tylenol → nomeProduto correto", async () => {
        const r = await callTool(server, "buscar_por_nome", { nome: "tylenol" });
        const sc = r.structuredContent as { medicamentos: Array<{ nomeProduto: string }> };
        if (!sc.medicamentos[0].nomeProduto.includes("TYLENOL"))
          throw new Error(`got: ${sc.medicamentos[0].nomeProduto}`);
      })
    );

    results.push(
      await runTest("buscar_por_nome: advil → múltiplos produtos", async () => {
        const r = await callTool(server, "buscar_por_nome", { nome: "advil" });
        const sc = r.structuredContent as { medicamentos: unknown[] };
        if (sc.medicamentos.length < 2)
          throw new Error(`expected >=2, got ${sc.medicamentos.length}`);
      })
    );

    results.push(
      await runTest("buscar_por_nome: count=1 → exatamente 1 resultado", async () => {
        const r = await callTool(server, "buscar_por_nome", { nome: "dipirona", count: 1 });
        const sc = r.structuredContent as { medicamentos: unknown[] };
        if (sc.medicamentos.length !== 1)
          throw new Error(`expected 1, got ${sc.medicamentos.length}`);
      })
    );

    results.push(
      await runTest("buscar_por_nome: campo vazio → isError", async () => {
        const r = await callTool(server, "buscar_por_nome", { nome: "" });
        if (!r.isError) throw new Error("expected isError for empty nome");
      })
    );

    // ── buscar_por_principio_ativo ────────────────────────────────────────
    results.push(
      await runTest("buscar_por_principio_ativo: dipirona → resultados não vazios", async () => {
        const r = await callTool(server, "buscar_por_principio_ativo", {
          principioAtivo: "dipirona",
        });
        if (r.isError) throw new Error("returned isError");
        const sc = r.structuredContent as { medicamentos: unknown[] };
        if (sc.medicamentos.length < 1) throw new Error("empty");
      })
    );

    results.push(
      await runTest("buscar_por_principio_ativo: amoxicilina → numProcesso presente", async () => {
        const r = await callTool(server, "buscar_por_principio_ativo", {
          principioAtivo: "amoxicilina",
        });
        const sc = r.structuredContent as { medicamentos: Array<{ numProcesso: string }> };
        if (!sc.medicamentos[0].numProcesso) throw new Error("missing numProcesso");
      })
    );

    results.push(
      await runTest("buscar_por_principio_ativo: ibuprofeno → empresa presente", async () => {
        const r = await callTool(server, "buscar_por_principio_ativo", {
          principioAtivo: "ibuprofeno",
        });
        const sc = r.structuredContent as { medicamentos: Array<{ empresa: string }> };
        if (!sc.medicamentos[0].empresa) throw new Error("missing empresa");
      })
    );

    // ── buscar_por_classe_terapeutica ─────────────────────────────────────
    results.push(
      await runTest("buscar_por_classe_terapeutica: analgesico → resultados", async () => {
        const r = await callTool(server, "buscar_por_classe_terapeutica", {
          classeTerapeutica: "analgesico",
        });
        if (r.isError) throw new Error("returned isError");
        const sc = r.structuredContent as { medicamentos: unknown[] };
        if (sc.medicamentos.length < 1) throw new Error("empty");
      })
    );

    results.push(
      await runTest(
        "buscar_por_classe_terapeutica: antibiotico → medicamentos presentes",
        async () => {
          const r = await callTool(server, "buscar_por_classe_terapeutica", {
            classeTerapeutica: "antibiotico",
          });
          const sc = r.structuredContent as { medicamentos: Array<{ nomeProduto: string }> };
          if (!sc.medicamentos.some((m) => m.nomeProduto.toUpperCase().includes("AMOXICILINA"))) {
            throw new Error("expected AMOXICILINA in antibiotico results");
          }
        }
      )
    );

    // ── filtrar_por_tarja ─────────────────────────────────────────────────
    results.push(
      await runTest("filtrar_por_tarja: PRETA → RITALINA", async () => {
        const r = await callTool(server, "filtrar_por_tarja", { tarja: "PRETA" });
        const sc = r.structuredContent as { medicamentos: Array<{ nomeProduto: string }> };
        if (sc.medicamentos[0].nomeProduto !== "RITALINA")
          throw new Error(`expected RITALINA, got ${sc.medicamentos[0].nomeProduto}`);
      })
    );

    results.push(
      await runTest("filtrar_por_tarja: VERMELHA → NOVALGINA", async () => {
        const r = await callTool(server, "filtrar_por_tarja", { tarja: "VERMELHA" });
        const sc = r.structuredContent as { medicamentos: Array<{ nomeProduto: string }> };
        if (!sc.medicamentos[0].nomeProduto.includes("NOVALGINA"))
          throw new Error(`expected NOVALGINA, got ${sc.medicamentos[0].nomeProduto}`);
      })
    );

    results.push(
      await runTest("filtrar_por_tarja: LIVRE → TYLENOL", async () => {
        const r = await callTool(server, "filtrar_por_tarja", { tarja: "LIVRE" });
        const sc = r.structuredContent as { medicamentos: Array<{ nomeProduto: string }> };
        if (!sc.medicamentos[0].nomeProduto.includes("TYLENOL"))
          throw new Error(`expected TYLENOL, got ${sc.medicamentos[0].nomeProduto}`);
      })
    );

    results.push(
      await runTest("filtrar_por_tarja: ROXO → isError (validação Zod)", async () => {
        const r = await callTool(server, "filtrar_por_tarja", { tarja: "ROXO" });
        if (!r.isError) throw new Error("expected isError");
      })
    );

    // ── consultar_bula ────────────────────────────────────────────────────
    results.push(
      await runTest("consultar_bula: NOVALGINA → todos os campos principais", async () => {
        const r = await callTool(server, "consultar_bula", { numProcesso: "25351617747202347" });
        if (r.isError) throw new Error("returned isError");
        const sc = r.structuredContent as {
          nomeProduto: string;
          tarja?: string;
          principioAtivo?: string;
          bulaPaciente?: unknown;
        };
        if (sc.nomeProduto !== "NOVALGINA") throw new Error(`nomeProduto: ${sc.nomeProduto}`);
        if (sc.tarja !== "VERMELHA") throw new Error(`tarja: ${sc.tarja}`);
        if (!sc.principioAtivo) throw new Error("missing principioAtivo");
        if (!sc.bulaPaciente) throw new Error("missing bulaPaciente");
      })
    );

    results.push(
      await runTest("consultar_bula: RIVOTRIL → tarja PRETA + clonazepam", async () => {
        const r = await callTool(server, "consultar_bula", { numProcesso: "25351537388202183" });
        const sc = r.structuredContent as {
          nomeProduto: string;
          tarja?: string;
          principioAtivo?: string;
        };
        if (sc.tarja !== "PRETA") throw new Error(`tarja: ${sc.tarja}`);
        if (!sc.principioAtivo?.toUpperCase().includes("CLONAZEPAM"))
          throw new Error(`principioAtivo: ${sc.principioAtivo}`);
      })
    );

    results.push(
      await runTest("consultar_bula: TYLENOL → tarja LIVRE", async () => {
        const r = await callTool(server, "consultar_bula", { numProcesso: "25351464826202349" });
        const sc = r.structuredContent as { tarja?: string };
        if (sc.tarja !== "LIVRE") throw new Error(`tarja: ${sc.tarja}`);
      })
    );

    results.push(
      await runTest("consultar_bula: AMOXIL → antibiótico com bula profissional", async () => {
        const r = await callTool(server, "consultar_bula", { numProcesso: "2599202214972" });
        const sc = r.structuredContent as {
          nomeProduto: string;
          bulaProfissional?: { urlPdf?: string };
        };
        if (sc.nomeProduto !== "AMOXIL") throw new Error(`nomeProduto: ${sc.nomeProduto}`);
        if (!sc.bulaProfissional?.urlPdf) throw new Error("missing bulaProfissional.urlPdf");
      })
    );

    results.push(
      await runTest("consultar_bula: numProcesso inexistente → isError", async () => {
        const r = await callTool(server, "consultar_bula", { numProcesso: "99999999999" });
        if (!r.isError) throw new Error("expected isError");
      })
    );

    results.push(
      await runTest("consultar_bula: RITALINA → tarja PRETA + metilfenidato", async () => {
        const r = await callTool(server, "consultar_bula", { numProcesso: "2599200126855" });
        const sc = r.structuredContent as { tarja?: string; principioAtivo?: string };
        if (sc.tarja !== "PRETA") throw new Error(`tarja: ${sc.tarja}`);
        if (!sc.principioAtivo?.toUpperCase().includes("METILFENIDATO"))
          throw new Error(`principioAtivo: ${sc.principioAtivo}`);
      })
    );

    // ── listar_apresentacoes ──────────────────────────────────────────────
    results.push(
      await runTest("listar_apresentacoes: NOVALGINA → 4 formas farmacêuticas", async () => {
        const r = await callTool(server, "listar_apresentacoes", {
          numProcesso: "25351617747202347",
        });
        const sc = r.structuredContent as { apresentacoes: unknown[] };
        if (sc.apresentacoes.length !== 4)
          throw new Error(`expected 4, got ${sc.apresentacoes.length}`);
      })
    );

    results.push(
      await runTest("listar_apresentacoes: AMOXIL → cápsulas presentes", async () => {
        const r = await callTool(server, "listar_apresentacoes", { numProcesso: "2599202214972" });
        const sc = r.structuredContent as { apresentacoes: Array<{ descricao: string }> };
        if (!sc.apresentacoes.some((a) => a.descricao.includes("CAPSULAS")))
          throw new Error("expected CAPSULAS form");
      })
    );

    results.push(
      await runTest("listar_apresentacoes: RITALINA → 2 dosagens", async () => {
        const r = await callTool(server, "listar_apresentacoes", { numProcesso: "2599200126855" });
        const sc = r.structuredContent as { apresentacoes: unknown[] };
        if (sc.apresentacoes.length !== 2)
          throw new Error(`expected 2, got ${sc.apresentacoes.length}`);
      })
    );

    results.push(
      await runTest("listar_apresentacoes: RIVOTRIL → formas com 0,5mg e 2mg", async () => {
        const r = await callTool(server, "listar_apresentacoes", {
          numProcesso: "25351537388202183",
        });
        const sc = r.structuredContent as { apresentacoes: Array<{ descricao: string }> };
        const has05 = sc.apresentacoes.some((a) => a.descricao.includes("0,5MG"));
        const has2mg = sc.apresentacoes.some((a) => a.descricao.includes("2MG"));
        if (!has05) throw new Error("expected 0,5MG form for Rivotril");
        if (!has2mg) throw new Error("expected 2MG form for Rivotril");
      })
    );
  } finally {
    cleanup();
  }

  printSummary(results, "Tool Integration Tests");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  saveResults(`run-tools-${timestamp}.json`, { timestamp: new Date().toISOString(), results });
  saveResults("run-tools-latest.json", { timestamp: new Date().toISOString(), results });

  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
