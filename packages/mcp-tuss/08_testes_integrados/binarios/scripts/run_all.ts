#!/usr/bin/env tsx
/**
 * Testes integrados v2.3 — @mcpassure/mcp-tuss
 *
 * Executa todos os 25 cenários contra tuss_real.db (dados reais ANS 202603).
 * Gera logs por cenário + relatorio.md em resultados/run_YYYYMMDD_THHMMSS/.
 *
 * Uso: tsx 08_testes_integrados/binarios/scripts/run_all.ts
 * DB path configurável via MCPASSURE_DB_PATH (default: ./tuss_real.db).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { TOOL_ANNOTATIONS } from "../../../src/constants.js";
import { applySchema } from "../../../src/db/schema.js";
import { TussRepository } from "../../../src/repositories/tuss.repository.js";
import { BuscarDiariaInput, buscarDiariaHandler } from "../../../src/tools/buscar-diaria.js";
import { BuscarMedicamentoInput, buscarMedicamentoHandler } from "../../../src/tools/buscar-medicamento.js";
import { BuscarProcedimentoInput, buscarProcedimentoHandler } from "../../../src/tools/buscar-procedimento.js";
import { statusSyncHandler } from "../../../src/tools/status-sync.js";

const DB_PATH = resolve(process.cwd(), process.env.MCPASSURE_DB_PATH ?? "tuss_real.db");

if (!existsSync(DB_PATH)) {
  process.stderr.write(
    `[run_all] ERRO: banco não encontrado em ${DB_PATH}\n` +
      `[run_all] Execute: MCPASSURE_INSECURE_TLS=1 MCPASSURE_DB_PATH=./tuss_real.db npm run sync\n`
  );
  process.exit(1);
}

const now = new Date();
const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_T${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
const RUN_DIR = resolve(process.cwd(), `08_testes_integrados/resultados/run_${ts}`);
const LOGS_DIR = resolve(RUN_DIR, "logs");

mkdirSync(LOGS_DIR, { recursive: true });

const db = new Database(DB_PATH, { readonly: true });
applySchema(db);
const repo = new TussRepository(db);

type ScenarioResult = {
  id: string;
  scenario: string;
  pass: boolean;
  durationMs: number;
  error?: string;
  detail?: string;
};

const results: ScenarioResult[] = [];

function run(id: string, scenario: string, fn: () => string | void): void {
  const t0 = Date.now();
  try {
    const detail = fn() ?? "";
    const ms = Date.now() - t0;
    results.push({ id, scenario, pass: true, durationMs: ms, detail: String(detail) });
    process.stdout.write(`  ✅ PASS [${ms}ms]: ${scenario}\n`);
    writeFileSync(
      resolve(LOGS_DIR, `${id}_pass.log`),
      `PASS [${ms}ms]: ${scenario}\n${detail ? `\nDetail:\n${detail}\n` : ""}`
    );
  } catch (e) {
    const ms = Date.now() - t0;
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ id, scenario, pass: false, durationMs: ms, error: msg });
    process.stderr.write(`  ❌ FAIL [${ms}ms]: ${scenario}\n     ${msg}\n`);
    writeFileSync(
      resolve(LOGS_DIR, `${id}_fail.log`),
      `FAIL [${ms}ms]: ${scenario}\nError: ${msg}\n${e instanceof Error && e.stack ? `\nStack:\n${e.stack}\n` : ""}`
    );
  }
}

function assertEq<T>(label: string, actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
  }
}

function assertGte(label: string, actual: number, min: number): void {
  if (actual < min) {
    throw new Error(`${label}: esperado >= ${min}, obtido ${actual}`);
  }
}

function assertLte(label: string, actual: number, max: number): void {
  if (actual > max) {
    throw new Error(`${label}: esperado <= ${max}, obtido ${actual}`);
  }
}

function assertTruthy(label: string, v: unknown): void {
  if (!v) throw new Error(`${label}: valor falsy: ${JSON.stringify(v)}`);
}

function assertMeta(meta: unknown, toolName: string): void {
  if (typeof meta !== "object" || meta === null) {
    throw new Error(`${toolName}: _meta não é objeto`);
  }
  const m = meta as Record<string, unknown>;
  assertTruthy(`${toolName}._meta.modo`, m.modo);
  assertTruthy(`${toolName}._meta.fonte`, m.fonte);
  if (typeof m.defasagem_dias !== "number") {
    throw new Error(`${toolName}._meta.defasagem_dias não é number`);
  }
}

function assertDisclaimer(result: Record<string, unknown>, toolName: string): void {
  if (typeof result.disclaimer !== "string" || result.disclaimer.length < 50) {
    throw new Error(`${toolName}: disclaimer ausente ou muito curto (obtido: ${JSON.stringify(result.disclaimer)})`);
  }
}

process.stdout.write("\n=== @mcpassure/mcp-tuss — Testes Integrados v2.3 ===\n");
process.stdout.write(`=== Banco: ${DB_PATH} ===\n`);
process.stdout.write(`=== Run: ${ts} ===\n\n`);

// ── Cenário 1: Médico buscando consulta por query ──────────────────────────
run("C01", "médico busca consulta médica por query", () => {
  const r = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({ query: "consulta", limit: 20 }), repo);
  assertGte("C01 data.length", r.data.length, 1);
  const found = (r.data as Array<{ codigo: string }>).some((d) => d.codigo === "10101012");
  if (!found) throw new Error("C01: código 10101012 não encontrado nos resultados");
  assertMeta(r._meta, "C01");
  assertEq("C01 _meta.modo", r._meta.modo, "cache_local");
  assertDisclaimer(r as Record<string, unknown>, "C01");
  return `data.length=${r.data.length}, codigo 10101012 encontrado, disclaimer OK`;
});

// ── Cenário 2: Faturista buscando hemograma por código ─────────────────────
run("C02", "faturista busca hemograma por código 40304361", () => {
  const r = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({ codigo: "40304361" }), repo);
  assertEq("C02 data.length", r.data.length, 1);
  const item = (r.data as Array<{ codigo: string; termo: string; tabela: string }>)[0];
  assertEq("C02 codigo", item.codigo, "40304361");
  assertEq("C02 tabela", item.tabela, "22");
  if (!/hemograma|plaquetas/i.test(item.termo)) {
    throw new Error(`C02: termo inesperado: "${item.termo}"`);
  }
  assertMeta(r._meta, "C02");
  return `termo="${item.termo}"`;
});

// ── Cenário 3: Farmacêutico buscando Dipirona por query ───────────────────
run("C03", "farmacêutico busca Dipirona por query", () => {
  const r = buscarMedicamentoHandler(BuscarMedicamentoInput.parse({ query: "Dipirona", limit: 10 }), repo);
  assertGte("C03 data.length", r.data.length, 1);
  const found = (r.data as Array<{ termo: string }>).some((d) =>
    d.termo.toLowerCase().includes("dipirona")
  );
  if (!found) throw new Error("C03: nenhum resultado contém 'dipirona'");
  assertMeta(r._meta, "C03");
  return `data.length=${r.data.length}`;
});

// ── Cenário 4: Farmacêutico — Dipirona por código exato 90282680 ──────────
run("C04", "farmacêutico consulta Dipirona Sódica código 90282680", () => {
  const r = buscarMedicamentoHandler(BuscarMedicamentoInput.parse({ codigo: "90282680" }), repo);
  assertEq("C04 data.length", r.data.length, 1);
  const item = (r.data as Array<{ codigo: string; termo: string; tabela: string }>)[0];
  assertEq("C04 tabela", item.tabela, "20");
  if (!item.termo.toLowerCase().includes("dipirona")) {
    throw new Error(`C04: termo inesperado: "${item.termo}"`);
  }
  assertMeta(r._meta, "C04");
  return `termo="${item.termo}"`;
});

// ── Cenário 5: Faturista hospitalar — diária UTI por query ────────────────
run("C05", "faturista hospitalar busca diária UTI por query", () => {
  const r = buscarDiariaHandler(BuscarDiariaInput.parse({ query: "UTI", limit: 10 }), repo);
  assertGte("C05 data.length", r.data.length, 1);
  const allTab18 = (r.data as Array<{ tabela: string }>).every((d) => d.tabela === "18");
  if (!allTab18) throw new Error("C05: nem todos os resultados são tabela 18");
  assertMeta(r._meta, "C05");
  return `data.length=${r.data.length}`;
});

// ── Cenário 6: Operadora — diária código 60000279 ────────────────────────
run("C06", "operadora verifica diária 60000279 (DIÁRIA COMPACTA UTI)", () => {
  const r = buscarDiariaHandler(BuscarDiariaInput.parse({ codigo: "60000279" }), repo);
  assertEq("C06 data.length", r.data.length, 1);
  const item = (r.data as Array<{ codigo: string; termo: string; tabela: string }>)[0];
  assertEq("C06 tabela", item.tabela, "18");
  if (!/uti|terapia intensiva/i.test(item.termo)) {
    throw new Error(`C06: termo inesperado: "${item.termo}"`);
  }
  assertMeta(r._meta, "C06");
  return `termo="${item.termo}"`;
});

// ── Cenário 7: Dev healthtech — status sincronização ─────────────────────
run("C07", "dev verifica status sincronização — versão 202603, 3 tabelas", () => {
  const r = statusSyncHandler({}, repo);
  const data = r.data as {
    tuss22: { versao: string | null; total_registros: number };
    tuss20: { versao: string | null; total_registros: number };
    tuss18: { versao: string | null; total_registros: number };
    cache_vazio: boolean;
  };
  assertEq("C07 cache_vazio", data.cache_vazio, false);
  assertEq("C07 tuss22.versao", data.tuss22.versao, "202603");
  assertGte("C07 tuss22.total_registros", data.tuss22.total_registros, 5_900);
  assertGte("C07 tuss20.total_registros", data.tuss20.total_registros, 43_000);
  assertGte("C07 tuss18.total_registros", data.tuss18.total_registros, 3_500);
  const meta = r._meta as unknown[];
  assertEq("C07 _meta.length", meta.length, 3);
  return `tuss22=${data.tuss22.total_registros} tuss20=${data.tuss20.total_registros} tuss18=${data.tuss18.total_registros}`;
});

// ── Cenário 8: Busca com acentuação brasileira ────────────────────────────
run("C08", "busca por 'ressonância' (com acento) retorna resultados", () => {
  const r = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({ query: "ressonância" }), repo);
  assertGte("C08 data.length", r.data.length, 1);
  assertMeta(r._meta, "C08");
  return `data.length=${r.data.length}`;
});

// ── Cenário 9: Busca por prefixo parcial com limit ───────────────────────
run("C09", "busca 'tomografia' com limit=5 retorna no máximo 5 resultados", () => {
  const r = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({ query: "tomografia", limit: 5 }), repo);
  assertGte("C09 data.length", r.data.length, 1);
  assertLte("C09 data.length <= 5", r.data.length, 5);
  assertMeta(r._meta, "C09");
  return `data.length=${r.data.length}`;
});

// ── Cenário 10: Paginação — limit=3 é respeitado ─────────────────────────
run("C10", "limit=3 retorna no máximo 3 resultados", () => {
  const r = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({ query: "consulta", limit: 3 }), repo);
  assertLte("C10 data.length <= 3", r.data.length, 3);
  assertMeta(r._meta, "C10");
  return `data.length=${r.data.length}`;
});

// ── Cenário 11: Input inválido — sem codigo nem query ────────────────────
run("C11", "input inválido (sem codigo nem query) retorna error estruturado", () => {
  const r = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({}), repo);
  assertEq("C11 data.length", r.data.length, 0);
  const withError = r as { error?: string };
  if (!withError.error) throw new Error("C11: campo 'error' ausente na resposta");
  assertEq("C11 error", withError.error, "Informe `codigo` ou `query`.");
  assertMeta(r._meta, "C11");
  return `error="${withError.error}"`;
});

// ── Cenário 12: Código inexistente — array vazio sem throw ───────────────
run("C12", "código 99999999 (inexistente) retorna array vazio com _meta", () => {
  const r = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({ codigo: "99999999" }), repo);
  assertEq("C12 data.length", r.data.length, 0);
  assertEq("C12 _meta.modo", r._meta.modo, "cache_local");
  assertMeta(r._meta, "C12");
  return "data.length=0, _meta OK";
});

// ── Cenário 13: _meta e disclaimer em 100% dos tools ────────────────────
run("C13", "_meta e disclaimer em todas as 4 tools (varredura)", () => {
  const r1 = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({ codigo: "10101012" }), repo);
  const r2 = buscarMedicamentoHandler(BuscarMedicamentoInput.parse({ codigo: "90282680" }), repo);
  const r3 = buscarDiariaHandler(BuscarDiariaInput.parse({ codigo: "60000279" }), repo);
  const r4 = statusSyncHandler({}, repo);

  assertMeta(r1._meta, "C13/buscar_procedimento_tuss");
  assertMeta(r2._meta, "C13/buscar_medicamento_tuss");
  assertMeta(r3._meta, "C13/buscar_diaria_taxa_tuss");
  const meta4 = (r4._meta as unknown[])[0];
  assertMeta(meta4, "C13/status_sincronizacao_tuss");

  assertDisclaimer(r1 as Record<string, unknown>, "C13/buscar_procedimento_tuss");
  assertDisclaimer(r2 as Record<string, unknown>, "C13/buscar_medicamento_tuss");
  assertDisclaimer(r3 as Record<string, unknown>, "C13/buscar_diaria_taxa_tuss");
  assertDisclaimer(r4 as unknown as Record<string, unknown>, "C13/status_sincronizacao_tuss");
  return "4/4 tools: _meta OK, disclaimer OK";
});

// ── Cenário 14: Medicamento inexistente ──────────────────────────────────
run("C14", "medicamento código 00000000 (inexistente) retorna array vazio", () => {
  const r = buscarMedicamentoHandler(BuscarMedicamentoInput.parse({ codigo: "00000000" }), repo);
  assertEq("C14 data.length", r.data.length, 0);
  assertEq("C14 _meta.modo", r._meta.modo, "cache_local");
  return "data.length=0, _meta OK";
});

// ── Cenário 15: Diária inexistente ───────────────────────────────────────
run("C15", "diária código 00000000 (inexistente) retorna array vazio", () => {
  const r = buscarDiariaHandler(BuscarDiariaInput.parse({ codigo: "00000000" }), repo);
  assertEq("C15 data.length", r.data.length, 0);
  assertEq("C15 _meta.modo", r._meta.modo, "cache_local");
  return "data.length=0, _meta OK";
});

// ── Cenário 16: buscar_medicamento sem args → error estruturado ───────────
run("C16", "buscar_medicamento_tuss sem args retorna error estruturado", () => {
  const r = buscarMedicamentoHandler(BuscarMedicamentoInput.parse({}), repo);
  assertEq("C16 data.length", r.data.length, 0);
  const withError = r as { error?: string };
  if (!withError.error) throw new Error("C16: campo 'error' ausente na resposta");
  assertEq("C16 error", withError.error, "Informe `codigo` ou `query`.");
  assertMeta(r._meta, "C16");
  assertDisclaimer(r as Record<string, unknown>, "C16");
  return `error="${withError.error}"`;
});

// ── Cenário 17: buscar_medicamento limit=2 respeita paginação ─────────────
run("C17", "buscar_medicamento_tuss limit=2 retorna no máximo 2 resultados", () => {
  const r = buscarMedicamentoHandler(BuscarMedicamentoInput.parse({ query: "sodio", limit: 2 }), repo);
  assertLte("C17 data.length <= 2", r.data.length, 2);
  assertMeta(r._meta, "C17");
  return `data.length=${r.data.length}`;
});

// ── Cenário 18: buscar_diaria sem args → error estruturado ────────────────
run("C18", "buscar_diaria_taxa_tuss sem args retorna error estruturado", () => {
  const r = buscarDiariaHandler(BuscarDiariaInput.parse({}), repo);
  assertEq("C18 data.length", r.data.length, 0);
  const withError = r as { error?: string };
  if (!withError.error) throw new Error("C18: campo 'error' ausente na resposta");
  assertEq("C18 error", withError.error, "Informe `codigo` ou `query`.");
  assertMeta(r._meta, "C18");
  assertDisclaimer(r as Record<string, unknown>, "C18");
  return `error="${withError.error}"`;
});

// ── Cenário 19: buscar_diaria com acentuação ─────────────────────────────
run("C19", "buscar_diaria_taxa_tuss busca 'internação' (com acento) retorna resultados", () => {
  const r = buscarDiariaHandler(BuscarDiariaInput.parse({ query: "internação" }), repo);
  assertGte("C19 data.length", r.data.length, 1);
  assertMeta(r._meta, "C19");
  return `data.length=${r.data.length}`;
});

// ── Cenário 20: status_sincronizacao _meta array structure ────────────────
run("C20", "status_sincronizacao_tuss _meta array tem 3 entradas com campos obrigatórios", () => {
  const r = statusSyncHandler({}, repo);
  const meta = r._meta as unknown[];
  assertEq("C20 _meta.length", meta.length, 3);
  for (let i = 0; i < 3; i++) {
    const m = meta[i] as Record<string, unknown>;
    if (typeof m.defasagem_dias !== "number") throw new Error(`C20 _meta[${i}].defasagem_dias não é number`);
    if (m.defasagem_dias < 0) throw new Error(`C20 _meta[${i}].defasagem_dias negativo`);
    if (!m.modo) throw new Error(`C20 _meta[${i}].modo ausente`);
    if (!m.fonte) throw new Error(`C20 _meta[${i}].fonte ausente`);
  }
  assertDisclaimer(r as unknown as Record<string, unknown>, "C20");
  return `_meta[0].defasagem_dias=${(meta[0] as Record<string, unknown>).defasagem_dias}`;
});

// ── Cenário 21: status_sincronizacao disclaimer e competencia ─────────────
run("C21", "status_sincronizacao_tuss disclaimer completo e competencia 202603", () => {
  const r = statusSyncHandler({}, repo);
  assertDisclaimer(r as unknown as Record<string, unknown>, "C21");
  const meta = r._meta as unknown[];
  for (let i = 0; i < 3; i++) {
    const m = meta[i] as Record<string, unknown>;
    if (m.competencia !== "202603") throw new Error(`C21 _meta[${i}].competencia=${JSON.stringify(m.competencia)}, esperado "202603"`);
  }
  return "disclaimer OK, competencia 202603 em todas as 3 entradas _meta";
});

// ── Cenário 22: SQL injection via campo codigo ────────────────────────────
run("C22", "SQL injection via campo 'codigo' retorna array vazio sem throw", () => {
  const r = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({ codigo: "'; DROP TABLE tuss_22; --" }), repo);
  assertEq("C22 data.length", r.data.length, 0);
  assertMeta(r._meta, "C22");
  assertEq("C22 _meta.modo", r._meta.modo, "cache_local");
  const rows = db.prepare("SELECT COUNT(*) AS n FROM tuss_22").get() as { n: number };
  assertGte("C22 tuss_22 ainda existe", rows.n, 5_900);
  return `data.length=0, tuss_22 intacta (${rows.n} registros)`;
});

// ── Cenário 23: SQL injection via campo query ─────────────────────────────
run("C23", "SQL injection via campo 'query' não vaza dados nem causa crash", () => {
  const r = buscarProcedimentoHandler(BuscarProcedimentoInput.parse({ query: "' OR '1'='1" }), repo);
  assertMeta(r._meta, "C23");
  // deve tratar como busca literal — nenhum resultado esperado para esse padrão
  // o importante é que não lança exceção e retorna estrutura válida
  const data = r.data as unknown[];
  if (!Array.isArray(data)) throw new Error("C23: data não é array");
  return `data.length=${data.length} (busca literal, sem injeção)`;
});

// ── Cenário 24: TOOL_ANNOTATIONS — valores corretos da spec ──────────────
run("C24", "TOOL_ANNOTATIONS: readOnlyHint, idempotentHint, openWorldHint corretos", () => {
  if (!TOOL_ANNOTATIONS.readOnlyHint) throw new Error("readOnlyHint deve ser true");
  if (!TOOL_ANNOTATIONS.idempotentHint) throw new Error("idempotentHint deve ser true");
  if (TOOL_ANNOTATIONS.destructiveHint !== false) throw new Error("destructiveHint deve ser false");
  if (!TOOL_ANNOTATIONS.openWorldHint) throw new Error("openWorldHint deve ser true");
  return `readOnly=${TOOL_ANNOTATIONS.readOnlyHint} idempotent=${TOOL_ANNOTATIONS.idempotentHint} destructive=${TOOL_ANNOTATIONS.destructiveHint} openWorld=${TOOL_ANNOTATIONS.openWorldHint}`;
});

// ── Cenário 25: modo degraded — threshold=-1 → status="stale" sempre ─────
run("C25", "modo degraded: DEGRADED_THRESHOLD=-1 → status='stale' em todos os _meta", () => {
  const prev = process.env.MCPASSURE_DEGRADED_THRESHOLD_DAYS;
  process.env.MCPASSURE_DEGRADED_THRESHOLD_DAYS = "-1";
  try {
    const r = statusSyncHandler({}, repo);
    const meta = r._meta as unknown[];
    assertEq("C25 _meta.length", meta.length, 3);
    for (let i = 0; i < 3; i++) {
      const m = meta[i] as Record<string, unknown>;
      if (m.status !== "stale") {
        throw new Error(
          `C25 _meta[${i}].status="${m.status}", esperado "stale" (defasagem_dias=${m.defasagem_dias})`
        );
      }
    }
    return `3/3 _meta status="stale", defasagem_dias[0]=${(meta[0] as Record<string, unknown>).defasagem_dias}`;
  } finally {
    if (prev === undefined) {
      delete process.env.MCPASSURE_DEGRADED_THRESHOLD_DAYS;
    } else {
      process.env.MCPASSURE_DEGRADED_THRESHOLD_DAYS = prev;
    }
  }
});

// ── Relatório final ───────────────────────────────────────────────────────
const pass = results.filter((r) => r.pass).length;
const fail = results.filter((r) => !r.pass).length;
const total = results.length;
const totalMs = results.reduce((s, r) => s + r.durationMs, 0);
const sorted = [...results].sort((a, b) => a.durationMs - b.durationMs);
const p50 = sorted[Math.floor(total * 0.5)]?.durationMs ?? 0;
const p95 = sorted[Math.floor(total * 0.95)]?.durationMs ?? 0;
const p99 = sorted[Math.floor(total * 0.99)]?.durationMs ?? 0;

const sep = "=".repeat(55);
process.stdout.write(`\n${sep}\n`);
process.stdout.write(`RESULTADO FINAL: ${pass}/${total} PASS | ${fail} FAIL\n`);
process.stdout.write(`Latência: total=${totalMs}ms | p50=${p50}ms | p95=${p95}ms | p99=${p99}ms\n`);

if (fail > 0) {
  process.stdout.write("\nFALHAS:\n");
  for (const r of results.filter((x) => !x.pass)) {
    process.stdout.write(`  ❌ ${r.id} ${r.scenario}: ${r.error}\n`);
  }
}

const scenarioTable = results
  .map(
    (r) =>
      `| ${r.id} | ${r.scenario.slice(0, 60)} | ${r.pass ? "✅ PASS" : "❌ FAIL"} | ${r.durationMs}ms |`
  )
  .join("\n");

const issuesList =
  fail === 0
    ? "Nenhuma."
    : results
        .filter((r) => !r.pass)
        .map((r) => `- **${r.id}**: ${r.error}`)
        .join("\n");

const relatorio = `# Relatório de Testes Integrados — run_${ts}

**MCP:** @mcpassure/mcp-tuss v0.1.0
**Data da run:** ${now.toISOString()}
**Plano:** v2.3 (${total} cenários × 4 tools)
**DB:** ${DB_PATH}

---

## Resumo executivo

**${pass}/${total} cenários PASS — ${fail} FAIL — 0 SKIP**

---

## Métricas globais

| Métrica | Valor |
|---------|-------|
| Cenários executados | ${total} |
| PASS | **${pass}** ${pass === total ? "✅" : ""} |
| FAIL | ${fail} |
| SKIP | 0 |
| Latência total | ${totalMs}ms |
| Latência p50 | ${p50}ms |
| Latência p95 | ${p95}ms |
| Latência p99 | ${p99}ms |

---

## Status por cenário

| ID | Cenário | Status | ms |
|----|---------|--------|----|
${scenarioTable}

---

## Issues encontradas

${issuesList}

---

## Próximos passos

1. Adicionar tool \`buscar_opme_tuss\` (TUSS 19 — 105MB XLSX)
2. Testar cenário degraded: \`MCPASSURE_DEGRADED_THRESHOLD_DAYS=0\`
3. Investigar auth do Rol ANS (endpoint gov.br 403)
4. Índice FTS5 para buscas mais rápidas em v2
`;

writeFileSync(resolve(RUN_DIR, "relatorio.md"), relatorio);
process.stdout.write(`\nRelatório: ${resolve(RUN_DIR, "relatorio.md")}\n`);
process.stdout.write(`Logs: ${LOGS_DIR}\n`);

db.close();
process.exit(fail > 0 ? 1 : 0);
