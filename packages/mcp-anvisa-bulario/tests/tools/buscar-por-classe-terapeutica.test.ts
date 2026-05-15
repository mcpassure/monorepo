import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IBularioRepository } from "../../src/domain/repository.js";
import type { Meta } from "../../src/schemas/tools.js";
import { registerBuscarPorClasseTerapeutica } from "../../src/tools/buscar-por-classe-terapeutica.js";
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
    searchByPrincipalAtivo: vi.fn(),
    searchByClasseTerapeutica: vi.fn().mockResolvedValue({
      data: [
        { numProcesso: "789", nomeProduto: "AMOXICILINA CÁPSULA", empresa: "PHARMA LTDA" },
        { numProcesso: "790", nomeProduto: "AZITROMICINA", empresa: "PHARMA LTDA" },
      ],
      _meta: mockMeta,
    }),
    searchByTarja: vi.fn(),
    getDetalhes: vi.fn(),
    getApresentacoes: vi.fn(),
    getBulaLink: vi.fn(),
    ...override,
  };
}

type StructuredData = {
  medicamentos: Array<{ nomeProduto: string }>;
  total: number;
};

describe("buscar_por_classe_terapeutica", () => {
  let server: McpServer;
  let repository: IBularioRepository;

  beforeEach(() => {
    server = makeServer();
    repository = makeRepository();
    registerBuscarPorClasseTerapeutica(server, repository);
  });

  it("returns structured content with multiple results and _meta", async () => {
    const result = await callTool(server, "buscar_por_classe_terapeutica", {
      classeTerapeutica: "antibiótico",
    });
    expect(result.structuredContent).toBeDefined();
    const data = result.structuredContent?.data as StructuredData;
    expect(data.medicamentos).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(result.structuredContent?._meta?.fonte).toBe("ANVISA / dados.anvisa.gov.br");
    expect(result.isError).toBeUndefined();
  });

  it("passes _meta through correctly", async () => {
    const result = await callTool(server, "buscar_por_classe_terapeutica", {
      classeTerapeutica: "antibiótico",
    });
    expect(result.structuredContent?._meta?.data_da_base).toBe("2026-05-13T00:00:00.000Z");
    expect(result.structuredContent?._meta?.modo).toBe("cache_local");
  });

  it("returns isError on repository failure", async () => {
    const failRepo = makeRepository({
      searchByClasseTerapeutica: vi.fn().mockRejectedValue(new Error("Network error")),
    });
    const newServer = makeServer();
    registerBuscarPorClasseTerapeutica(newServer, failRepo);

    const result = await callTool(newServer, "buscar_por_classe_terapeutica", {
      classeTerapeutica: "test",
    });
    expect(result.isError).toBe(true);
    expect(result.content?.[0].text).toContain("Network error");
  });
});
