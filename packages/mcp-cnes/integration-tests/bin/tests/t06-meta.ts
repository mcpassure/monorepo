// Suite t06-meta — valida presença e correção de _meta em todos os outputs (v1.1.1)
//
// v1.1.1: union de modo mudou de "cache_local | online_fallback" para
// "cache_local | cache_vazio" (fallback online removido).

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { CnesRepository } from "../../../src/domain/repository.js";
import { registerBuscarPorCodigoCnes } from "../../../src/tools/buscar_por_codigo_cnes.js";
import { registerBuscarPorMunicipio } from "../../../src/tools/buscar_por_municipio.js";
import { registerBuscarPorNome } from "../../../src/tools/buscar_por_nome.js";
import { registerBuscarPorTipo } from "../../../src/tools/buscar_por_tipo.js";
import { registerListarEquipamentos } from "../../../src/tools/listar_equipamentos.js";
import { registerListarLeitos } from "../../../src/tools/listar_leitos.js";
import { registerListarProfissionais } from "../../../src/tools/listar_profissionais.js";
import { registerListarServicos } from "../../../src/tools/listar_servicos.js";
import { assertEqual, assertNotNull, assertTrue } from "../helpers/assert.js";
import type { Reporter } from "../helpers/reporter.js";

const SUITE = "t06-meta";
const HC_FMUSP = "2077485";

async function buildClient(db: Database.Database): Promise<Client> {
  const server = new McpServer({ name: "test-meta", version: "1.1.1" });
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
  const client = new Client({ name: "test-meta-client", version: "0.0.1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

async function callRaw(
  client: Client,
  tool: string,
  args: Record<string, unknown>
): Promise<{ data: unknown; _meta: unknown }> {
  const result = await client.callTool({ name: tool, arguments: args });
  if (result.isError) throw new Error(`Tool error: ${JSON.stringify(result.content)}`);
  return result.structuredContent as { data: unknown; _meta: unknown };
}

function assertMetaShape(meta: unknown, context: string): void {
  assertNotNull(meta, `${context}: _meta ausente`);
  const m = meta as Record<string, unknown>;
  assertTrue(typeof m.modo === "string", `${context}: _meta.modo deve ser string`);
  assertTrue(typeof m.fonte === "string", `${context}: _meta.fonte deve ser string`);
  assertTrue(
    typeof m.defasagem_dias === "number",
    `${context}: _meta.defasagem_dias deve ser number`
  );
  assertTrue(
    m.modo === "cache_local" || m.modo === "cache_vazio",
    `${context}: _meta.modo deve ser "cache_local" ou "cache_vazio", got: ${m.modo}`
  );
}

async function run(
  id: string,
  name: string,
  fn: () => Promise<void>,
  reporter: Reporter
): Promise<void> {
  const t = Date.now();
  try {
    await fn();
    reporter.pass(id, name, SUITE, Date.now() - t);
  } catch (err) {
    reporter.fail(id, name, SUITE, Date.now() - t, String(err));
  }
}

export async function runMetaTests(db: Database.Database, reporter: Reporter): Promise<void> {
  console.log("\n🔬 Suite: _meta validation (v1.1.1)");
  const client = await buildClient(db);

  await run(
    "M01",
    "_meta presente em buscar_por_codigo_cnes (encontrado)",
    async () => {
      const r = await callRaw(client, "buscar_por_codigo_cnes", { codigoCnes: HC_FMUSP });
      assertMetaShape(r._meta, "M01");
      assertNotNull(r.data, "M01: data ausente");
      const meta = r._meta as Record<string, unknown>;
      assertEqual(meta.modo, "cache_local");
      assertEqual(meta.fonte, "DATASUS FTP CNES");
    },
    reporter
  );

  await run(
    "M02",
    "_meta presente em buscar_por_codigo_cnes (não encontrado)",
    async () => {
      const r = await callRaw(client, "buscar_por_codigo_cnes", { codigoCnes: "0000001" });
      assertMetaShape(r._meta, "M02");
    },
    reporter
  );

  await run("M03", "_meta presente em buscar_por_nome", async () => {
    const r = await callRaw(client, "buscar_por_nome", { nome: "clinicas" });
    assertMetaShape(r._meta, "M03");
  }, reporter);

  await run("M04", "_meta presente em buscar_por_municipio", async () => {
    const r = await callRaw(client, "buscar_por_municipio", { codigoIbge: "355030" });
    assertMetaShape(r._meta, "M04");
  }, reporter);

  await run("M05", "_meta presente em listar_leitos", async () => {
    const r = await callRaw(client, "listar_leitos", { codigoCnes: HC_FMUSP });
    assertMetaShape(r._meta, "M05");
  }, reporter);

  await run("M06", "_meta presente em listar_equipamentos", async () => {
    const r = await callRaw(client, "listar_equipamentos", { codigoCnes: HC_FMUSP });
    assertMetaShape(r._meta, "M06");
  }, reporter);

  await run("M07", "_meta presente em listar_profissionais", async () => {
    const r = await callRaw(client, "listar_profissionais", { codigoCnes: HC_FMUSP });
    assertMetaShape(r._meta, "M07");
  }, reporter);

  await run(
    "M08",
    "_meta modo=cache_local quando dataset populado (todas as 8 tools)",
    async () => {
      const tools = [
        { name: "buscar_por_codigo_cnes", args: { codigoCnes: HC_FMUSP } },
        { name: "buscar_por_nome", args: { nome: "hospital" } },
        { name: "buscar_por_municipio", args: { codigoIbge: "355030" } },
        { name: "buscar_por_tipo", args: { tipo: "hospital", uf: "SP" } },
        { name: "listar_profissionais", args: { codigoCnes: HC_FMUSP } },
        { name: "listar_leitos", args: { codigoCnes: HC_FMUSP } },
        { name: "listar_equipamentos", args: { codigoCnes: HC_FMUSP } },
        { name: "listar_servicos", args: { codigoCnes: HC_FMUSP } },
      ];
      for (const t of tools) {
        const r = await callRaw(client, t.name, t.args);
        assertMetaShape(r._meta, `M08/${t.name}`);
        const meta = r._meta as Record<string, unknown>;
        assertEqual(
          meta.modo,
          "cache_local",
          `M08/${t.name}: esperava cache_local, got ${meta.modo}`
        );
      }
    },
    reporter
  );
}
