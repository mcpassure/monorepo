import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import { getInMemoryDb } from "../../src/db/connection.js";
import { CnesRepository } from "../../src/domain/repository.js";
import { registerPrompts } from "../../src/prompts/index.js";
import { registerResources } from "../../src/resources/index.js";
import { registerBuscarPorCodigoCnes } from "../../src/tools/buscar_por_codigo_cnes.js";
import { registerBuscarPorMunicipio } from "../../src/tools/buscar_por_municipio.js";
import { registerBuscarPorNome } from "../../src/tools/buscar_por_nome.js";
import { registerBuscarPorTipo } from "../../src/tools/buscar_por_tipo.js";
import { registerListarEquipamentos } from "../../src/tools/listar_equipamentos.js";
import { registerListarLeitos } from "../../src/tools/listar_leitos.js";
import { registerListarProfissionais } from "../../src/tools/listar_profissionais.js";
import { registerListarServicos } from "../../src/tools/listar_servicos.js";
import { seedDatabase } from "../fixtures/seed.js";

let client: Client;
let db: Database.Database;

beforeAll(async () => {
  db = getInMemoryDb();
  seedDatabase(db);

  const server = new McpServer({ name: "test-cnes-r13-r16", version: "1.1.2" });
  const repo = new CnesRepository(() => db);

  registerBuscarPorCodigoCnes(server, repo);
  registerBuscarPorNome(server, repo);
  registerBuscarPorMunicipio(server, repo);
  registerBuscarPorTipo(server, repo);
  registerListarProfissionais(server, repo);
  registerListarLeitos(server, repo);
  registerListarEquipamentos(server, repo);
  registerListarServicos(server, repo);
  registerPrompts(server, repo);
  registerResources(server, repo);

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client-r13-r16", version: "0.0.1" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

describe("R13 — Prompts MCP", () => {
  it("lista exatamente 3 prompts registrados", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts).toHaveLength(3);
    const names = prompts.map((p) => p.name);
    expect(names).toContain("perfil_estabelecimento");
    expect(names).toContain("mapear_rede_municipio");
    expect(names).toContain("analisar_cobertura_uf");
  });

  it("perfil_estabelecimento retorna mensagem estruturada para CNES válido", async () => {
    const result = await client.getPrompt({
      name: "perfil_estabelecimento",
      arguments: {
        codigo_cnes: "2077485",
        incluir_profissionais: "true",
        incluir_leitos: "true",
        incluir_equipamentos: "false",
        incluir_servicos: "false",
      },
    });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    const content = result.messages[0].content;
    expect(content.type).toBe("text");
    const text = (content as { type: "text"; text: string }).text;
    expect(text).toContain("2077485");
    expect(text).toContain("Profissionais:");
  });

  it("mapear_rede_municipio retorna instrução de IBGE para nome de município", async () => {
    const result = await client.getPrompt({
      name: "mapear_rede_municipio",
      arguments: { municipio: "Campinas", limite: "10" },
    });
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text.toLowerCase()).toContain("ibge");
  });

  it("analisar_cobertura_uf retorna análise para UF com dados", async () => {
    const result = await client.getPrompt({
      name: "analisar_cobertura_uf",
      arguments: { uf: "SP", agrupar_por: "tipo" },
    });
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("SP");
  });
});

describe("R14 — Resources MCP", () => {
  it("lista exatamente 3 resources registrados", async () => {
    const { resources } = await client.listResources();
    expect(resources).toHaveLength(3);
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain("cnes://tipos_estabelecimento");
    expect(uris).toContain("cnes://categorias_servicos");
    expect(uris).toContain("cnes://scope");
  });

  it("cnes://tipos_estabelecimento retorna JSON com lista de tipos", async () => {
    const result = await client.readResource({ uri: "cnes://tipos_estabelecimento" });
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.mimeType).toBe("application/json");
    const parsed = JSON.parse((content as { uri: string; text: string }).text) as {
      tipos_estabelecimento: unknown[];
    };
    expect(parsed.tipos_estabelecimento.length).toBeGreaterThan(0);
  });

  it("cnes://categorias_servicos retorna JSON com categorias", async () => {
    const result = await client.readResource({ uri: "cnes://categorias_servicos" });
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.mimeType).toBe("application/json");
    const parsed = JSON.parse((content as { uri: string; text: string }).text) as {
      categorias_servicos: unknown[];
    };
    expect(parsed.categorias_servicos.length).toBeGreaterThan(0);
  });

  it("cnes://scope retorna markdown bilíngue", async () => {
    const result = await client.readResource({ uri: "cnes://scope" });
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.mimeType).toBe("text/markdown");
    const text = (content as { uri: string; text: string }).text;
    expect(text).toContain("CNES");
    expect(text).toContain("🇧🇷");
    expect(text).toContain("🇺🇸");
  });
});

describe("Não regressão — 8 tools ainda funcionam com prompts+resources registrados", () => {
  it("server ainda tem 8 tools registradas", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(8);
  });

  it("buscar_por_codigo_cnes funciona com prompts+resources registrados", async () => {
    const result = await client.callTool({
      name: "buscar_por_codigo_cnes",
      arguments: { codigoCnes: "2077485" },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as {
      data: { encontrado: boolean };
    };
    expect(structured.data.encontrado).toBe(true);
  });
});
