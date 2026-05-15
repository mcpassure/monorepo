#!/usr/bin/env tsx
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getInMemoryDb } from "../src/db/connection.js";
import { CnesRepository } from "../src/domain/repository.js";
import { registerBuscarPorCodigoCnes } from "../src/tools/buscar_por_codigo_cnes.js";
import { registerBuscarPorMunicipio } from "../src/tools/buscar_por_municipio.js";
import { registerBuscarPorNome } from "../src/tools/buscar_por_nome.js";
import { registerBuscarPorTipo } from "../src/tools/buscar_por_tipo.js";
import { registerListarEquipamentos } from "../src/tools/listar_equipamentos.js";
import { registerListarLeitos } from "../src/tools/listar_leitos.js";
import { registerListarProfissionais } from "../src/tools/listar_profissionais.js";
import { registerListarServicos } from "../src/tools/listar_servicos.js";
import { seedDatabase } from "../tests/fixtures/seed.js";

export type EvalCase = {
  id: string;
  description: string;
  tool: string;
  args: Record<string, unknown>;
  validate: (result: Record<string, unknown>) => boolean;
};

export async function runEvals(cases: EvalCase[]): Promise<void> {
  const db = getInMemoryDb();
  seedDatabase(db);

  const server = new McpServer({ name: "eval-cnes", version: "1.1.0" });
  const repo = new CnesRepository(() => db);

  registerBuscarPorCodigoCnes(server, repo);
  registerBuscarPorNome(server, repo);
  registerBuscarPorMunicipio(server, repo);
  registerBuscarPorTipo(server, repo);
  registerListarProfissionais(server, repo);
  registerListarLeitos(server, repo);
  registerListarEquipamentos(server, repo);
  registerListarServicos(server, repo);

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "eval-client", version: "0.0.1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  let passed = 0;
  let failed = 0;

  for (const ec of cases) {
    const start = Date.now();
    try {
      const result = await client.callTool({ name: ec.tool, arguments: ec.args });
      const ms = Date.now() - start;
      // v1.1: structuredContent encapsulado em {data, _meta} — extrai data para validação
      const sc = (result.structuredContent ?? {}) as Record<string, unknown>;
      const structured = (sc.data ?? sc) as Record<string, unknown>;
      const ok = !result.isError && ec.validate(structured) && ms < 500;
      if (ok) {
        console.log(`  ✓ [${ms}ms] ${ec.id}: ${ec.description}`);
        passed++;
      } else {
        console.error(`  ✗ [${ms}ms] ${ec.id}: ${ec.description}`);
        if (result.isError) console.error("    → tool retornou erro");
        if (ms >= 500) console.error(`    → latência ${ms}ms excede 500ms`);
        if (!ec.validate(structured)) console.error("    → validate() retornou false");
        failed++;
      }
    } catch (err) {
      console.error(`  ✗ ${ec.id}: ${ec.description} — exceção: ${err}`);
      failed++;
    }
  }

  console.log(`\nEvals: ${passed} passaram, ${failed} falharam (total ${cases.length})`);
  if (failed > 0) process.exit(1);
}
