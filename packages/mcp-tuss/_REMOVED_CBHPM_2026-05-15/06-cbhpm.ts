#!/usr/bin/env tsx
/**
 * 06-cbhpm.ts
 *
 * Testes profundos da ferramenta consultar_hierarquia_cbhpm com dados reais.
 * Valida hierarquia, nota de limitação, capitulos presentes, sem registro.
 */
import path from "path";
import { fileURLToPath } from "url";
import { openIntegrationDb, dbHasData, srcImport } from "./lib/db.js";
import {
  criarSuite,
  executarCaso,
  assert,
  assertIgual,
  salvarSuite,
  imprimirResumo,
  type SuiteResult,
} from "./lib/reporter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function run(): Promise<SuiteResult> {
  const suite = criarSuite("06-cbhpm", "Testes detalhados — consultar_hierarquia_cbhpm");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const { handler, inputSchema, NOTA_LIMITACAO } = await srcImport("tools", "consultar-hierarquia-cbhpm.js");
  const { CBHPM_EDICAO } = await srcImport("constants.js");
  applySchema(db);

  // Código COM hierarquia
  const comHier = db
    .prepare("SELECT codigo_tuss, capitulo, grupo, subgrupo FROM cbhpm_hierarquia WHERE capitulo IS NOT NULL LIMIT 1")
    .get() as { codigo_tuss: string; capitulo: string; grupo: string; subgrupo: string } | undefined;

  // Código SEM hierarquia (tab 22 mas sem entrada em cbhpm_hierarquia)
  const semHier = db
    .prepare(`SELECT p.codigo FROM tuss_procedimentos p
              LEFT JOIN cbhpm_hierarquia h ON h.codigo_tuss = p.codigo
              WHERE h.codigo_tuss IS NULL LIMIT 1`)
    .get() as { codigo: string } | undefined;

  // --- T01: Retorna hierarquia para código com registro ---
  if (comHier) {
    await executarCaso(suite, "T01", `${comHier.codigo_tuss} retorna capitulo='${comHier.capitulo}'`, { codigo: comHier.codigo_tuss }, () => {
      const result = handler(inputSchema.parse({ codigo: comHier.codigo_tuss }), db);
      assertIgual(result.structuredContent.capitulo, comHier.capitulo, "capitulo");
      assertIgual(result.structuredContent.grupo, comHier.grupo, "grupo");
      return { codigo: comHier.codigo_tuss, capitulo: comHier.capitulo, grupo: comHier.grupo };
    });
  }

  // --- T02: nota_limitacao SEMPRE presente (campo mandatório) ---
  if (comHier) {
    await executarCaso(suite, "T02", "nota_limitacao mandatória sobre porte/UCO presente", { codigo: comHier.codigo_tuss }, () => {
      const result = handler(inputSchema.parse({ codigo: comHier.codigo_tuss }), db);
      assertIgual(result.structuredContent.nota_limitacao, NOTA_LIMITACAO, "nota_limitacao");
      assert((result.structuredContent.nota_limitacao as string).toLowerCase().includes("porte anestésico"), "deve mencionar porte anestésico");
      return { nota_limitacao_ok: true };
    });
  }

  // --- T03: cbhpm_edicao correto ---
  if (comHier) {
    await executarCaso(suite, "T03", "cbhpm_edicao = '6ª edição (2022)'", { codigo: comHier.codigo_tuss }, () => {
      const result = handler(inputSchema.parse({ codigo: comHier.codigo_tuss }), db);
      assertIgual(result.structuredContent.cbhpm_edicao, CBHPM_EDICAO, "cbhpm_edicao");
      return { cbhpm_edicao: result.structuredContent.cbhpm_edicao };
    });
  }

  // --- T04: Código sem hierarquia retorna nulls ---
  if (semHier) {
    await executarCaso(suite, "T04", `${semHier.codigo} sem registro CBHPM retorna capitulo=null`, { codigo: semHier.codigo }, () => {
      const result = handler(inputSchema.parse({ codigo: semHier.codigo }), db);
      assert(result.structuredContent.capitulo === null, "capitulo deve ser null");
      assert(result.structuredContent.grupo === null, "grupo deve ser null");
      return { codigo: semHier.codigo, capitulo: null };
    });
  }

  // --- T05: Código inexistente retorna nulls sem exceção ---
  await executarCaso(suite, "T05", "Código inexistente retorna hierarquia nula sem exceção", { codigo: "00000000" }, () => {
    const result = handler(inputSchema.parse({ codigo: "00000000" }), db);
    assert(result.structuredContent.capitulo === null, "capitulo null para inexistente");
    assert(result.structuredContent.descricao_tuss === null, "descricao_tuss null para inexistente");
    return { capitulo: null, descricao_tuss: null };
  });

  // --- T06: Sanidade — banco tem hierarquias carregadas ---
  await executarCaso(suite, "T06", "Banco contém hierarquias CBHPM (sanidade do download)", {}, () => {
    const row = db.prepare("SELECT count(*) AS cnt FROM cbhpm_hierarquia WHERE capitulo IS NOT NULL").get() as { cnt: number };
    assert(row.cnt > 50, `Esperava >50 hierarquias, encontrou ${row.cnt}`);
    return { total_cbhpm: row.cnt };
  });

  // --- T07: Capitulos únicos são diversificados ---
  await executarCaso(suite, "T07", "Há múltiplos capítulos CBHPM distintos", {}, () => {
    const rows = db.prepare("SELECT DISTINCT capitulo FROM cbhpm_hierarquia WHERE capitulo IS NOT NULL").all() as Array<{ capitulo: string }>;
    assert(rows.length >= 3, `Esperava ≥3 capítulos distintos, encontrou ${rows.length}`);
    return { capitulos: rows.map((r) => r.capitulo).slice(0, 10) };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
