#!/usr/bin/env tsx
/**
 * 04-buscar-descricao.ts
 *
 * Testes profundos da ferramenta buscar_tuss_por_descricao com dados reais.
 * Cobre: busca textual real, paginação, filtro por tabela, sem resultado.
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
  const suite = criarSuite("04-buscar-descricao", "Testes detalhados — buscar_tuss_por_descricao");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const { handler, inputSchema } = await srcImport("tools", "buscar-por-descricao.js");
  applySchema(db);

  // Termos comuns que devem existir na base real
  const termosConhecidos = [
    { termo: "consulta", tabela: "22" as const, minResultados: 1 },
    { termo: "ressonância", tabela: "22" as const, minResultados: 1 },
    { termo: "colonoscopia", tabela: "22" as const, minResultados: 1 },
  ];

  for (const { termo, tabela, minResultados } of termosConhecidos) {
    await executarCaso(suite, `T-${termo.substring(0, 6)}`, `Busca por "${termo}" retorna ≥${minResultados} resultado(s)`, { texto: termo, tabelas: [tabela] }, () => {
      const input = inputSchema.parse({ texto: termo, tabelas: [tabela] });
      const result = handler(input, db);
      assert(
        result.structuredContent.total >= minResultados,
        `Esperava ≥${minResultados} resultados para "${termo}", obteve ${result.structuredContent.total}`
      );
      return {
        termo,
        total: result.structuredContent.total,
        primeiro: (result.structuredContent.resultados as Array<{ codigo: string; descricao: string }>)[0],
      };
    });
  }

  // --- T01: Paginação divide corretamente ---
  await executarCaso(suite, "T01", "Paginação: por_pagina=5 retorna ≤5 resultados", { texto: "consulta", por_pagina: 5 }, () => {
    const input = inputSchema.parse({ texto: "consulta", por_pagina: 5 });
    const result = handler(input, db);
    const resultados = result.structuredContent.resultados as unknown[];
    assert(resultados.length <= 5, `Deve retornar ≤5, retornou ${resultados.length}`);
    return { total: result.structuredContent.total, pagina_1_count: resultados.length };
  });

  // --- T02: Segunda página é diferente da primeira ---
  await executarCaso(suite, "T02", "Página 2 diferente da página 1", { texto: "procedimento", pagina: 1 }, async () => {
    const input1 = inputSchema.parse({ texto: "procedimento", por_pagina: 5, pagina: 1 });
    const input2 = inputSchema.parse({ texto: "procedimento", por_pagina: 5, pagina: 2 });
    const r1 = handler(input1, db);
    const r2 = handler(input2, db);
    const ids1 = (r1.structuredContent.resultados as Array<{ codigo: string }>).map((r) => r.codigo);
    const ids2 = (r2.structuredContent.resultados as Array<{ codigo: string }>).map((r) => r.codigo);
    const overlap = ids1.filter((id) => ids2.includes(id));
    if (r1.structuredContent.total > 5) {
      assert(overlap.length === 0, "Páginas não devem se sobrepor");
    }
    return { total: r1.structuredContent.total, pagina_1: ids1.slice(0, 3), pagina_2: ids2.slice(0, 3) };
  });

  // --- T03: Filtro tabela 22 exclui materiais ---
  await executarCaso(suite, "T03", "Filtro tabela=['22'] retorna apenas procedimentos", { texto: "dreno", tabelas: ["22"] }, () => {
    const input = inputSchema.parse({ texto: "dreno", tabelas: ["22"] });
    const result = handler(input, db);
    const resultados = result.structuredContent.resultados as Array<{ tabela_origem: string }>;
    assert(
      resultados.every((r) => r.tabela_origem === "22"),
      "Todos os resultados devem ser Tab.22"
    );
    return { total: result.structuredContent.total };
  });

  // --- T04: Busca sem resultado retorna total=0 com estrutura válida ---
  await executarCaso(suite, "T04", "Busca por texto inexistente retorna total=0 sem erro", { texto: "XYZXYZXYZ" }, () => {
    const input = inputSchema.parse({ texto: "XYZXYZXYZ" });
    const result = handler(input, db);
    assert(result.structuredContent.total === 0, "total deve ser 0");
    assert(Array.isArray(result.structuredContent.resultados), "resultados deve ser array");
    assert((result.structuredContent.resultados as unknown[]).length === 0, "resultados deve estar vazio");
    return { total: 0, ok: true };
  });

  // --- T05: Todos os resultados têm código de 8 dígitos ---
  await executarCaso(suite, "T05", "Todos os resultados têm código TUSS de 8 dígitos", { texto: "exame" }, () => {
    const input = inputSchema.parse({ texto: "exame", por_pagina: 50 });
    const result = handler(input, db);
    const resultados = result.structuredContent.resultados as Array<{ codigo: string }>;
    const invalidos = resultados.filter((r) => !/^\d{8}$/.test(r.codigo));
    assert(invalidos.length === 0, `${invalidos.length} códigos inválidos encontrados`);
    return { total: result.structuredContent.total, amostra: resultados.slice(0, 5).map((r) => r.codigo) };
  });

  // --- T06: Resultados incluem todos os campos obrigatórios ---
  await executarCaso(suite, "T06", "Resultados incluem codigo, descricao, tabela_origem, ativo", { texto: "consulta" }, () => {
    const input = inputSchema.parse({ texto: "consulta", por_pagina: 3 });
    const result = handler(input, db);
    const resultados = result.structuredContent.resultados as Array<Record<string, unknown>>;
    for (const r of resultados) {
      assert("codigo" in r, "deve ter codigo");
      assert("descricao" in r, "deve ter descricao");
      assert("tabela_origem" in r, "deve ter tabela_origem");
      assert("ativo" in r, "deve ter ativo");
    }
    return { total: result.structuredContent.total, campos: Object.keys(resultados[0] ?? {}) };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
