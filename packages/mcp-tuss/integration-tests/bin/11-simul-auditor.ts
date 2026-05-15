#!/usr/bin/env tsx
/**
 * 11-simul-auditor.ts
 *
 * Simulação de uso: Auditor Médico de Operadora
 *
 * Persona: Dr. Roberto, auditor médico de uma operadora de saúde.
 * Fluxo real: recebe solicitação de autorização, valida se o procedimento
 * está no Rol ANS, se tem DUT que define critérios de cobertura, e qual
 * a hierarquia CBHPM (para classificar o tipo de procedimento).
 *
 * Cenários simulados:
 *   1. Auditar solicitação de procedimento hospitalar
 *   2. Verificar se DUT se aplica (critérios de autorização)
 *   3. Consultar hierarquia CBHPM para classificação
 *   4. Verificar cobertura por tipo de plano (OD vs AMB vs HCO)
 *   5. Listar todos os procedimentos obrigatórios no segmento HSO
 *   6. Identificar procedimento não coberto (glosa técnica)
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
  const suite = criarSuite("11-simul-auditor", "Simulação de uso — Auditor Médico (Dr. Roberto)");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const buscarCodigo = await srcImport("tools", "buscar-por-codigo.js");
  const validarRol = await srcImport("tools", "validar-cobertura-rol.js");
  const hierarquia = await srcImport("tools", "consultar-hierarquia-cbhpm.js");
  const listarObrig = await srcImport("tools", "listar-cobertura-obrigatoria.js");
  applySchema(db);

  // Códigos para a auditoria
  const codHospital = (db.prepare("SELECT codigo_tuss FROM rol_cobertura WHERE correlacao='SIM' AND hco=1 AND hso=1 LIMIT 1").get() as { codigo_tuss: string } | undefined)?.codigo_tuss;
  const codComDut = (db.prepare("SELECT codigo_tuss FROM rol_cobertura WHERE correlacao='SIM' AND tem_dut=1 LIMIT 1").get() as { codigo_tuss: string } | undefined)?.codigo_tuss;
  const codComCbhpm = (db.prepare("SELECT codigo_tuss FROM cbhpm_hierarquia WHERE capitulo IS NOT NULL LIMIT 1").get() as { codigo_tuss: string } | undefined)?.codigo_tuss;
  const codSoOD = (db.prepare("SELECT codigo_tuss FROM rol_cobertura WHERE correlacao='SIM' AND od=1 AND amb=0 AND hco=0 LIMIT 1").get() as { codigo_tuss: string } | undefined)?.codigo_tuss;

  // ─── Cenário 1: Auditar solicitação de procedimento hospitalar ───
  await executarCaso(suite, "C1-auditoria-hospitalar", "Auditor valida procedimento hospitalar: identifica tabela, descrição e cobertura", { acao: "buscar+validar" }, () => {
    const codigo = codHospital ?? "40702014";
    const infoCodigo = buscarCodigo.handler(buscarCodigo.inputSchema.parse({ codigo }), db);
    const cobertura = validarRol.handler(validarRol.inputSchema.parse({ codigo }), db);

    assert(!infoCodigo.structuredContent.error, "código deve ser válido");

    const coberturas = cobertura.structuredContent.coberturas as Array<{ segmento: string; coberto: boolean }>;
    const segCobertos = coberturas.filter((c) => c.coberto).map((c) => c.segmento);

    console.log(`\n  [Auditor] Procedimento ${codigo}:`);
    console.log(`    Descrição: ${infoCodigo.structuredContent.descricao_tuss}`);
    console.log(`    No Rol: ${cobertura.structuredContent.no_rol_ans}`);
    console.log(`    Segmentos cobertos: ${segCobertos.join(", ") || "NENHUM"}`);

    return { codigo, descricao: infoCodigo.structuredContent.descricao_tuss, cobertos: segCobertos };
  });

  // ─── Cenário 2: Verificar DUT e critérios de autorização ───
  await executarCaso(suite, "C2-dut-criterios", "Auditor verifica se DUT determina critérios de autorização", { acao: "buscar_tuss_por_codigo + validar" }, () => {
    const codigo = codComDut ?? "40301370";
    const result = buscarCodigo.handler(buscarCodigo.inputSchema.parse({ codigo }), db);
    const coberturas = result.structuredContent.coberturas as Array<{ segmento: string; coberto: boolean; tem_dut: boolean }>;

    const comDut = coberturas.filter((c) => c.tem_dut);
    const temDut = comDut.length > 0;

    console.log(`\n  [Auditor] DUT para ${codigo}:`);
    console.log(`    Tem DUT: ${temDut}`);
    if (temDut) {
      console.log(`    → Exige análise das diretrizes de utilização antes de autorizar`);
    }

    return { codigo, tem_dut: temDut, segmentos_com_dut: comDut.map((c) => c.segmento) };
  });

  // ─── Cenário 3: Consultar hierarquia CBHPM ───
  await executarCaso(suite, "C3-cbhpm-classificacao", "Auditor consulta hierarquia CBHPM para classificar tipo de procedimento", { acao: "consultar_hierarquia_cbhpm" }, () => {
    const codigo = codComCbhpm ?? "10101012";
    const result = hierarquia.handler(hierarquia.inputSchema.parse({ codigo }), db);

    console.log(`\n  [Auditor] Hierarquia CBHPM para ${codigo}:`);
    console.log(`    Capítulo: ${result.structuredContent.capitulo ?? "N/A"}`);
    console.log(`    Grupo: ${result.structuredContent.grupo ?? "N/A"}`);
    console.log(`    Subgrupo: ${result.structuredContent.subgrupo ?? "N/A"}`);
    console.log(`    Nota: ${(result.structuredContent.nota_limitacao as string).substring(0, 80)}...`);

    return {
      codigo,
      capitulo: result.structuredContent.capitulo,
      grupo: result.structuredContent.grupo,
    };
  });

  // ─── Cenário 4: Plano OD não cobre procedimento hospitalar ───
  await executarCaso(suite, "C4-plano-od-restricao", "Auditor confirma que plano OD não cobre procedimentos exclusivamente hospitalares", { acao: "validar_cobertura_rol" }, () => {
    const codigo = codHospital ?? "40702014";
    const result = validarRol.handler(validarRol.inputSchema.parse({ codigo, segmento: "OD" }), db);

    const coberturas = result.structuredContent.coberturas as Array<{ segmento: string; coberto: boolean }>;
    const od = coberturas.find((c) => c.segmento === "OD");

    console.log(`\n  [Auditor] Cobertura OD para procedimento hospitalar ${codigo}:`);
    console.log(`    Coberto em OD: ${od?.coberto ?? "N/A"} → ${od?.coberto ? "AUTORIZAR" : "GLOSAR (plano OD não cobre)"}`);

    return { codigo, od_coberto: od?.coberto };
  });

  // ─── Cenário 5: Listar procedimentos HSO para revisar autorizações pendentes ───
  await executarCaso(suite, "C5-lista-hso", "Auditor lista todos os procedimentos obrigatórios no segmento HSO", { acao: "listar_procedimentos_com_cobertura_obrigatoria" }, () => {
    const result = listarObrig.handler(listarObrig.inputSchema.parse({ segmento: "HSO", por_pagina: 20 }), db);

    console.log(`\n  [Auditor] Procedimentos obrigatórios HSO (hospitalar sem obstetrícia):`);
    console.log(`    Total: ${result.structuredContent.total}`);

    const amostra = (result.structuredContent.resultados as Array<{
      codigo_tuss: string;
      procedimento_rol: string | null;
      tem_dut: boolean;
    }>).slice(0, 5);

    for (const p of amostra) {
      console.log(`    • ${p.codigo_tuss} — ${p.procedimento_rol?.substring(0, 50) ?? "N/A"}${p.tem_dut ? " [DUT]" : ""}`);
    }

    assert(result.structuredContent.total >= 0, "total >= 0");
    return { total_hso: result.structuredContent.total, amostra };
  });

  // ─── Cenário 6: Detectar glosa técnica — código não no Rol ───
  await executarCaso(suite, "C6-glosa-tecnica", "Auditor identifica código não coberto (base para glosa técnica)", { acao: "validar_cobertura_rol" }, () => {
    // Material OPME não está no Rol ANS (apenas procedimentos Tab.22)
    const matOpme = (db.prepare("SELECT codigo FROM tuss_materiais LIMIT 1").get() as { codigo: string } | undefined)?.codigo;
    const codigo = matOpme ?? "98765432";

    const result = validarRol.handler(validarRol.inputSchema.parse({ codigo }), db);

    console.log(`\n  [Auditor] Verificação de cobertura para ${codigo}:`);
    console.log(`    No Rol ANS: ${result.structuredContent.no_rol_ans}`);
    if (!result.structuredContent.no_rol_ans) {
      console.log(`    → Código não consta no Rol ANS vigente — fundamenta glosa técnica`);
    }

    return { codigo, no_rol_ans: result.structuredContent.no_rol_ans };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
