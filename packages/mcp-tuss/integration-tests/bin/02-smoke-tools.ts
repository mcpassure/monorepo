#!/usr/bin/env tsx
/**
 * 02-smoke-tools.ts
 *
 * Smoke test de todas as 7 ferramentas MCP: verifica que cada uma responde
 * sem exceção e retorna os campos obrigatórios (structuredContent, disclaimer, content).
 * Depende de banco com dados reais (01-download-bases.ts).
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
  const suite = criarSuite("02-smoke-tools", "Smoke test — todas as 7 ferramentas MCP");
  const db = openIntegrationDb();

  if (!dbHasData(db)) {
    db.close();
    console.warn("⚠️  Banco vazio. Execute 01-download-bases primeiro.");
    return suite;
  }

  // Carregar schema e garantir tabelas criadas
  const { applySchema } = await srcImport("db", "schema.js");
  applySchema(db);

  // Importar todos os handlers
  const buscarCodigo = await srcImport("tools", "buscar-por-codigo.js");
  const buscarDesc = await srcImport("tools", "buscar-por-descricao.js");
  const listarCat = await srcImport("tools", "listar-por-categoria.js");
  const validarRol = await srcImport("tools", "validar-cobertura-rol.js");
  const hierarquia = await srcImport("tools", "consultar-hierarquia-cbhpm.js");
  const obrigatorio = await srcImport("tools", "listar-cobertura-obrigatoria.js");
  const status = await srcImport("tools", "status-sincronizacao.js");

  // Pegar um código real do banco para usar nos testes
  const primeiroProc = db
    .prepare("SELECT codigo FROM tuss_procedimentos LIMIT 1")
    .get() as { codigo: string } | undefined;
  const codigoReal = primeiroProc?.codigo ?? "10101012";

  // --- T01: buscar_tuss_por_codigo ---
  await executarCaso(suite, "T01", "buscar_tuss_por_codigo responde sem exceção", { codigo: codigoReal }, () => {
    const input = buscarCodigo.inputSchema.parse({ codigo: codigoReal });
    const result = buscarCodigo.handler(input, db);
    assert(typeof result.structuredContent === "object", "structuredContent deve existir");
    assert(typeof result.structuredContent.disclaimer === "string", "disclaimer deve ser string");
    assert(result.content.length > 0, "content não deve ser vazio");
    return { codigo: codigoReal, campos: Object.keys(result.structuredContent) };
  });

  // --- T02: buscar_tuss_por_descricao ---
  await executarCaso(suite, "T02", "buscar_tuss_por_descricao responde sem exceção", { texto: "consul" }, () => {
    const input = buscarDesc.inputSchema.parse({ texto: "consul" });
    const result = buscarDesc.handler(input, db);
    assert(typeof result.structuredContent.total === "number", "total deve ser number");
    assert(Array.isArray(result.structuredContent.resultados), "resultados deve ser array");
    return { total: result.structuredContent.total };
  });

  // --- T03: listar_por_categoria ---
  await executarCaso(suite, "T03", "listar_por_categoria (procedimentos) responde sem exceção", { categoria: "procedimentos" }, () => {
    const input = listarCat.inputSchema.parse({ categoria: "procedimentos" });
    const result = listarCat.handler(input, db);
    assert(typeof result.structuredContent.total === "number", "total deve ser number");
    return { total: result.structuredContent.total };
  });

  // --- T04: validar_cobertura_rol ---
  await executarCaso(suite, "T04", "validar_cobertura_rol responde sem exceção", { codigo: codigoReal }, () => {
    const input = validarRol.inputSchema.parse({ codigo: codigoReal });
    const result = validarRol.handler(input, db);
    assert(typeof result.structuredContent.no_rol_ans === "boolean", "no_rol_ans deve ser boolean");
    assert(Array.isArray(result.structuredContent.coberturas), "coberturas deve ser array");
    return { no_rol_ans: result.structuredContent.no_rol_ans };
  });

  // --- T05: consultar_hierarquia_cbhpm ---
  await executarCaso(suite, "T05", "consultar_hierarquia_cbhpm responde sem exceção", { codigo: codigoReal }, () => {
    const input = hierarquia.inputSchema.parse({ codigo: codigoReal });
    const result = hierarquia.handler(input, db);
    assert(typeof result.structuredContent.nota_limitacao === "string", "nota_limitacao deve existir");
    assert(typeof result.structuredContent.cbhpm_edicao === "string", "cbhpm_edicao deve existir");
    return { capitulo: result.structuredContent.capitulo };
  });

  // --- T06: listar_procedimentos_com_cobertura_obrigatoria ---
  await executarCaso(suite, "T06", "listar_procedimentos_com_cobertura_obrigatoria responde sem exceção", {}, () => {
    const input = obrigatorio.inputSchema.parse({});
    const result = obrigatorio.handler(input, db);
    assert(typeof result.structuredContent.total === "number", "total deve ser number");
    return { total: result.structuredContent.total };
  });

  // --- T07: status_sincronizacao ---
  await executarCaso(suite, "T07", "status_sincronizacao responde sem exceção", {}, () => {
    const input = status.inputSchema.parse({});
    const result = status.handler(input, db);
    assert(Array.isArray(result.structuredContent.tabelas), "tabelas deve ser array");
    assert(typeof result.structuredContent.cbhpm_edicao === "string", "cbhpm_edicao deve existir");
    return {
      tabelas: (result.structuredContent.tabelas as Array<{ tabela: string }>).map((t) => t.tabela),
    };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

// Execução direta
run().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
