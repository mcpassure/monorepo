#!/usr/bin/env tsx
/**
 * 13-performance.ts
 *
 * Testes de performance com dados reais.
 * Mede latência de cada ferramenta e verifica que fica abaixo dos SLAs da PRD.
 *
 * SLAs (PRD §resultado esperado):
 *   • Resposta < 500ms após carga inicial do banco
 *   • Busca textual FTS5 < 200ms para queries simples
 *   • Listagem paginada < 100ms
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

function medir<T>(fn: () => T): { resultado: T; duracao_ms: number } {
  const inicio = performance.now();
  const resultado = fn();
  return { resultado, duracao_ms: Math.round(performance.now() - inicio) };
}

export async function run(): Promise<SuiteResult> {
  const suite = criarSuite("13-performance", "Testes de performance e latência (SLAs da PRD)");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const buscarCodigo = await srcImport("tools", "buscar-por-codigo.js");
  const buscarDesc = await srcImport("tools", "buscar-por-descricao.js");
  const listarCat = await srcImport("tools", "listar-por-categoria.js");
  const validarRol = await srcImport("tools", "validar-cobertura-rol.js");
  const listarObrig = await srcImport("tools", "listar-cobertura-obrigatoria.js");
  applySchema(db);

  const codigoReal = (db.prepare("SELECT codigo_tuss FROM rol_cobertura WHERE correlacao='SIM' LIMIT 1").get() as { codigo_tuss: string } | undefined)?.codigo_tuss ?? "10101012";

  const SLA_MS = 500;
  const FTS_SLA_MS = 200;
  const LIST_SLA_MS = 100;

  // --- P01: buscar_tuss_por_codigo < SLA_MS ---
  await executarCaso(suite, "P01", `buscar_tuss_por_codigo < ${SLA_MS}ms`, { codigo: codigoReal }, () => {
    const { resultado, duracao_ms } = medir(() =>
      buscarCodigo.handler(buscarCodigo.inputSchema.parse({ codigo: codigoReal }), db)
    );
    assert(duracao_ms < SLA_MS, `Latência ${duracao_ms}ms > SLA ${SLA_MS}ms`);
    console.log(`  P01 buscar_tuss_por_codigo: ${duracao_ms}ms`);
    return { duracao_ms, sla: SLA_MS, ok: duracao_ms < SLA_MS };
  });

  // --- P02: buscar_tuss_por_descricao FTS < FTS_SLA_MS ---
  await executarCaso(suite, "P02", `buscar_tuss_por_descricao (FTS5) < ${FTS_SLA_MS}ms`, { texto: "ressonância" }, () => {
    const { duracao_ms } = medir(() =>
      buscarDesc.handler(buscarDesc.inputSchema.parse({ texto: "ressonância" }), db)
    );
    assert(duracao_ms < FTS_SLA_MS, `FTS latência ${duracao_ms}ms > SLA ${FTS_SLA_MS}ms`);
    console.log(`  P02 buscar_tuss_por_descricao: ${duracao_ms}ms`);
    return { duracao_ms, sla: FTS_SLA_MS };
  });

  // --- P03: listar_por_categoria paginada < LIST_SLA_MS ---
  await executarCaso(suite, "P03", `listar_por_categoria (procedimentos, 50 items) < ${LIST_SLA_MS}ms`, {}, () => {
    const { duracao_ms } = medir(() =>
      listarCat.handler(listarCat.inputSchema.parse({ categoria: "procedimentos", por_pagina: 50 }), db)
    );
    assert(duracao_ms < LIST_SLA_MS, `List latência ${duracao_ms}ms > SLA ${LIST_SLA_MS}ms`);
    console.log(`  P03 listar_por_categoria: ${duracao_ms}ms`);
    return { duracao_ms, sla: LIST_SLA_MS };
  });

  // --- P04: validar_cobertura_rol < SLA_MS ---
  await executarCaso(suite, "P04", `validar_cobertura_rol < ${SLA_MS}ms`, { codigo: codigoReal }, () => {
    const { duracao_ms } = medir(() =>
      validarRol.handler(validarRol.inputSchema.parse({ codigo: codigoReal }), db)
    );
    assert(duracao_ms < SLA_MS, `Latência ${duracao_ms}ms > SLA ${SLA_MS}ms`);
    console.log(`  P04 validar_cobertura_rol: ${duracao_ms}ms`);
    return { duracao_ms, sla: SLA_MS };
  });

  // --- P05: Throughput — 100 consultas de código em < 5 segundos ---
  await executarCaso(suite, "P05", "Throughput: 100 consultas de código em < 5000ms", {}, () => {
    const codigos = db
      .prepare("SELECT codigo_tuss FROM rol_cobertura LIMIT 100")
      .all() as Array<{ codigo_tuss: string }>;

    const inicio = performance.now();
    for (const { codigo_tuss } of codigos) {
      buscarCodigo.handler(buscarCodigo.inputSchema.parse({ codigo: codigo_tuss }), db);
    }
    const duracao_ms = Math.round(performance.now() - inicio);
    const por_consulta = duracao_ms / codigos.length;

    assert(duracao_ms < 5000, `100 consultas levaram ${duracao_ms}ms, esperava < 5000ms`);
    console.log(`  P05 Throughput 100 consultas: ${duracao_ms}ms (${por_consulta.toFixed(1)}ms/consulta)`);

    return { total: codigos.length, duracao_ms, por_consulta_ms: por_consulta };
  });

  // --- P06: Busca textual com múltiplas tabelas < SLA_MS ---
  await executarCaso(suite, "P06", `Busca textual em todas as 4 tabelas < ${SLA_MS}ms`, { texto: "cirurgia" }, () => {
    const { duracao_ms } = medir(() =>
      buscarDesc.handler(
        buscarDesc.inputSchema.parse({ texto: "cirurgia", tabelas: ["18", "19", "20", "22"] }),
        db
      )
    );
    assert(duracao_ms < SLA_MS, `Multi-tabela FTS latência ${duracao_ms}ms > SLA ${SLA_MS}ms`);
    console.log(`  P06 Busca multi-tabela: ${duracao_ms}ms`);
    return { duracao_ms, sla: SLA_MS };
  });

  // --- P07: listar_procedimentos_com_cobertura_obrigatoria paginado < SLA_MS ---
  await executarCaso(suite, "P07", `listar_procedimentos_com_cobertura_obrigatoria < ${SLA_MS}ms`, {}, () => {
    const { resultado, duracao_ms } = medir(() =>
      listarObrig.handler(listarObrig.inputSchema.parse({ por_pagina: 100 }), db)
    );
    assert(duracao_ms < SLA_MS, `Latência ${duracao_ms}ms > SLA ${SLA_MS}ms`);
    console.log(`  P07 listar_cobertura_obrigatoria: ${duracao_ms}ms (${resultado.structuredContent.total} total)`);
    return { duracao_ms, total: resultado.structuredContent.total };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
