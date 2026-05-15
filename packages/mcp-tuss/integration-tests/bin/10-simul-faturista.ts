#!/usr/bin/env tsx
/**
 * 10-simul-faturista.ts
 *
 * Simulação de uso: Faturista Hospitalar
 *
 * Persona: Ana Paula, faturista de um hospital terciário em São Paulo.
 * Fluxo real: recebe uma guia TISS com vários códigos TUSS, precisa verificar
 * se cada procedimento está correto, qual a cobertura pelo plano do paciente
 * e se há DUT que exige autorização prévia.
 *
 * Cenários simulados:
 *   1. Verificar código de procedimento antes de faturar
 *   2. Validar cobertura no plano hospitalar com obstetrícia (HCO)
 *   3. Identificar procedimentos com DUT (exige autorização prévia)
 *   4. Buscar código por descrição quando só sabe o nome
 *   5. Verificar versão das tabelas em uso (compliance de versão)
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
  const suite = criarSuite("10-simul-faturista", "Simulação de uso — Faturista Hospitalar (Ana Paula)");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const buscarCodigo = await srcImport("tools", "buscar-por-codigo.js");
  const buscarDesc = await srcImport("tools", "buscar-por-descricao.js");
  const validarRol = await srcImport("tools", "validar-cobertura-rol.js");
  const listarObrig = await srcImport("tools", "listar-cobertura-obrigatoria.js");
  const statusSync = await srcImport("tools", "status-sincronizacao.js");
  applySchema(db);

  // Obter códigos reais do banco para usar na simulação
  const codsRol = db
    .prepare("SELECT codigo_tuss FROM rol_cobertura WHERE correlacao='SIM' AND hco=1 ORDER BY codigo_tuss LIMIT 5")
    .all() as Array<{ codigo_tuss: string }>;
  const codComDut = (db.prepare("SELECT codigo_tuss FROM rol_cobertura WHERE correlacao='SIM' AND tem_dut=1 LIMIT 1").get() as { codigo_tuss: string } | undefined)?.codigo_tuss;

  // ─── Cenário 1: Ana recebe código 10101012 e precisa verificar ───
  await executarCaso(suite, "C1-verificar-codigo", "Faturista verifica código procedimento recebido na guia TISS", { acao: "buscar_tuss_por_codigo" }, () => {
    const codigo = codsRol[0]?.codigo_tuss ?? "10101012";
    const result = buscarCodigo.handler(buscarCodigo.inputSchema.parse({ codigo }), db);

    assert(!result.structuredContent.error, "código deve ser encontrado");
    assert(result.structuredContent.descricao_tuss !== null, "deve ter descrição");
    assert(result.structuredContent.tabela_origem !== null, "deve ter tabela de origem");

    console.log(`\n  [Faturista] Código ${codigo}:`);
    console.log(`    Descrição: ${result.structuredContent.descricao_tuss}`);
    console.log(`    Tabela: ${result.structuredContent.tabela_origem}`);

    return {
      codigo,
      descricao: result.structuredContent.descricao_tuss,
      tabela: result.structuredContent.tabela_origem,
    };
  });

  // ─── Cenário 2: Validar cobertura no plano HCO ───
  await executarCaso(suite, "C2-cobertura-hco", "Faturista valida se procedimento está coberto no plano HCO do paciente", { acao: "validar_cobertura_rol" }, () => {
    const codigo = codsRol[0]?.codigo_tuss ?? "10101012";
    const result = validarRol.handler(validarRol.inputSchema.parse({ codigo, segmento: "HCO" }), db);

    const coberturas = result.structuredContent.coberturas as Array<{ segmento: string; coberto: boolean }>;
    const hco = coberturas.find((c) => c.segmento === "HCO");

    console.log(`\n  [Faturista] Cobertura HCO para ${codigo}:`);
    console.log(`    No Rol ANS: ${result.structuredContent.no_rol_ans}`);
    console.log(`    Coberto HCO: ${hco?.coberto}`);

    return {
      codigo,
      no_rol_ans: result.structuredContent.no_rol_ans,
      hco_coberto: hco?.coberto,
    };
  });

  // ─── Cenário 3: Identificar procedimentos com DUT (autorização prévia) ───
  await executarCaso(suite, "C3-dut-autorizacao", "Faturista lista procedimentos que exigem autorização prévia (DUT)", { acao: "listar_procedimentos_com_cobertura_obrigatoria" }, () => {
    const result = listarObrig.handler(listarObrig.inputSchema.parse({ com_dut: true, por_pagina: 10 }), db);
    const total = result.structuredContent.total;

    console.log(`\n  [Faturista] Procedimentos com DUT (exigem autorização prévia):`);
    console.log(`    Total no Rol: ${total}`);

    const amostra = (result.structuredContent.resultados as Array<{
      codigo_tuss: string;
      procedimento_rol: string | null;
    }>).slice(0, 5);

    for (const p of amostra) {
      console.log(`    • ${p.codigo_tuss} — ${p.procedimento_rol?.substring(0, 50) ?? "N/A"}`);
    }

    assert(total >= 0, "total deve ser ≥ 0");
    return { total_com_dut: total, exemplos: amostra };
  });

  // ─── Cenário 4: Busca por nome quando código não está na guia ───
  await executarCaso(suite, "C4-busca-nome", "Faturista busca código por nome do procedimento", { acao: "buscar_tuss_por_descricao" }, () => {
    const result = buscarDesc.handler(buscarDesc.inputSchema.parse({ texto: "ressonância", tabelas: ["22"] }), db);

    console.log(`\n  [Faturista] Busca por 'ressonância':`);
    console.log(`    Resultados: ${result.structuredContent.total}`);

    const resultados = result.structuredContent.resultados as Array<{ codigo: string; descricao: string }>;
    for (const r of resultados.slice(0, 3)) {
      console.log(`    • ${r.codigo} — ${r.descricao.substring(0, 60)}`);
    }

    assert(result.structuredContent.total >= 0, "total >= 0");
    return { total: result.structuredContent.total, primeiro: resultados[0] };
  });

  // ─── Cenário 5: Verificar versão das tabelas (compliance) ───
  await executarCaso(suite, "C5-versao-compliance", "Faturista verifica versão das tabelas TUSS em uso", { acao: "status_sincronizacao" }, () => {
    const result = statusSync.handler(statusSync.inputSchema.parse({}), db);
    const tabelas = result.structuredContent.tabelas as Array<{ tabela: string; versao: string | null; rn_referencia: string | null }>;

    console.log(`\n  [Faturista] Status das tabelas TUSS:`);
    for (const t of tabelas) {
      console.log(`    • ${t.tabela}: v${t.versao ?? "N/A"}${t.rn_referencia ? ` (${t.rn_referencia})` : ""}`);
    }

    assert(tabelas.length > 0, "deve retornar pelo menos uma tabela");
    return {
      tabelas: tabelas.map((t) => ({ tabela: t.tabela, versao: t.versao })),
    };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
