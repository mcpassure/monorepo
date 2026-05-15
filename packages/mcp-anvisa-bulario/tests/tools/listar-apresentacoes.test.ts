import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IBularioRepository } from "../../src/domain/repository.js";
import type { Meta } from "../../src/schemas/tools.js";
import { registerListarApresentacoes } from "../../src/tools/listar-apresentacoes.js";
import { callTool } from "../../test-utils/mcp-helpers.js";

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
    searchByTarja: vi.fn(),
    getDetalhes: vi.fn().mockResolvedValue({
      data: { numProcesso: "123", nomeProduto: "NOVALGINA", empresa: "SANOFI" },
      _meta: mockMeta,
    }),
    getApresentacoes: vi.fn().mockResolvedValue({
      data: [
        { descricao: "500mg comprimido 20 unidades" },
        { descricao: "500mg/mL solução injetável" },
      ],
      _meta: mockMeta,
    }),
    getBulaLink: vi.fn(),
    ...override,
  };
}

type StructuredData = {
  apresentacoes: Array<{ descricao: string }>;
};

describe("listar_apresentacoes", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerListarApresentacoes(server, makeRepository());
  });

  it("returns list of apresentacoes with data and _meta", async () => {
    const result = await callTool(server, "listar_apresentacoes", { numProcesso: "123" });
    const data = result.structuredContent?.data as StructuredData;
    expect(data.apresentacoes).toHaveLength(2);
    expect(data.apresentacoes[0].descricao).toContain("500mg");
    expect(result.structuredContent?._meta?.fonte).toBe("ANVISA / dados.anvisa.gov.br");
    expect(result.isError).toBeUndefined();
  });

  it("returns empty list when repository returns no apresentacoes", async () => {
    const srv = new McpServer({ name: "t", version: "0" });
    registerListarApresentacoes(
      srv,
      makeRepository({
        getApresentacoes: vi.fn().mockResolvedValue({ data: [], _meta: mockMeta }),
      })
    );
    const result = await callTool(srv, "listar_apresentacoes", { numProcesso: "456" });
    const data = result.structuredContent?.data as StructuredData;
    expect(data.apresentacoes).toEqual([]);
  });

  it("returns isError when getDetalhes fails", async () => {
    const srv = new McpServer({ name: "t", version: "0" });
    registerListarApresentacoes(
      srv,
      makeRepository({
        getDetalhes: vi.fn().mockRejectedValue(new Error("Not found")),
      })
    );
    const result = await callTool(srv, "listar_apresentacoes", { numProcesso: "000" });
    expect(result.isError).toBe(true);
  });
});
