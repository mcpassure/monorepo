import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IBularioRepository } from "../../src/domain/repository.js";
import type { Meta } from "../../src/schemas/tools.js";
import { registerBuscarPorPrincipioAtivo } from "../../src/tools/buscar-por-principio-ativo.js";
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
    searchByName: vi.fn(),
    searchByPrincipalAtivo: vi.fn().mockResolvedValue({
      data: [{ numProcesso: "456", nomeProduto: "DIPIRONA GENÉRICO", empresa: "GENÉRICA LTDA" }],
      _meta: mockMeta,
    }),
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

describe("buscar_por_principio_ativo", () => {
  let server: McpServer;
  let repository: IBularioRepository;

  beforeEach(() => {
    server = makeServer();
    repository = makeRepository();
    registerBuscarPorPrincipioAtivo(server, repository);
  });

  it("returns structured content with data and _meta on success", async () => {
    const result = await callTool(server, "buscar_por_principio_ativo", {
      principioAtivo: "dipirona sódica",
    });
    expect(result.structuredContent).toBeDefined();
    const data = result.structuredContent?.data as StructuredData;
    expect(data.medicamentos).toHaveLength(1);
    expect(data.medicamentos[0].nomeProduto).toBe("DIPIRONA GENÉRICO");
    expect(result.structuredContent?._meta?.fonte).toBe("ANVISA / dados.anvisa.gov.br");
    expect(result.isError).toBeUndefined();
  });

  it("returns cache_local _meta when repository returns cache hit", async () => {
    const cacheMeta: Meta = { ...mockMeta, fonte: "cache_local", modo: "cache_local" };
    const newServer = makeServer();
    registerBuscarPorPrincipioAtivo(
      newServer,
      makeRepository({
        searchByPrincipalAtivo: vi.fn().mockResolvedValue({
          data: [{ numProcesso: "999", nomeProduto: "CACHED PA", empresa: "C" }],
          _meta: cacheMeta,
        }),
      })
    );

    const result = await callTool(newServer, "buscar_por_principio_ativo", {
      principioAtivo: "dipirona",
    });
    expect(result.structuredContent?._meta?.modo).toBe("cache_local");
  });

  it("returns isError on repository failure", async () => {
    const failRepo = makeRepository({
      searchByPrincipalAtivo: vi.fn().mockRejectedValue(new Error("Timeout")),
    });
    const newServer = makeServer();
    registerBuscarPorPrincipioAtivo(newServer, failRepo);

    const result = await callTool(newServer, "buscar_por_principio_ativo", {
      principioAtivo: "test",
    });
    expect(result.isError).toBe(true);
    expect(result.content?.[0].text).toContain("Timeout");
  });
});
