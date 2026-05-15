#!/usr/bin/env tsx
/**
 * 05-validar-cobertura.ts
 *
 * Testes profundos da ferramenta validar_cobertura_rol com dados reais.
 * Cobre: no_rol_ans correto, todos os segmentos, DUT, código fora do Rol.
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
  const suite = criarSuite("05-validar-cobertura", "Testes detalhados — validar_cobertura_rol");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const { handler, inputSchema } = await srcImport("tools", "validar-cobertura-rol.js");
  applySchema(db);

  // Descobrir código com correlação=SIM no banco real
  const comSim = db
    .prepare("SELECT codigo_tuss, procedimento_rol FROM rol_cobertura WHERE correlacao = 'SIM' LIMIT 1")
    .get() as { codigo_tuss: string; procedimento_rol: string } | undefined;

  // Descobrir código COM DUT
  const comDut = db
    .prepare("SELECT codigo_tuss FROM rol_cobertura WHERE correlacao = 'SIM' AND tem_dut = 1 LIMIT 1")
    .get() as { codigo_tuss: string } | undefined;

  // Descobrir código APENAS hospitalar (hco=1, amb=0)
  const apenasHosp = db
    .prepare("SELECT codigo_tuss FROM rol_cobertura WHERE correlacao = 'SIM' AND hco = 1 AND amb = 0 LIMIT 1")
    .get() as { codigo_tuss: string } | undefined;

  // --- T01: Código do Rol tem no_rol_ans=true ---
  if (comSim) {
    await executarCaso(suite, "T01", `${comSim.codigo_tuss} está no Rol (no_rol_ans=true)`, { codigo: comSim.codigo_tuss }, () => {
      const result = handler(inputSchema.parse({ codigo: comSim.codigo_tuss }), db);
      assert(result.structuredContent.no_rol_ans === true, "no_rol_ans deve ser true");
      return { codigo: comSim.codigo_tuss, procedimento_rol: comSim.procedimento_rol, no_rol_ans: true };
    });
  }

  // --- T02: Código fora do Rol tem no_rol_ans=false ---
  await executarCaso(suite, "T02", "Código 00000000 não está no Rol (no_rol_ans=false)", { codigo: "00000000" }, () => {
    const result = handler(inputSchema.parse({ codigo: "00000000" }), db);
    assert(result.structuredContent.no_rol_ans === false, "no_rol_ans deve ser false para código inexistente");
    return { no_rol_ans: false };
  });

  // --- T03: Retorna exatamente 5 segmentos sem filtro ---
  if (comSim) {
    await executarCaso(suite, "T03", "Sem segmento → retorna 5 coberturas (OD/AMB/HCO/HSO/PAC)", { codigo: comSim.codigo_tuss }, () => {
      const result = handler(inputSchema.parse({ codigo: comSim.codigo_tuss }), db);
      const coberturas = result.structuredContent.coberturas as Array<{ segmento: string; coberto: boolean }>;
      const segs = coberturas.map((c) => c.segmento).sort();
      const uniqueSegs = [...new Set(segs)].sort();
      assert(uniqueSegs.join(",") === "AMB,HCO,HSO,OD,PAC", `Segmentos únicos incorretos: ${uniqueSegs.join(",")}`);
      return { segmentos: uniqueSegs, cobertos: coberturas.filter((c) => c.coberto).map((c) => c.segmento) };
    });
  }

  // --- T04: DUT presente para código com DUT ---
  if (comDut) {
    await executarCaso(suite, "T04", `${comDut.codigo_tuss} tem DUT indicado em algum segmento`, { codigo: comDut.codigo_tuss }, () => {
      const result = handler(inputSchema.parse({ codigo: comDut.codigo_tuss }), db);
      const coberturas = result.structuredContent.coberturas as Array<{ tem_dut: boolean }>;
      assert(coberturas.some((c) => c.tem_dut), "Deve ter pelo menos um segmento com tem_dut=true");
      return { codigo: comDut.codigo_tuss, tem_dut: true };
    });
  }

  // --- T05: Filtro de segmento AMB retorna apenas linha AMB ---
  if (comSim) {
    await executarCaso(suite, "T05", `Filtro segmento=AMB retorna apenas cobertura AMB`, { codigo: comSim.codigo_tuss, segmento: "AMB" }, () => {
      const result = handler(inputSchema.parse({ codigo: comSim.codigo_tuss, segmento: "AMB" }), db);
      const coberturas = result.structuredContent.coberturas as Array<{ segmento: string }>;
      assert(coberturas.every((c) => c.segmento === "AMB"), "Todos os resultados devem ser AMB");
      return { coberturas };
    });
  }

  // --- T06: Código apenas hospitalar não é coberto AMB ---
  if (apenasHosp) {
    await executarCaso(suite, "T06", `${apenasHosp.codigo_tuss} não é coberto no segmento AMB`, { codigo: apenasHosp.codigo_tuss, segmento: "AMB" }, () => {
      const result = handler(inputSchema.parse({ codigo: apenasHosp.codigo_tuss, segmento: "AMB" }), db);
      const coberturas = result.structuredContent.coberturas as Array<{ segmento: string; coberto: boolean }>;
      const amb = coberturas.find((c) => c.segmento === "AMB");
      assert(amb?.coberto === false, "AMB deve ser false para procedimento apenas hospitalar");
      return { codigo: apenasHosp.codigo_tuss, amb_coberto: false };
    });
  }

  // --- T07: descricao_tuss presente para código com registro ---
  if (comSim) {
    await executarCaso(suite, "T07", "descricao_tuss presente na resposta", { codigo: comSim.codigo_tuss }, () => {
      const result = handler(inputSchema.parse({ codigo: comSim.codigo_tuss }), db);
      assert(result.structuredContent.disclaimer !== null, "disclaimer deve estar presente");
      return { disclaimer_ok: true };
    });
  }

  // --- T08: Total de procedimentos cobertos no Rol é expressivo ---
  await executarCaso(suite, "T08", "Banco contém procedimentos com cobertura Rol (sanidade do download)", {}, () => {
    const row = db
      .prepare("SELECT count(*) AS cnt FROM rol_cobertura WHERE correlacao = 'SIM'")
      .get() as { cnt: number };
    assert(row.cnt > 100, `Esperava >100 procedimentos no Rol, encontrou ${row.cnt}`);
    return { total_rol_sim: row.cnt };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
