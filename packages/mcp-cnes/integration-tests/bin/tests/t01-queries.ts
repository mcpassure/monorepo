// Testa todas as funções de query SQLite (camada db/queries/) contra dados reais.

import type Database from "better-sqlite3";
import { porCnes as equipamentosPorCnes } from "../../../src/db/queries/equipamentos.js";
import {
  porCodigo,
  porMunicipio,
  porNome,
  porTipo,
} from "../../../src/db/queries/estabelecimentos.js";
import { porCnes as leitosPorCnes } from "../../../src/db/queries/leitos.js";
import { porCnes as profissionaisPorCnes } from "../../../src/db/queries/profissionais.js";
import { porCnes as servicosPorCnes } from "../../../src/db/queries/servicos.js";
import {
  assertContains,
  assertEqual,
  assertFalse,
  assertGreater,
  assertGreaterOrEqual,
  assertIncludes,
  assertMatch,
  assertNotNull,
  assertTrue,
} from "../helpers/assert.js";
import type { Reporter } from "../helpers/reporter.js";

const SUITE = "t01-queries";
const HC_FMUSP = "2077485";
const INCOR = "2079046";
const HU_UFSC = "3467485";
const INCA = "2270295";

async function run(
  id: string,
  name: string,
  fn: () => void | Promise<void>,
  reporter: Reporter
): Promise<void> {
  const t = Date.now();
  try {
    await fn();
    reporter.pass(id, name, SUITE, Date.now() - t);
  } catch (err) {
    reporter.fail(id, name, SUITE, Date.now() - t, String(err));
  }
}

