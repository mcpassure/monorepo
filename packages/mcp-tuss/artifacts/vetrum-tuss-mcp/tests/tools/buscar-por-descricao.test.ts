import { describe, it, expect, beforeAll } from "vitest";
import { createTestRepository } from "../fixtures.js";
import type { ITerminologiaRepository } from "../../src/domain/repository.js";
import { handler, inputSchema } from "../../src/tools/buscar-por-descricao.js";

let repo: ITerminologiaRepository;

beforeAll(() => {
  repo = createTestRepository();
});

describe("buscar-por-descricao", () => {
  it("encontra procedimento por texto parcial", () => {
    const input = inputSchema.parse({ texto: "Colonoscopia" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number; resultados: Array<{ codigo: string }> };
    expect(data.total).toBeGreaterThanOrEqual(3);
    expect(
      data.resultados.every((r) =>
        ["40101015", "40101023", "40101031"].includes(r.codigo)
      )
    ).toBe(true);
  });

  it("retorna resultado vazio para texto sem match", () => {
    const input = inputSchema.parse({ texto: "XYZABCABC" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number; resultados: unknown[] };
    expect(data.total).toBe(0);
    expect(data.resultados).toHaveLength(0);
  });

  it("filtra por tabela 19 (materiais/OPME)", () => {
    const input = inputSchema.parse({ texto: "titânio", tabelas: ["19"] });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number; resultados: Array<{ tabela_origem: string }> };
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.resultados.every((r) => r.tabela_origem === "19")).toBe(true);
  });

  it("filtra por tabela 20 (medicamentos)", () => {
    const input = inputSchema.parse({ texto: "Dipirona", tabelas: ["20"] });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number };
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it("filtra por tabela 18 (taxas/diárias)", () => {
    const input = inputSchema.parse({ texto: "UTI", tabelas: ["18"] });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number };
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it("suporta paginação", () => {
    const input = inputSchema.parse({ texto: "Colonoscopia", pagina: 2, por_pagina: 2 });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { resultados: unknown[]; pagina: number };
    expect(data.resultados.length).toBeLessThanOrEqual(2);
    expect(data.pagina).toBe(2);
  });

  it("rejeita texto com menos de 3 caracteres", () => {
    expect(() => inputSchema.parse({ texto: "AB" })).toThrow();
  });

  it("rejeita por_pagina maior que 100", () => {
    expect(() =>
      inputSchema.parse({ texto: "consulta", por_pagina: 101 })
    ).toThrow();
  });

  it("inclui total e info de paginação no data", () => {
    const input = inputSchema.parse({ texto: "Colonoscopia" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as object;
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("pagina");
    expect(data).toHaveProperty("por_pagina");
    expect(data).toHaveProperty("resultados");
  });

  it("retorna _meta array com terminologia=TUSS", () => {
    const input = inputSchema.parse({ texto: "Colonoscopia" });
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as Array<{ terminologia: string }>;
    expect(Array.isArray(meta)).toBe(true);
    expect(meta[0].terminologia).toBe("TUSS");
  });

  it("busca case-insensitive para 'ressonância'", () => {
    const input = inputSchema.parse({ texto: "ressonância" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number };
    expect(data.total).toBeGreaterThanOrEqual(1);
  });
});
