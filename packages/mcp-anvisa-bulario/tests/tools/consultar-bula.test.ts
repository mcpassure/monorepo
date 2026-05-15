import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IBularioRepository } from "../../src/domain/repository.js";
import type { Meta } from "../../src/schemas/tools.js";
import { registerConsultarBula } from "../../src/tools/consultar-bula.js";
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
      data: {
        numProcesso: "123",
        nomeProduto: "NOVALGINA",
        empresa: "SANOFI",
        tarja: "VERMELHA",
        classesTerapeuticas: ["ANALGÉSICOS"],
        principioAtivo: "dipirona sódica",
        idBulaPacienteProtegido: "bula_pac_id",
        idBulaProfissionalProtegido: "bula_pro_id",
      },
      _meta: mockMeta,
    }),
    getApresentacoes: vi.fn(),
    getBulaLink: vi.fn().mockResolvedValue({
      data: { id: "bula_pac_id", urlPdf: "https://consultas.anvisa.gov.br/bula.pdf" },
      _meta: mockMeta,
    }),
    ...override,
  };
}

type StructuredData = {
  nomeProduto: string;
  tarja?: string;
  principioAtivo?: string;
  bulaPaciente?: unknown;
  bulaProfissional?: unknown;
};

describe("consultar_bula", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerConsultarBula(server, makeRepository());
  });

  it("returns structured bula with data and _meta", async () => {
    const result = await callTool(server, "consultar_bula", { numProcesso: "123" });
    expect(result.structuredContent).toBeDefined();
    const data = result.structuredContent?.data as StructuredData;
    expect(data.nomeProduto).toBe("NOVALGINA");
    expect(data.tarja).toBe("VERMELHA");
    expect(data.principioAtivo).toBe("dipirona sódica");
    // v2.0: bula PDF not available from CSV, bulaPaciente is null
    expect(data.bulaPaciente).toBeNull();
    expect(result.structuredContent?._meta?.fonte).toBe("ANVISA / dados.anvisa.gov.br");
    expect(result.isError).toBeUndefined();
  });

  it("returns isError when getDetalhes fails", async () => {
    const failServer = new McpServer({ name: "test", version: "0.0.1" });
    registerConsultarBula(
      failServer,
      makeRepository({
        getDetalhes: vi.fn().mockRejectedValue(new Error("Not found")),
      })
    );

    const result = await callTool(failServer, "consultar_bula", { numProcesso: "000" });
    expect(result.isError).toBe(true);
  });

  it("returns bula without bulaPaciente when idBulaPacienteProtegido is missing", async () => {
    const srv = new McpServer({ name: "test", version: "0.0.1" });
    registerConsultarBula(
      srv,
      makeRepository({
        getDetalhes: vi.fn().mockResolvedValue({
          data: {
            numProcesso: "999",
            nomeProduto: "SEM BULA",
            empresa: "TEST",
          },
          _meta: mockMeta,
        }),
      })
    );

    const result = await callTool(srv, "consultar_bula", { numProcesso: "999" });
    const data = result.structuredContent?.data as StructuredData;
    // v2.0: bulaPaciente/bulaProfissional are explicitly null (not undefined)
    expect(data.bulaPaciente).toBeNull();
    expect(data.bulaProfissional).toBeNull();
  });
});
