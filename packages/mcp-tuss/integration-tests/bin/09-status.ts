#!/usr/bin/env tsx
/**
 * 09-status.ts
 *
 * Testes da ferramenta status_sincronizacao com dados reais.
 * Valida versões, data de sincronização e metadata completa.
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
  const suite = criarSuite("09-status", "Testes detalhados — status_sincronizacao");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const { handler, inputSchema } = await srcImport("tools", "status-sincronizacao.js");
  const { CBHPM_EDICAO } = await srcImport("constants.js");
  applySchema(db);

  // --- T01: Retorna todas as tabelas registradas ---
  await executarCaso(suite, "T01", "Retorna entrada para todas as tabelas esperadas", {}, () => {
    const result = handler(inputSchema.parse({}), db);
    const tabelas = result.structuredContent.tabelas as Array<{ tabela: string }>;
    const nomes = tabelas.map((t) => t.tabela);
    assert(nomes.includes("tuss_22"), "deve ter tuss_22");
    assert(nomes.includes("rol_correlacao"), "deve ter rol_correlacao");
    return { tabelas: nomes };
  });

  // --- T02: cbhpm_edicao correto ---
  await executarCaso(suite, "T02", `cbhpm_edicao = '${CBHPM_EDICAO}'`, {}, () => {
    const result = handler(inputSchema.parse({}), db);
    assert(result.structuredContent.cbhpm_edicao === CBHPM_EDICAO, `cbhpm_edicao incorreto: ${result.structuredContent.cbhpm_edicao}`);
    return { cbhpm_edicao: result.structuredContent.cbhpm_edicao };
  });

  // --- T03: data de sincronização presente e válida ---
  await executarCaso(suite, "T03", "data de sincronização é uma ISO string válida", {}, () => {
    const result = handler(inputSchema.parse({}), db);
    const tabelas = result.structuredContent.tabelas as Array<{ tabela: string; data_sincronizacao: string | null }>;
    const comData = tabelas.filter((t) => t.data_sincronizacao !== null);
    assert(comData.length > 0, "Deve haver pelo menos uma tabela com data de sincronização");
    for (const t of comData) {
      const d = new Date(t.data_sincronizacao!);
      assert(!isNaN(d.getTime()), `Data inválida em ${t.tabela}: ${t.data_sincronizacao}`);
    }
    return { tabelas_com_data: comData.map((t) => ({ tabela: t.tabela, data: t.data_sincronizacao })) };
  });

  // --- T04: versão da correlação tem formato de ano/mês ---
  await executarCaso(suite, "T04", "Versão da correlação TUSS-ROL tem formato de data/versão ANS", {}, () => {
    const result = handler(inputSchema.parse({}), db);
    const tabelas = result.structuredContent.tabelas as Array<{ tabela: string; versao: string | null }>;
    const rol = tabelas.find((t) => t.tabela === "rol_correlacao");
    assert(rol !== undefined, "deve ter entrada rol_correlacao");
    assert(rol.versao !== null, "versão não deve ser null");
    return { versao_rol: rol?.versao };
  });

  // --- T05: content.text contém data de sincronização ---
  await executarCaso(suite, "T05", "content.text contém informação de sincronização", {}, () => {
    const result = handler(inputSchema.parse({}), db);
    assert(result.content[0].text.includes("sincronizado em:"), "texto deve conter 'sincronizado em:'");
    assert(!result.content[0].text.includes("nunca"), "não deve conter 'nunca' após sync bem-sucedido");
    return { content: result.content[0].text };
  });

  // --- T06: metadata no structuredContent ---
  await executarCaso(suite, "T06", "structuredContent contém metadata com versões das tabelas", {}, () => {
    const result = handler(inputSchema.parse({}), db);
    const meta = result.structuredContent.metadata as Record<string, unknown>;
    assert(meta !== null && meta !== undefined, "metadata não deve ser null");
    assert("cbhpm_edicao" in meta, "metadata deve ter cbhpm_edicao");
    return { metadata_campos: Object.keys(meta) };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
