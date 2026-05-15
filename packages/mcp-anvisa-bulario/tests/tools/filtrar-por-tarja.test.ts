import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IBularioRepository } from "../../src/domain/repository.js";
import type { Meta } from "../../src/schemas/tools.js";
import { registerFiltrarPorTarja } from "../../src/tools/filtrar-por-tarja.js";
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
    searchByClasseTerapeutica: vi.fn(),
    searchByTarja: vi.fn().mockResolvedValue({
      data: [{ numProcesso: "111", nomeProduto: "RITALINA", empresa: "NOVARTIS" }],
      _meta: mockMeta,
    }),
    getDetalhes: vi.fn(),
    getApresentacoes: vi.fn(),
    getBulaLink: vi.fn(),
    ...override,
  };
}

type StructuredData = {
  medicamentos: Array<{ nomeProduto: string }>;
};

describe("filtrar_por_tarja", () => {
  let server: McpServer;
  let repository: IBularioRepository;

  beforeEach(() => {
    server = makeServer();
    repository = makeRepository();
    registerFiltrarPorTarja(server, repository);
  });

  it("returns structured content with data and _meta for PRETA tarja", async () => {
    const result = await callTool(server, "filtrar_por_tarja", { tarja: "PRETA" });
    expect(result.structuredContent).toBeDefined();
    const data = result.structuredContent?.data as StructuredData;
    expect(data.medicamentos).toHaveLength(1);
    expect(data.medicamentos[0].nomeProduto).toBe("RITALINA");
    expect(result.structuredContent?._meta?.fonte).toBe("ANVISA / dados.anvisa.gov.br");
    expect(result.isError).toBeUndefined();
  });

  it("calls repository.searchByTarja with correct tarja param", async () => {
    await callTool(server, "filtrar_por_tarja", { tarja: "VERMELHA" });
    expect(repository.searchByTarja).toHaveBeenCalledWith(
      expect.objectContaining({ tarja: "VERMELHA" })
    );
  });

  it("returns isError on repository failure", async () => {
    const failRepo = makeRepository({
      searchByTarja: vi.fn().mockRejectedValue(new Error("Forbidden")),
    });
    const newServer = makeServer();
    registerFiltrarPorTarja(newServer, failRepo);

    const result = await callTool(newServer, "filtrar_por_tarja", { tarja: "VERMELHA" });
    expect(result.isError).toBe(true);
    expect(result.content?.[0].text).toContain("Forbidden");
  });
});
