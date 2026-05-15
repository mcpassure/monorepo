#!/usr/bin/env tsx
/**
 * 07-categorias.ts
 *
 * Testes profundos da ferramenta listar_por_categoria com dados reais.
 * Cobre: todas as 6 categorias, paginação, tipo correto por categoria.
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
  const suite = criarSuite("07-categorias", "Testes detalhados — listar_por_categoria");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const { handler, inputSchema } = await srcImport("tools", "listar-por-categoria.js");
  applySchema(db);

  const categorias = [
    { cat: "procedimentos", tabela: "22", tipo: null },
    { cat: "materiais", tabela: "19", tipo: "material" },
    { cat: "medicamentos", tabela: "20", tipo: null },
    { cat: "opme", tabela: "19", tipo: "opme" },
    { cat: "taxas", tabela: "18", tipo: "taxa" },
    { cat: "diarias", tabela: "18", tipo: "diaria" },
  ] as const;

  for (const { cat, tabela, tipo } of categorias) {
    await executarCaso(suite, `T-${cat}`, `Categoria '${cat}' retorna registros da Tab.${tabela}${tipo ? ` tipo=${tipo}` : ""}`, { categoria: cat }, () => {
      const input = inputSchema.parse({ categoria: cat, por_pagina: 10 });
      const result = handler(input, db);
      const resultados = result.structuredContent.resultados as Array<{ tabela_origem: string; tipo?: string }>;
      assert(result.structuredContent.total >= 0, "total deve ser >= 0");
      if (resultados.length > 0) {
        assert(resultados.every((r) => r.tabela_origem === tabela), `tabela_origem deve ser ${tabela}`);
        if (tipo) {
          assert(resultados.every((r) => r.tipo === tipo), `tipo deve ser '${tipo}'`);
        }
      }
      return { categoria: cat, total: result.structuredContent.total, amostra: resultados.slice(0, 3).map((r) => ({ codigo: (r as { codigo: string }).codigo, descricao: (r as { descricao: string }).descricao.substring(0, 40) })) };
    });
  }

  // --- T01: Procedimentos tem o maior volume ---
  await executarCaso(suite, "T01", "Tab.22 (procedimentos) é a maior tabela da correlação ANS", {}, () => {
    const row = db.prepare("SELECT count(*) AS cnt FROM tuss_procedimentos").get() as { cnt: number };
    assert(row.cnt > 3000, `Esperava >3000 procedimentos, encontrou ${row.cnt}`);
    return { total_procedimentos: row.cnt };
  });

  // --- T02: Paginação com por_pagina=100 ---
  await executarCaso(suite, "T02", "Paginação funciona com por_pagina=100", { categoria: "procedimentos", por_pagina: 100 }, () => {
    const input = inputSchema.parse({ categoria: "procedimentos", por_pagina: 100 });
    const result = handler(input, db);
    const resultados = result.structuredContent.resultados as unknown[];
    assert(resultados.length <= 100, `Deve retornar ≤100, retornou ${resultados.length}`);
    return { total: result.structuredContent.total, pagina_1: resultados.length };
  });

  // --- T03: Todos os resultados têm código válido ---
  await executarCaso(suite, "T03", "Todos os códigos retornados são TUSS de 8 dígitos", { categoria: "procedimentos" }, () => {
    const input = inputSchema.parse({ categoria: "procedimentos", por_pagina: 200 });
    const result = handler(input, db);
    const resultados = result.structuredContent.resultados as Array<{ codigo: string }>;
    const invalidos = resultados.filter((r) => !/^\d{8}$/.test(r.codigo));
    assert(invalidos.length === 0, `${invalidos.length} código(s) inválido(s): ${invalidos.map((r) => r.codigo).join(", ")}`);
    return { total: resultados.length, invalidos: 0 };
  });

  // --- T04: Ordering consistente entre páginas ---
  await executarCaso(suite, "T04", "Ordering por código é consistente entre chamadas", { categoria: "procedimentos" }, () => {
    const r1 = handler(inputSchema.parse({ categoria: "procedimentos", por_pagina: 5, pagina: 1 }), db);
    const r1b = handler(inputSchema.parse({ categoria: "procedimentos", por_pagina: 5, pagina: 1 }), db);
    const ids1 = (r1.structuredContent.resultados as Array<{ codigo: string }>).map((r) => r.codigo);
    const ids1b = (r1b.structuredContent.resultados as Array<{ codigo: string }>).map((r) => r.codigo);
    assert(JSON.stringify(ids1) === JSON.stringify(ids1b), "Mesmo resultado em chamadas idempotentes");
    return { consistente: true };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
