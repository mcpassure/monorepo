#!/usr/bin/env tsx
/**
 * 03-buscar-codigo.ts
 *
 * Testes profundos da ferramenta buscar_tuss_por_codigo com dados reais.
 * Cobre: código válido (Tab 22, 18, 19, 20), código inexistente,
 * campos obrigatórios, FHIR system, cobertura por segmento.
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
  const suite = criarSuite("03-buscar-codigo", "Testes detalhados — buscar_tuss_por_codigo");
  const db = openIntegrationDb();

  if (!dbHasData(db)) {
    db.close();
    console.warn("⚠️  Banco vazio — suite pulada.");
    return suite;
  }

  const { applySchema } = await srcImport("db", "schema.js");
  const { FHIR_SYSTEM } = await srcImport("constants.js");
  const { handler, inputSchema } = await srcImport("tools", "buscar-por-codigo.js");
  applySchema(db);

  // Descobrir um código real de cada tabela
  const procReal = (db.prepare("SELECT codigo FROM tuss_procedimentos LIMIT 1").get() as { codigo: string } | undefined)?.codigo;
  const matReal = (db.prepare("SELECT codigo FROM tuss_materiais LIMIT 1").get() as { codigo: string } | undefined)?.codigo;
  const medReal = (db.prepare("SELECT codigo FROM tuss_medicamentos LIMIT 1").get() as { codigo: string } | undefined)?.codigo;
  const taxaReal = (db.prepare("SELECT codigo FROM tuss_taxas_diarias LIMIT 1").get() as { codigo: string } | undefined)?.codigo;

  // --- T01: Retorna código de procedimento (Tab. 22) ---
  if (procReal) {
    await executarCaso(suite, "T01", `Código Tab.22 ${procReal} retorna tabela_origem='22'`, { codigo: procReal }, () => {
      const result = handler(inputSchema.parse({ codigo: procReal }), db);
      const sc = result.structuredContent;
      assert(!sc.error, "Não deve retornar erro");
      assertIgual(sc.tabela_origem, "22", "tabela_origem");
      assert(typeof sc.descricao_tuss === "string" && sc.descricao_tuss.length > 0, "descricao_tuss não vazia");
      return { codigo: procReal, descricao: sc.descricao_tuss };
    });
  }

  // --- T02: Retorna material OPME (Tab. 19) ---
  if (matReal) {
    await executarCaso(suite, "T02", `Código Tab.19 ${matReal} retorna tabela_origem='19'`, { codigo: matReal }, () => {
      const result = handler(inputSchema.parse({ codigo: matReal }), db);
      assertIgual(result.structuredContent.tabela_origem, "19", "tabela_origem");
      return { codigo: matReal, tipo: result.structuredContent.tipo };
    });
  }

  // --- T03: Retorna medicamento (Tab. 20) ---
  if (medReal) {
    await executarCaso(suite, "T03", `Código Tab.20 ${medReal} retorna tabela_origem='20'`, { codigo: medReal }, () => {
      const result = handler(inputSchema.parse({ codigo: medReal }), db);
      assertIgual(result.structuredContent.tabela_origem, "20", "tabela_origem");
      return { codigo: medReal };
    });
  }

  // --- T04: Retorna taxa/diária (Tab. 18) ---
  if (taxaReal) {
    await executarCaso(suite, "T04", `Código Tab.18 ${taxaReal} retorna tabela_origem='18'`, { codigo: taxaReal }, () => {
      const result = handler(inputSchema.parse({ codigo: taxaReal }), db);
      assertIgual(result.structuredContent.tabela_origem, "18", "tabela_origem");
      return { codigo: taxaReal };
    });
  }

  // --- T05: sistema_fhir presente ---
  if (procReal) {
    await executarCaso(suite, "T05", "campo sistema_fhir aponta para terminologia.saude.gov.br", { codigo: procReal }, () => {
      const result = handler(inputSchema.parse({ codigo: procReal }), db);
      assertIgual(result.structuredContent.sistema_fhir, FHIR_SYSTEM, "sistema_fhir");
      return { sistema_fhir: result.structuredContent.sistema_fhir };
    });
  }

  // --- T06: coberturas tem 5 segmentos para código no Rol ---
  const codRol = (db.prepare("SELECT codigo_tuss FROM rol_cobertura LIMIT 1").get() as { codigo_tuss: string } | undefined)?.codigo_tuss;
  if (codRol) {
    await executarCaso(suite, "T06", `Código do Rol ${codRol} retorna 5 segmentos de cobertura`, { codigo: codRol }, () => {
      const result = handler(inputSchema.parse({ codigo: codRol }), db);
      const coberturas = result.structuredContent.coberturas as Array<{ segmento: string }>;
      const segmentos = coberturas.map((c) => c.segmento).sort();
      assert(segmentos.includes("OD"), "deve ter OD");
      assert(segmentos.includes("AMB"), "deve ter AMB");
      assert(segmentos.includes("HCO"), "deve ter HCO");
      assert(segmentos.includes("HSO"), "deve ter HSO");
      assert(segmentos.includes("PAC"), "deve ter PAC");
      return { codigo: codRol, segmentos };
    });
  }

  // --- T07: código inexistente retorna erro estruturado ---
  await executarCaso(suite, "T07", "Código 00000000 retorna CODIGO_NAO_ENCONTRADO sem exceção", { codigo: "00000000" }, () => {
    const result = handler(inputSchema.parse({ codigo: "00000000" }), db);
    assertIgual(result.structuredContent.error, "CODIGO_NAO_ENCONTRADO", "error");
    return { error: result.structuredContent.error };
  });

  // --- T08: disclaimer presente ---
  if (procReal) {
    await executarCaso(suite, "T08", "disclaimer presente e com conteúdo suficiente", { codigo: procReal }, () => {
      const result = handler(inputSchema.parse({ codigo: procReal }), db);
      assert(typeof result.structuredContent.disclaimer === "string", "disclaimer deve ser string");
      assert((result.structuredContent.disclaimer as string).length > 50, "disclaimer deve ter > 50 chars");
      return { disclaimer_length: (result.structuredContent.disclaimer as string).length };
    });
  }

  // --- T09: metadata presente ---
  if (procReal) {
    await executarCaso(suite, "T09", "metadata de sincronização presente na resposta", { codigo: procReal }, () => {
      const result = handler(inputSchema.parse({ codigo: procReal }), db);
      assert(result.structuredContent.metadata !== null, "metadata não deve ser null");
      return { metadata: result.structuredContent.metadata };
    });
  }

  // --- T10: validação Zod rejeita código de 7 dígitos ---
  await executarCaso(suite, "T10", "Zod rejeita código com menos de 8 dígitos", { codigo: "1234567" }, () => {
    let lançou = false;
    try {
      inputSchema.parse({ codigo: "1234567" });
    } catch {
      lançou = true;
    }
    assert(lançou, "Zod deve rejeitar código de 7 dígitos");
    return { rejeição_validada: true };
  });

  // --- T11: validação Zod rejeita código não numérico ---
  await executarCaso(suite, "T11", "Zod rejeita código com letras", { codigo: "1234567A" }, () => {
    let lançou = false;
    try {
      inputSchema.parse({ codigo: "1234567A" });
    } catch {
      lançou = true;
    }
    assert(lançou, "Zod deve rejeitar código com letras");
    return { rejeição_validada: true };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
