// Testa as 8 tools MCP via McpServer real + InMemoryTransport.

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
import {
  assertContains,
  assertEqual,
  assertGreater,
  assertGreaterOrEqual,
  assertMatch,
  assertNotNull,
  assertTrue,
} from "../helpers/assert.js";
import type { Reporter } from "../helpers/reporter.js";

const SUITE = "t02-tools";
const HC_FMUSP = "2077485";
const INCOR = "2079046";
const HU_UFSC = "3467485";
const INCA = "2270295";

async function buildClient(db: Database.Database): Promise<Client> {
  const server = new McpServer({ name: "test-cnes", version: "1.1.0" });
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
  const client = new Client({ name: "test-client", version: "0.0.1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

// Helper: extrai data do structuredContent (encapsulado em {data, _meta})
async function call<T>(client: Client, tool: string, args: Record<string, unknown>): Promise<T> {
  const result = await client.callTool({ name: tool, arguments: args });
  if (result.isError) throw new Error(`Tool error: ${JSON.stringify(result.content)}`);
  const sc = result.structuredContent as { data?: T; _meta?: unknown } | undefined;
  return (sc?.data ?? sc ?? {}) as T;
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

export async function runToolTests(db: Database.Database, reporter: Reporter): Promise<void> {
  console.log("\n🔧 Suite: Tools MCP (8 ferramentas)");
  const client = await buildClient(db);

  // ── buscar_por_codigo_cnes ────────────────────────────────────────────────

  await run("T01", "buscar_por_codigo_cnes: HC FMUSP retorna encontrado=true", async () => {
    const r = await call<{ encontrado: boolean; estabelecimento?: { nomeFantasia: string } }>(
      client, "buscar_por_codigo_cnes", { codigoCnes: HC_FMUSP }
    );
    assertEqual(r.encontrado, true);
    assertNotNull(r.estabelecimento);
    assertTrue(r.estabelecimento.nomeFantasia.toUpperCase().includes("CLINICAS"));
  }, reporter);

  await run("T02", "buscar_por_codigo_cnes: CNES inexistente retorna encontrado=false", async () => {
    const r = await call<{ encontrado: boolean }>(
      client, "buscar_por_codigo_cnes", { codigoCnes: "0000001" }
    );
    assertEqual(r.encontrado, false);
  }, reporter);

  await run("T03", "buscar_por_codigo_cnes: InCor retorna hospital especializado", async () => {
    const r = await call<{ encontrado: boolean; estabelecimento?: { nomeFantasia: string } }>(
      client, "buscar_por_codigo_cnes", { codigoCnes: INCOR }
    );
    assertEqual(r.encontrado, true);
    assertNotNull(r.estabelecimento);
  }, reporter);

  await run("T04", "buscar_por_codigo_cnes: CNES inválido (não 7 dígitos) retorna erro de validação", async () => {
    let threw = false;
    try {
      await call(client, "buscar_por_codigo_cnes", { codigoCnes: "123" });
    } catch {
      threw = true;
    }
    assertTrue(threw, "input com 3 dígitos deve falhar na validação Zod");
  }, reporter);

  // ── buscar_por_nome ────────────────────────────────────────────────────────

  await run("T05", "buscar_por_nome: 'clinicas' retorna resultados em SP", async () => {
    const r = await call<{ total: number; estabelecimentos: unknown[] }>(
      client, "buscar_por_nome", { nome: "clinicas", uf: "SP" }
    );
    assertGreater(r.total, 0);
    assertGreater(r.estabelecimentos.length, 0);
  }, reporter);

  await run("T06", "buscar_por_nome: limite máximo 50", async () => {
    const r = await call<{ total: number }>(
      client, "buscar_por_nome", { nome: "hospital", limit: 50 }
    );
    assertTrue(r.total <= 50);
  }, reporter);

  await run("T07", "buscar_por_nome: nome com menos de 3 caracteres retorna erro", async () => {
    let threw = false;
    try { await call(client, "buscar_por_nome", { nome: "ab" }); } catch { threw = true; }
    assertTrue(threw, "nome com 2 chars deve falhar na validação");
  }, reporter);

  await run("T08", "buscar_por_nome: busca sem UF retorna resultados", async () => {
    const r = await call<{ total: number }>(
      client, "buscar_por_nome", { nome: "hospital" }
    );
    assertGreater(r.total, 0);
  }, reporter);

  // ── buscar_por_municipio ───────────────────────────────────────────────────

  await run("T09", "buscar_por_municipio: São Paulo (355030) retorna estabelecimentos", async () => {
    const r = await call<{ total: number; estabelecimentos: Array<{ codigoIbge: string }> }>(
      client, "buscar_por_municipio", { codigoIbge: "355030" }
    );
    assertGreater(r.total, 0);
    assertTrue(r.estabelecimentos.every((e) => e.codigoIbge === "355030"));
  }, reporter);

  await run("T10", "buscar_por_municipio: Florianópolis (420540) retorna HU UFSC", async () => {
    const r = await call<{ total: number; estabelecimentos: Array<{ codigoCnes: string }> }>(
      client, "buscar_por_municipio", { codigoIbge: "420540" }
    );
    assertGreater(r.total, 0);
    assertContains(r.estabelecimentos, (e) => e.codigoCnes === HU_UFSC);
  }, reporter);

  await run("T11", "buscar_por_municipio: IBGE inexistente retorna total 0", async () => {
    const r = await call<{ total: number }>(
      client, "buscar_por_municipio", { codigoIbge: "000000" }
    );
    assertEqual(r.total, 0);
  }, reporter);

  // ── buscar_por_tipo ────────────────────────────────────────────────────────

  await run("T12", "buscar_por_tipo: hospitais em SP retornam resultados", async () => {
    const r = await call<{ total: number }>(
      client, "buscar_por_tipo", { tipo: "hospital", uf: "SP" }
    );
    assertGreater(r.total, 0);
  }, reporter);

  await run("T13", "buscar_por_tipo: hospitais em SC retornam HU UFSC", async () => {
    const r = await call<{ total: number; estabelecimentos: Array<{ codigoCnes: string }> }>(
      client, "buscar_por_tipo", { tipo: "hospital", uf: "SC" }
    );
    assertGreaterOrEqual(r.total, 1);
    assertContains(r.estabelecimentos, (e) => e.codigoCnes === HU_UFSC);
  }, reporter);

  await run("T14", "buscar_por_tipo: tipo com município filtra corretamente", async () => {
    const r = await call<{ total: number }>(
      client, "buscar_por_tipo", { tipo: "hospital", codigoIbge: "355030" }
    );
    assertGreater(r.total, 0);
  }, reporter);

  // ── listar_profissionais ───────────────────────────────────────────────────

  await run("T15", "listar_profissionais: HC FMUSP tem profissionais", async () => {
    const r = await call<{ total: number; profissionais: Array<{ cpf?: string }> }>(
      client, "listar_profissionais", { codigoCnes: HC_FMUSP }
    );
    assertGreaterOrEqual(r.total, 10);
  }, reporter);

  await run("T16", "listar_profissionais: CPFs todos mascarados", async () => {
    const r = await call<{ profissionais: Array<{ cpf?: string }> }>(
      client, "listar_profissionais", { codigoCnes: HC_FMUSP }
    );
    for (const p of r.profissionais) {
      if (p.cpf) assertMatch(p.cpf, /^\*\*\*\.\d{3}\.\d{3}-\*\*$/, `CPF não mascarado: ${p.cpf}`);
    }
  }, reporter);

  await run("T17", "listar_profissionais: CNES sem profissionais retorna total 0", async () => {
    const r = await call<{ total: number }>(
      client, "listar_profissionais", { codigoCnes: "0000001" }
    );
    assertEqual(r.total, 0);
  }, reporter);

  // ── listar_leitos ──────────────────────────────────────────────────────────

  await run("T18", "listar_leitos: HC FMUSP tem leitos UTI", async () => {
    const r = await call<{ total: number; leitos: Array<{ tipo: string }> }>(
      client, "listar_leitos", { codigoCnes: HC_FMUSP }
    );
    assertGreaterOrEqual(r.total, 8);
    assertContains(r.leitos, (l) => l.tipo.toLowerCase().includes("uti"));
  }, reporter);

  await run("T19", "listar_leitos: InCor tem UTI Coronariana", async () => {
    const r = await call<{ leitos: Array<{ tipo: string }> }>(
      client, "listar_leitos", { codigoCnes: INCOR }
    );
    assertContains(r.leitos, (l) => l.tipo.toLowerCase().includes("coronar"));
  }, reporter);

  await run("T20", "listar_leitos: INCA tem leitos clínicos e cirúrgicos", async () => {
    const r = await call<{ leitos: Array<{ tipo: string }> }>(
      client, "listar_leitos", { codigoCnes: INCA }
    );
    assertContains(r.leitos, (l) => l.tipo.toLowerCase().includes("clín"));
    assertContains(r.leitos, (l) => l.tipo.toLowerCase().includes("cirúr"));
  }, reporter);

  await run("T21", "listar_leitos: CNES sem leitos retorna total 0", async () => {
    const r = await call<{ total: number }>(
      client, "listar_leitos", { codigoCnes: "0000001" }
    );
    assertEqual(r.total, 0);
  }, reporter);

  // ── listar_equipamentos ────────────────────────────────────────────────────

  await run("T22", "listar_equipamentos: HC FMUSP tem equipamentos", async () => {
    const r = await call<{ total: number; equipamentos: Array<{ codigo: string }> }>(
      client, "listar_equipamentos", { codigoCnes: HC_FMUSP }
    );
    assertGreaterOrEqual(r.total, 5);
  }, reporter);

  await run("T23", "listar_equipamentos: HC FMUSP tem ressonância (031)", async () => {
    const r = await call<{ equipamentos: Array<{ codigo: string }> }>(
      client, "listar_equipamentos", { codigoCnes: HC_FMUSP }
    );
    assertContains(r.equipamentos, (e) => e.codigo === "031");
  }, reporter);

  await run("T24", "listar_equipamentos: INCA tem radioterapia (017)", async () => {
    const r = await call<{ equipamentos: Array<{ codigo: string }> }>(
      client, "listar_equipamentos", { codigoCnes: INCA }
    );
    assertContains(r.equipamentos, (e) => e.codigo === "017");
  }, reporter);

  await run("T25", "listar_equipamentos: CNES sem equipamentos retorna total 0", async () => {
    const r = await call<{ total: number }>(
      client, "listar_equipamentos", { codigoCnes: "0000001" }
    );
    assertEqual(r.total, 0);
  }, reporter);

  // ── listar_servicos ────────────────────────────────────────────────────────

  await run("T26", "listar_servicos: HC FMUSP tem serviços especializados", async () => {
    const r = await call<{ total: number }>(
      client, "listar_servicos", { codigoCnes: HC_FMUSP }
    );
    assertGreaterOrEqual(r.total, 5);
  }, reporter);

  await run("T27", "listar_servicos: INCA tem serviço de oncologia", async () => {
    const r = await call<{ servicos: Array<{ descricao: string }> }>(
      client, "listar_servicos", { codigoCnes: INCA }
    );
    assertContains(r.servicos, (s) =>
      (s.descricao ?? "").toLowerCase().includes("oncol")
    );
  }, reporter);

  await run("T28", "listar_servicos: CNES sem serviços retorna total 0", async () => {
    const r = await call<{ total: number }>(
      client, "listar_servicos", { codigoCnes: "0000001" }
    );
    assertEqual(r.total, 0);
  }, reporter);

  // ── structuredContent ─────────────────────────────────────────────────────

  await run("T29", "todas as tools retornam structuredContent", async () => {
    const tools = [
      { name: "buscar_por_codigo_cnes", args: { codigoCnes: HC_FMUSP } },
      { name: "buscar_por_nome", args: { nome: "clinicas" } },
      { name: "buscar_por_municipio", args: { codigoIbge: "355030" } },
      { name: "buscar_por_tipo", args: { tipo: "hospital", uf: "SP" } },
      { name: "listar_profissionais", args: { codigoCnes: HC_FMUSP } },
      { name: "listar_leitos", args: { codigoCnes: HC_FMUSP } },
      { name: "listar_equipamentos", args: { codigoCnes: HC_FMUSP } },
      { name: "listar_servicos", args: { codigoCnes: HC_FMUSP } },
    ];
    for (const t of tools) {
      const result = await client.callTool({ name: t.name, arguments: t.args });
      assertTrue(!result.isError, `${t.name} retornou isError`);
      assertNotNull(result.structuredContent, `${t.name} sem structuredContent`);
    }
  }, reporter);

  await run("T30", "latência de todas as tools < 500ms com SQLite local", async () => {
    const tools = [
      { name: "buscar_por_codigo_cnes", args: { codigoCnes: HC_FMUSP } },
      { name: "listar_leitos", args: { codigoCnes: HC_FMUSP } },
      { name: "listar_equipamentos", args: { codigoCnes: HC_FMUSP } },
      { name: "listar_profissionais", args: { codigoCnes: HC_FMUSP } },
      { name: "listar_servicos", args: { codigoCnes: HC_FMUSP } },
    ];
    for (const t of tools) {
      const start = Date.now();
      await client.callTool({ name: t.name, arguments: t.args });
      const ms = Date.now() - start;
      assertTrue(ms < 500, `${t.name} demorou ${ms}ms (limite: 500ms)`);
    }
  }, reporter);
}