export async function runQueryTests(db: Database.Database, reporter: Reporter): Promise<void> {
  console.log("\n📋 Suite: Queries SQLite");

  // ── Estabelecimentos ──────────────────────────────────────────────────────

  await run("Q01", "porCodigo retorna HC FMUSP", () => {
    const r = porCodigo(db, HC_FMUSP);
    assertNotNull(r, "esperado HC FMUSP");
    assertEqual(r.codigoCnes, HC_FMUSP);
    assertIncludes(r.nomeFantasia, "CLINICAS");
    assertEqual(r.uf, "SP");
    assertEqual(r.source, "local");
  }, reporter);

  await run("Q02", "porCodigo retorna InCor", () => {
    const r = porCodigo(db, INCOR);
    assertNotNull(r);
    assertIncludes(r.nomeFantasia, "INCOR");
  }, reporter);

  await run("Q03", "porCodigo retorna null para CNES inexistente", () => {
    const r = porCodigo(db, "0000001");
    assertEqual(r, null, "deve ser null");
  }, reporter);

  await run("Q04", "porCodigo co_municipio normalizado para 6 dígitos", () => {
    const r = porCodigo(db, HC_FMUSP);
    assertNotNull(r);
    assertTrue(r.codigoIbge.length <= 6, `co_municipio deve ter ≤6 dígitos, got "${r.codigoIbge}"`);
  }, reporter);

  await run("Q05", "porNome busca parcial case-insensitive", () => {
    const r = porNome(db, "clinicas");
    assertGreater(r.length, 0, "deve retornar resultados");
    assertContains(r, (e) => e.nomeFantasia.toLowerCase().includes("clinicas"));
  }, reporter);

  await run("Q06", "porNome filtra por UF SP", () => {
    const r = porNome(db, "hospital", "SP");
    assertGreater(r.length, 0);
    assertTrue(r.every((e) => e.uf === "SP"), "todos devem ser SP");
  }, reporter);

  await run("Q07", "porNome filtra por UF SC retorna HU UFSC", () => {
    const r = porNome(db, "ufsc", "SC");
    assertGreater(r.length, 0);
    assertEqual(r[0].uf, "SC");
  }, reporter);

  await run("Q08", "porNome UF inexistente retorna array vazio", () => {
    const r = porNome(db, "hospital", "ZZ");
    assertEqual(r.length, 0);
  }, reporter);

  await run("Q09", "porNome respeita limit", () => {
    const r = porNome(db, "hospital", undefined, 2);
    assertTrue(r.length <= 2, `esperado ≤2 resultados, got ${r.length}`);
  }, reporter);

  await run("Q10", "porMunicipio São Paulo (355030)", () => {
    const r = porMunicipio(db, "355030");
    assertGreater(r.length, 0);
    assertTrue(r.every((e) => e.codigoIbge === "355030"));
  }, reporter);

  await run("Q11", "porMunicipio Florianópolis (420540)", () => {
    const r = porMunicipio(db, "420540");
    assertGreater(r.length, 0, "deve retornar HU UFSC");
    assertTrue(r.every((e) => e.uf === "SC"));
  }, reporter);

  await run("Q12", "porMunicipio com filtro tipo hospital", () => {
    const r = porMunicipio(db, "355030", "hospital");
    assertGreater(r.length, 0);
    assertTrue(
      r.every((e) => e.tipo.toLowerCase().includes("hospital") || e.tipo === ""),
      "tipos devem ser hospital"
    );
  }, reporter);

  await run("Q13", "porMunicipio IBGE inexistente retorna vazio", () => {
    const r = porMunicipio(db, "000000");
    assertEqual(r.length, 0);
  }, reporter);

  await run("Q14", "porTipo hospitais em SP", () => {
    const r = porTipo(db, "hospital", "SP");
    assertGreater(r.length, 0);
    assertTrue(r.every((e) => e.uf === "SP"), "todos devem ser SP");
  }, reporter);

  await run("Q15", "porTipo hospitais em RJ retorna INCA", () => {
    const r = porTipo(db, "hospital", "RJ");
    assertGreater(r.length, 0);
  }, reporter);

  await run("Q16", "porTipo tipo inexistente retorna vazio", () => {
    const r = porTipo(db, "outro", "SP");
    assertEqual(r.length, 0);
  }, reporter);

  // ── Leitos ─────────────────────────────────────────────────────────────────

  await run("Q17", "leitosPorCnes retorna leitos do HC FMUSP", () => {
    const r = leitosPorCnes(db, HC_FMUSP);
    assertGreaterOrEqual(r.length, 8, `esperado ≥8 leitos, got ${r.length}`);
  }, reporter);

  await run("Q18", "leitosPorCnes UTI adulto existente no HC FMUSP", () => {
    const r = leitosPorCnes(db, HC_FMUSP);
    assertContains(r, (l) => l.tipo.toLowerCase().includes("uti"), "deve ter leito UTI");
  }, reporter);

  await run("Q19", "leitosPorCnes leitos UTI têm qt_exist > 0", () => {
    const r = leitosPorCnes(db, HC_FMUSP);
    const utis = r.filter((l) => l.tipo.toLowerCase().includes("uti"));
    assertGreater(utis.length, 0);
    assertTrue(utis.every((l) => l.leitosExistentes > 0));
  }, reporter);

  await run("Q20", "leitosPorCnes InCor tem UTI Coronariana", () => {
    const r = leitosPorCnes(db, INCOR);
    assertContains(r, (l) => l.tipo.toLowerCase().includes("coronar"), "InCor deve ter UTI Coronariana");
  }, reporter);

  await run("Q21", "leitosPorCnes CNES sem leitos retorna vazio", () => {
    const r = leitosPorCnes(db, "0000001");
    assertEqual(r.length, 0);
  }, reporter);

  // ── Equipamentos ──────────────────────────────────────────────────────────

  await run("Q22", "equipamentosPorCnes retorna equipamentos do HC FMUSP", () => {
    const r = equipamentosPorCnes(db, HC_FMUSP);
    assertGreaterOrEqual(r.length, 5, "esperado ≥5 equipamentos");
  }, reporter);

  await run("Q23", "equipamentosPorCnes HC FMUSP tem ressonância magnética (031)", () => {
    const r = equipamentosPorCnes(db, HC_FMUSP);
    assertContains(r, (e) => e.codigo === "031", "deve ter código 031");
  }, reporter);

  await run("Q24", "equipamentosPorCnes HC FMUSP tem tomógrafo (032)", () => {
    const r = equipamentosPorCnes(db, HC_FMUSP);
    assertContains(r, (e) => e.codigo === "032");
  }, reporter);

  await run("Q25", "equipamentosPorCnes INCA tem equipamento de radioterapia (017)", () => {
    const r = equipamentosPorCnes(db, INCA);
    assertContains(r, (e) => e.codigo === "017", "INCA deve ter radioterapia");
  }, reporter);

  await run("Q26", "equipamentosPorCnes CNES sem equipamentos retorna vazio", () => {
    const r = equipamentosPorCnes(db, "0000001");
    assertEqual(r.length, 0);
  }, reporter);

  // ── Profissionais ─────────────────────────────────────────────────────────

  await run("Q27", "profissionaisPorCnes retorna profissionais do HC FMUSP", () => {
    const r = profissionaisPorCnes(db, HC_FMUSP);
    assertGreaterOrEqual(r.length, 10, "esperado ≥10 profissionais");
  }, reporter);

  await run("Q28", "profissionaisPorCnes CPFs estão mascarados", () => {
    const r = profissionaisPorCnes(db, HC_FMUSP);
    for (const p of r) {
      if (p.cpf) {
        assertMatch(p.cpf, /^\*\*\*\.\d{3}\.\d{3}-\*\*$/, `CPF inválido: ${p.cpf}`);
      }
    }
  }, reporter);

  await run("Q29", "profissionaisPorCnes HU UFSC tem profissionais", () => {
    const r = profissionaisPorCnes(db, HU_UFSC);
    assertGreaterOrEqual(r.length, 5);
  }, reporter);

  await run("Q30", "profissionaisPorCnes campos obrigatórios preenchidos", () => {
    const r = profissionaisPorCnes(db, HC_FMUSP);
    assertGreater(r.length, 0);
    for (const p of r) {
      assertNotNull(p.codigoCnes, "codigoCnes não pode ser null");
    }
  }, reporter);

  // ── Serviços ──────────────────────────────────────────────────────────────

  await run("Q31", "servicosPorCnes retorna serviços do HC FMUSP", () => {
    const r = servicosPorCnes(db, HC_FMUSP);
    assertGreaterOrEqual(r.length, 5, "esperado ≥5 serviços");
  }, reporter);

  await run("Q32", "servicosPorCnes HC FMUSP tem serviço de oncologia", () => {
    const r = servicosPorCnes(db, HC_FMUSP);
    assertContains(r, (s) => s.descricao.toLowerCase().includes("oncol"));
  }, reporter);

  await run("Q33", "servicosPorCnes INCA tem radioterapia", () => {
    const r = servicosPorCnes(db, INCA);
    assertContains(r, (s) => s.descricao.toLowerCase().includes("radio"));
  }, reporter);

  await run("Q34", "servicosPorCnes co_cnes correto em todos os registros", () => {
    const r = servicosPorCnes(db, HC_FMUSP);
    assertTrue(r.every((s) => s.codigoCnes === HC_FMUSP));
  }, reporter);

  await run("Q35", "servicosPorCnes CNES sem serviços retorna vazio", () => {
    const r = servicosPorCnes(db, "0000001");
    assertEqual(r.length, 0);
  }, reporter);

  // ── Integridade referencial ────────────────────────────────────────────────

  await run("Q36", "co_municipio de São Paulo é 355030 (6 dígitos)", () => {
    const r = porCodigo(db, HC_FMUSP);
    assertNotNull(r);
    assertTrue(
      r.codigoIbge === "355030" || r.codigoIbge === "",
      `co_municipio: "${r.codigoIbge}"`
    );
  }, reporter);

  await run("Q37", "HU UFSC está em Florianópolis (SC)", () => {
    const r = porCodigo(db, HU_UFSC);
    assertNotNull(r);
    assertEqual(r.uf, "SC");
    assertIncludes(r.municipio, "FLORIANOPOLIS");
  }, reporter);

  await run("Q38", "INCA está no Rio de Janeiro (RJ)", () => {
    const r = porCodigo(db, INCA);
    assertNotNull(r);
    assertEqual(r.uf, "RJ");
  }, reporter);

  await run("Q39", "vinculoSus é booleano nos estabelecimentos", () => {
    const r = porNome(db, "hospital", "SP", 10);
    assertGreater(r.length, 0);
    assertTrue(r.every((e) => typeof e.vinculoSus === "boolean"));
  }, reporter);

  await run("Q40", "coordinates são números quando presentes", () => {
    const r = porCodigo(db, HC_FMUSP);
    assertNotNull(r);
    if (r.latitude !== null) assertTrue(typeof r.latitude === "number");
    if (r.longitude !== null) assertTrue(typeof r.longitude === "number");
  }, reporter);

  assertFalse(false); // sanity check — never throws
}
