#!/usr/bin/env tsx
/**
 * 12-simul-dev.ts
 *
 * Simulação de uso: Dev Healthtech
 *
 * Persona: Lucas, desenvolvedor de um sistema de gestão hospitalar.
 * Fluxo real: integra as ferramentas TUSS no sistema de faturamento,
 * precisa garantir robustez (inputs inválidos, dados ausentes), performance
 * e que os outputs são adequados para serialização JSON em APIs.
 *
 * Cenários simulados:
 *   1. Integração programática — busca em lote de múltiplos códigos
 *   2. Tratamento de entrada inválida (robustez da API)
 *   3. Serialização JSON dos outputs (compatibilidade com APIs REST)
 *   4. Busca com paginação para popular select/autocomplete
 *   5. Verificar compatibilidade FHIR (campo sistema_fhir)
 *   6. Iterar sobre todos os procedimentos obrigatórios
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
  const suite = criarSuite("12-simul-dev", "Simulação de uso — Dev Healthtech (Lucas)");
  const db = openIntegrationDb();

  if (!dbHasData(db)) { db.close(); return suite; }

  const { applySchema } = await srcImport("db", "schema.js");
  const buscarCodigo = await srcImport("tools", "buscar-por-codigo.js");
  const buscarDesc = await srcImport("tools", "buscar-por-descricao.js");
  const validarRol = await srcImport("tools", "validar-cobertura-rol.js");
  const listarCat = await srcImport("tools", "listar-por-categoria.js");
  const listarObrig = await srcImport("tools", "listar-cobertura-obrigatoria.js");
  const { FHIR_SYSTEM } = await srcImport("constants.js");
  applySchema(db);

  // Obter amostra de códigos reais
  const codigos = db
    .prepare("SELECT codigo_tuss FROM rol_cobertura WHERE correlacao='SIM' ORDER BY codigo_tuss LIMIT 10")
    .all() as Array<{ codigo_tuss: string }>;

  // ─── Cenário 1: Busca em lote (batch) de múltiplos códigos ───
  await executarCaso(suite, "C1-batch-lookup", "Dev busca 10 códigos em lote e verifica performance", { codigos: codigos.map((c) => c.codigo_tuss) }, () => {
    const inicio = Date.now();
    const resultados: Array<{ codigo: string; encontrado: boolean; descricao: string | null }> = [];

    for (const { codigo_tuss } of codigos) {
      const result = buscarCodigo.handler(buscarCodigo.inputSchema.parse({ codigo: codigo_tuss }), db);
      resultados.push({
        codigo: codigo_tuss,
        encontrado: !result.structuredContent.error,
        descricao: result.structuredContent.descricao_tuss as string | null,
      });
    }

    const duracao = Date.now() - inicio;
    assert(duracao < 1000, `Batch de ${codigos.length} consultas deve < 1000ms, levou ${duracao}ms`);

    console.log(`\n  [Dev] Batch de ${codigos.length} códigos em ${duracao}ms (${(duracao / codigos.length).toFixed(1)}ms/código)`);
    return { total: codigos.length, encontrados: resultados.filter((r) => r.encontrado).length, duracao_ms: duracao };
  });

  // ─── Cenário 2: Robustez contra inputs inválidos ───
  await executarCaso(suite, "C2-inputs-invalidos", "Dev verifica que inputs inválidos são rejeitados por Zod sem crash", {}, () => {
    const casosInvalidos = [
      { input: { codigo: "1234567" }, descricao: "7 dígitos" },
      { input: { codigo: "123456789" }, descricao: "9 dígitos" },
      { input: { codigo: "ABCDEFGH" }, descricao: "letras" },
      { input: { codigo: "" }, descricao: "vazio" },
    ];

    let rejeitados = 0;
    for (const { input } of casosInvalidos) {
      try {
        buscarCodigo.inputSchema.parse(input);
      } catch {
        rejeitados++;
      }
    }

    assert(rejeitados === casosInvalidos.length, `Todos os ${casosInvalidos.length} inputs inválidos devem ser rejeitados`);
    console.log(`\n  [Dev] ${rejeitados}/${casosInvalidos.length} inputs inválidos rejeitados corretamente por Zod`);
    return { total_invalidos: casosInvalidos.length, rejeitados };
  });

  // ─── Cenário 3: Serialização JSON dos outputs ───
  await executarCaso(suite, "C3-json-serialization", "Dev verifica que o structuredContent é JSON-serializável", {}, () => {
    const codigo = codigos[0]?.codigo_tuss ?? "10101012";
    const result = buscarCodigo.handler(buscarCodigo.inputSchema.parse({ codigo }), db);

    // Deve serializar sem erros (sem circular refs, sem undefined)
    let json: string;
    try {
      json = JSON.stringify(result.structuredContent);
    } catch (e) {
      throw new Error(`Falha ao serializar: ${e}`);
    }

    const parsed = JSON.parse(json);
    assert(typeof parsed.codigo === "string", "codigo deve ser string após round-trip");
    assert(Array.isArray(parsed.coberturas), "coberturas deve ser array após round-trip");

    console.log(`\n  [Dev] JSON serialization OK — ${json.length} bytes`);
    return { json_bytes: json.length, serialization_ok: true };
  });

  // ─── Cenário 4: Paginação para autocomplete ───
  await executarCaso(suite, "C4-autocomplete", "Dev usa busca paginada para popular autocomplete de procedimentos", { texto: "hemo" }, () => {
    const pagina1 = buscarDesc.handler(buscarDesc.inputSchema.parse({ texto: "hemo", por_pagina: 10, pagina: 1 }), db);
    const pagina2 = buscarDesc.handler(buscarDesc.inputSchema.parse({ texto: "hemo", por_pagina: 10, pagina: 2 }), db);

    const totalPags = Math.ceil(pagina1.structuredContent.total / 10);
    console.log(`\n  [Dev] Autocomplete 'hemo': ${pagina1.structuredContent.total} resultados em ${totalPags} páginas`);

    const resultados = pagina1.structuredContent.resultados as Array<{ codigo: string; descricao: string }>;
    for (const r of resultados.slice(0, 3)) {
      console.log(`    • ${r.codigo} — ${r.descricao.substring(0, 50)}`);
    }

    return {
      total: pagina1.structuredContent.total,
      paginas: totalPags,
      pagina_1_count: (pagina1.structuredContent.resultados as unknown[]).length,
      pagina_2_count: (pagina2.structuredContent.resultados as unknown[]).length,
    };
  });

  // ─── Cenário 5: Verificar compatibilidade FHIR ───
  await executarCaso(suite, "C5-fhir-compat", "Dev verifica campo sistema_fhir para compatibilidade FHIR R4", {}, () => {
    const codigo = codigos[0]?.codigo_tuss ?? "10101012";
    const result = buscarCodigo.handler(buscarCodigo.inputSchema.parse({ codigo }), db);

    assert(result.structuredContent.sistema_fhir === FHIR_SYSTEM, "sistema_fhir incorreto");
    assert(result.structuredContent.codigo !== null, "codigo não deve ser null");

    // Montar objeto FHIR Coding
    const fhirCoding = {
      system: result.structuredContent.sistema_fhir,
      code: result.structuredContent.codigo,
      display: result.structuredContent.descricao_tuss,
    };

    console.log(`\n  [Dev] FHIR Coding para ${codigo}:`);
    console.log(`    ${JSON.stringify(fhirCoding, null, 2).split("\n").join("\n    ")}`);

    return { fhir_coding: fhirCoding };
  });

  // ─── Cenário 6: Iterar sobre todos os obrigatórios para cache local ───
  await executarCaso(suite, "C6-iterar-obrigatorio", "Dev itera paginando todos os procedimentos obrigatórios", {}, () => {
    let pagina = 1;
    let totalLido = 0;
    let totalDeclarado = -1;
    const porPagina = 100;
    let iteracoes = 0;

    while (true) {
      const result = listarObrig.handler(listarObrig.inputSchema.parse({ pagina, por_pagina: porPagina }), db);
      if (totalDeclarado === -1) totalDeclarado = result.structuredContent.total;
      const lote = (result.structuredContent.resultados as unknown[]).length;
      totalLido += lote;
      iteracoes++;
      if (lote < porPagina || totalLido >= totalDeclarado) break;
      pagina++;
      if (iteracoes > 200) break; // safety
    }

    assert(totalLido === totalDeclarado, `Leu ${totalLido} mas total declarado é ${totalDeclarado}`);
    console.log(`\n  [Dev] Iteração completa: ${totalLido} procedimentos em ${iteracoes} páginas`);

    return { total_declarado: totalDeclarado, total_lido: totalLido, paginas_percorridas: iteracoes };
  });

  db.close();
  salvarSuite(suite);
  imprimirResumo(suite);
  return suite;
}

run().catch((err) => { console.error(err); process.exit(1); });
