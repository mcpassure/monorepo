#!/usr/bin/env tsx
/**
 * 08-cobertura-obrigatoria.ts
 *
 * Testes profundos da ferramenta listar_procedimentos_com_cobertura_obrigatoria.
 * Valida: total expressivo, filtros de segmento, com/sem DUT, estrutura dos resultados.
 */
import path from "path";
import { fileURLToPath } from "url";
import { openIntegrationDb, dbHasData, srcImport } from "./lib/db.js";
import {
  criarSuite,
  executarCaso,
  assert,
  salvarSuite,
  imprimirResumo,
  type SuiteResult,
} from "./lib/reporter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function run(): Promise<SuiteResult> {
  const suite = criarSuite("08-cobertura-obrigatoria", "Testes detalhados — listar_procedimentos_com_cobertura_obrigatoria");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const { handler, inputSchema } = await srcImport("tools", "listar-cobertura-obrigatoria.js");
  applySchema(db);

  // --- T01: Total de procedimentos obrigatórios é expressivo ---
  await executarCaso(suite, "T01", "Há mais de 100 procedimentos com cobertura obrigatória (correlação=SIM)", {}, () => {
    const input = inputSchema.parse({});
    const result = handler(input, db);
    assert(result.structuredContent.total > 100, `Esperava >100, encontrou ${result.structuredContent.total}`);
    return { total_obrigatorio: result.structuredContent.total };
  });

  // --- T02: Filtro segmento HCO ---
  await executarCaso(suite, "T02", "Filtro segmento=HCO retorna cobertura hospitalar com obstetrícia", { segmento: "HCO" }, () => {
    const input = inputSchema.parse({ segmento: "HCO" });
    const result = handler(input, db);
    assert(result.structuredContent.total > 0, "deve haver procedimentos no segmento HCO");
    const resultados = result.structuredContent.resultados as Array<{
      coberturas: Array<{ segmento: string; coberto: boolean }>;
    }>;
    for (const r of resultados) {
      const hco = r.coberturas.find((c) => c.segmento === "HCO");
      assert(hco?.coberto === true, "todos os resultados devem ter HCO=true");
    }
    return { total_hco: result.structuredContent.total };
  });

  // --- T03: Filtro com_dut=true ---
  await executarCaso(suite, "T03", "com_dut=true retorna apenas procedimentos com DUT", { com_dut: true }, () => {
    const input = inputSchema.parse({ com_dut: true });
    const result = handler(input, db);
    const resultados = result.structuredContent.resultados as Array<{ coberturas: Array<{ tem_dut: boolean }> }>;
    if (result.structuredContent.total > 0) {
      assert(resultados.every((r) => r.coberturas.some((c) => c.tem_dut)), "todos devem ter tem_dut=true em algum segmento");
    }
    return { total_com_dut: result.structuredContent.total };
  });

  // --- T04: Filtro com_dut=false ---
  await executarCaso(suite, "T04", "com_dut=false retorna apenas procedimentos sem DUT", { com_dut: false }, () => {
    const input = inputSchema.parse({ com_dut: false });
    const result = handler(input, db);
    const resultados = result.structuredContent.resultados as Array<{ coberturas: Array<{ tem_dut: boolean }> }>;
    if (result.structuredContent.total > 0) {
      assert(resultados.every((r) => r.coberturas.every((c) => !c.tem_dut)), "todos devem ter tem_dut=false em todos os segmentos");
    }
    return { total_sem_dut: result.structuredContent.total };
  });

  // --- T05: Paginação divide corretamente ---
  await executarCaso(suite, "T05", "Paginação — páginas não se sobrepõem", {}, () => {
    const p1 = handler(inputSchema.parse({ por_pagina: 10, pagina: 1 }), db);
    const p2 = handler(inputSchema.parse({ por_pagina: 10, pagina: 2 }), db);
    const ids1 = (p1.structuredContent.resultados as Array<{ codigo_tuss: string }>).map((r) => r.codigo_tuss);
    const ids2 = (p2.structuredContent.resultados as Array<{ codigo_tuss: string }>).map((r) => r.codigo_tuss);
    const overlap = ids1.filter((id) => ids2.includes(id));
    if (p1.structuredContent.total > 10) {
      assert(overlap.length === 0, "páginas não devem se sobrepor");
    }
    return { total: p1.structuredContent.total, pagina_1_count: ids1.length, pagina_2_count: ids2.length };
  });

  // --- T06: Resultados têm estrutura completa ---
  await executarCaso(suite, "T06", "Resultados têm campos obrigatórios", {}, () => {
    const input = inputSchema.parse({ por_pagina: 5 });
    const result = handler(input, db);
    const resultados = result.structuredContent.resultados as Array<Record<string, unknown>>;
    if (resultados.length > 0) {
      const r = resultados[0];
      assert("codigo_tuss" in r, "deve ter codigo_tuss");
      assert("coberturas" in r, "deve ter coberturas");
      assert(Array.isArray(r.coberturas), "coberturas deve ser array");
    }
    return { total: result.structuredContent.total, campos: Object.keys(resultados[0] ?? {}) };
  });

  // --- T07: Segmentos AMB e HCO têm volumes expressivos ---
  await executarCaso(suite, "T07", "Segmentos AMB e HCO têm volumes expressivos no banco real", {}, () => {
    const amb = db.prepare("SELECT count(*) AS cnt FROM rol_cobertura WHERE correlacao='SIM' AND amb=1").get() as { cnt: number };
    const hco = db.prepare("SELECT count(*) AS cnt FROM rol_cobertura WHERE correlacao='SIM' AND hco=1").get() as { cnt: number };
    assert(amb.cnt > 50, `AMB: esperava >50, encontrou ${amb.cnt}`);
    assert(hco.cnt > 50, `HCO: esperava >50, encontrou ${hco.cnt}`);
    return { total_amb: amb.cnt, total_hco: hco.cnt };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
