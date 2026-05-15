import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IBularioRepository } from "../../src/domain/repository.js";
import type { Meta } from "../../src/schemas/tools.js";
import { registerBuscarPorNome } from "../../src/tools/buscar-por-nome.js";
import { callTool } from "../../test-utils/mcp-helpers.js";

function makeServer() {
  return new McpServer({ name: "test", version: "0.0.1" });
}

const mockMeta: Meta = {
  data_da_base: "2026-05-13T00:00:00.000Z",
  fonte: "anvisa_api",
  defasagem_dias: 0,
  modo: "online",
  status: "ok",
};

function makeRepository(override?: Partial<IBularioRepository>): IBularioRepository {
  return {
    searchByName: vi.fn().mockResolvedValue({
      data: [
        {
          numProcesso: "123",
          nomeProduto: "DIPIRONA TEST",
          empresa: "EMPRESA",
          idBulaPacienteProtegido: "abc",
        },
      ],
      _meta: mockMeta,
    }),
    searchByPrincipalAtivo: vi.fn(),
    searchByClasseTerapeutica: vi.fn(),
    searchByTarja: vi.fn(),
    getDetalhes: vi.fn(),
    getApresentacoes: vi.fn(),
    getBulaLink: vi.fn(),
    ...override,
  };
}

type StructuredData = {
  medicamentos: Array<{ nomeProduto: string }>;
};

describe("buscar_por_nome", () => {
  let server: McpServer;
  let repository: IBularioRepository;

  beforeEach(() => {
    server = makeServer();
    repository = makeRepository();
    registerBuscarPorNome(server, repository);
  });

  it("returns structured content with data and _meta on success", async () => {
    const result = await callTool(server, "buscar_por_nome", { nome: "dipirona" });
    expect(result.structuredContent).toBeDefined();
    const data = result.structuredContent?.data as StructuredData;
    expect(data.medicamentos).toHaveLength(1);
    expect(data.medicamentos[0].nomeProduto).toBe("DIPIRONA TEST");
    expect(result.structuredContent?._meta?.fonte).toBe("ANVISA / dados.anvisa.gov.br");
    expect(result.structuredContent?._meta?.modo).toBe("cache_local");
    expect(result.isError).toBeUndefined();
  });

  it("includes _meta in structuredContent on cache hit", async () => {
    const cacheMeta: Meta = { ...mockMeta, fonte: "cache_local", modo: "cache_local" };
    const repoWithCache = makeRepository({
      searchByName: vi.fn().mockResolvedValue({
        data: [{ numProcesso: "999", nomeProduto: "CACHED", empresa: "C" }],
        _meta: cacheMeta,
      }),
    });
    const newServer = makeServer();
    registerBuscarPorNome(newServer, repoWithCache);

    const result = await callTool(newServer, "buscar_por_nome", { nome: "cached" });
    const data = result.structuredContent?.data as StructuredData;
    expect(data.medicamentos[0].nomeProduto).toBe("CACHED");
    expect(result.structuredContent?._meta?.modo).toBe("cache_local");
    expect(result.structuredContent?._meta?.fonte).toBe("ANVISA / dados.anvisa.gov.br");
  });

  it("returns isError on repository failure", async () => {
    const failRepo = makeRepository({
      searchByName: vi.fn().mockRejectedValue(new Error("API down")),
    });
    const newServer = makeServer();
    registerBuscarPorNome(newServer, failRepo);

    const result = await callTool(newServer, "buscar_por_nome", { nome: "test" });
    expect(result.isError).toBe(true);
    expect(result.content?.[0].text).toContain("API down");
  });
});
