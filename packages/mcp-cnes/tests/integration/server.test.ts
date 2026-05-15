import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import { getInMemoryDb } from "../../src/db/connection.js";
import { CnesRepository } from "../../src/domain/repository.js";
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
  client = new Client({ name: "test-client", version: "0.0.1" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

describe("MCP server tools", () => {
  it("lista exatamente 8 tools", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(8);
    const names = tools.map((t) => t.name);
    expect(names).toContain("buscar_por_codigo_cnes");
    expect(names).toContain("buscar_por_nome");
    expect(names).toContain("buscar_por_municipio");
    expect(names).toContain("buscar_por_tipo");
    expect(names).toContain("listar_profissionais");
    expect(names).toContain("listar_leitos");
    expect(names).toContain("listar_equipamentos");
    expect(names).toContain("listar_servicos");
  });

  it("buscar_por_codigo_cnes retorna HC FMUSP com _meta", async () => {
    const result = await client.callTool({
      name: "buscar_por_codigo_cnes",
      arguments: { codigoCnes: "2077485" },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as {
      data: { encontrado: boolean; estabelecimento: { nomeFantasia: string } };
      _meta: { modo: string; fonte: string };
    };
    expect(structured.data.encontrado).toBe(true);
    expect(structured.data.estabelecimento.nomeFantasia).toContain("CLINICAS");
    expect(structured._meta).toBeDefined();
    expect(structured._meta.modo).toBe("cache_local");
    expect(structured._meta.fonte).toBe("DATASUS FTP CNES");
  });

  it("buscar_por_codigo_cnes retorna not found para CNES inexistente", async () => {
    const result = await client.callTool({
      name: "buscar_por_codigo_cnes",
      arguments: { codigoCnes: "0000001" },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as {
      data: { encontrado: boolean };
      _meta: unknown;
    };
    expect(structured.data.encontrado).toBe(false);
    expect(structured._meta).toBeDefined();
  });

  it("buscar_por_nome retorna resultados com _meta", async () => {
    const result = await client.callTool({
      name: "buscar_por_nome",
      arguments: { nome: "clinicas" },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { data: { total: number }; _meta: unknown };
    expect(structured.data.total).toBeGreaterThan(0);
    expect(structured._meta).toBeDefined();
  });

  it("buscar_por_municipio retorna estabelecimentos de São Paulo com _meta", async () => {
    const result = await client.callTool({
      name: "buscar_por_municipio",
      arguments: { codigoIbge: "355030" },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { data: { total: number }; _meta: unknown };
    expect(structured.data.total).toBeGreaterThan(0);
    expect(structured._meta).toBeDefined();
  });

  it("listar_leitos retorna leitos do HC FMUSP com UTI e _meta", async () => {
    const result = await client.callTool({
      name: "listar_leitos",
      arguments: { codigoCnes: "2077485" },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as {
      data: { total: number; leitos: Array<{ tipo: string }> };
      _meta: unknown;
    };
    expect(structured.data.total).toBeGreaterThan(0);
    const temUti = structured.data.leitos.some((l) => l.tipo.toLowerCase().includes("uti"));
    expect(temUti).toBe(true);
    expect(structured._meta).toBeDefined();
  });

  it("listar_equipamentos retorna equipamentos do HC FMUSP com _meta", async () => {
    const result = await client.callTool({
      name: "listar_equipamentos",
      arguments: { codigoCnes: "2077485" },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { data: { total: number }; _meta: unknown };
    expect(structured.data.total).toBeGreaterThan(0);
    expect(structured._meta).toBeDefined();
  });

  it("listar_profissionais retorna profissionais com CPF mascarado e _meta", async () => {
    const result = await client.callTool({
      name: "listar_profissionais",
      arguments: { codigoCnes: "2077485" },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as {
      data: { total: number; profissionais: Array<{ cpf: string | null }> };
      _meta: unknown;
    };
    expect(structured.data.total).toBeGreaterThan(0);
    for (const p of structured.data.profissionais) {
      if (p.cpf) expect(p.cpf).toMatch(/^\*\*\*/);
    }
    expect(structured._meta).toBeDefined();
  });

  it("listar_servicos retorna serviços do HC FMUSP com _meta", async () => {
    const result = await client.callTool({
      name: "listar_servicos",
      arguments: { codigoCnes: "2077485" },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { data: { total: number }; _meta: unknown };
    expect(structured.data.total).toBeGreaterThan(0);
    expect(structured._meta).toBeDefined();
  });

  it("buscar_por_codigo_cnes rejeita CNES com formato inválido", async () => {
    const result = await client.callTool({
      name: "buscar_por_codigo_cnes",
      arguments: { codigoCnes: "abc" },
    });
    expect(result.isError).toBe(true);
  });
});
