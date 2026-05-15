import { describe, it, expect, beforeAll } from "vitest";
import { createTestRepository } from "../fixtures.js";
import type { ITerminologiaRepository } from "../../src/domain/repository.js";
import { handler, inputSchema } from "../../src/tools/listar-por-categoria.js";

let repo: ITerminologiaRepository;

beforeAll(() => {
  repo = createTestRepository();
});

describe("listar-por-categoria", () => {
  it("lista procedimentos (Tab. 22)", () => {
    const input = inputSchema.parse({ categoria: "procedimentos" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number; resultados: Array<{ tabela_origem: string }> };
    expect(data.total).toBeGreaterThanOrEqual(6);
    expect(data.resultados.every((r) => r.tabela_origem === "22")).toBe(true);
  });

  it("lista materiais (Tab. 19, tipo=material)", () => {
    const input = inputSchema.parse({ categoria: "materiais" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number; resultados: Array<{ tipo: string }> };
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.resultados.every((r) => r.tipo === "material")).toBe(true);
  });

  it("lista OPME (Tab. 19, tipo=opme)", () => {
    const input = inputSchema.parse({ categoria: "opme" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number; resultados: Array<{ tipo: string }> };
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.resultados.every((r) => r.tipo === "opme")).toBe(true);
  });

  it("lista medicamentos (Tab. 20)", () => {
    const input = inputSchema.parse({ categoria: "medicamentos" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number; resultados: Array<{ tabela_origem: string }> };
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.resultados.every((r) => r.tabela_origem === "20")).toBe(true);
  });

  it("lista taxas (Tab. 18, tipo=taxa)", () => {
    const input = inputSchema.parse({ categoria: "taxas" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number; resultados: Array<{ tipo: string }> };
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.resultados.every((r) => r.tipo === "taxa")).toBe(true);
  });

  it("lista diárias (Tab. 18, tipo=diaria)", () => {
    const input = inputSchema.parse({ categoria: "diarias" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number; resultados: Array<{ tipo: string }> };
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.resultados.every((r) => r.tipo === "diaria")).toBe(true);
  });

  it("suporta paginação", () => {
    const input = inputSchema.parse({ categoria: "procedimentos", pagina: 1, por_pagina: 3 });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { resultados: unknown[] };
    expect(data.resultados.length).toBeLessThanOrEqual(3);
  });

  it("rejeita categoria inválida", () => {
    expect(() => inputSchema.parse({ categoria: "invalida" })).toThrow();
  });

  it("rejeita por_pagina maior que 200", () => {
    expect(() =>
      inputSchema.parse({ categoria: "procedimentos", por_pagina: 201 })
    ).toThrow();
  });

  it("retorna _meta com terminologia=TUSS", () => {
    const input = inputSchema.parse({ categoria: "procedimentos" });
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as Array<{ terminologia: string }>;
    expect(Array.isArray(meta)).toBe(true);
    expect(meta[0].terminologia).toBe("TUSS");
    expect(result.structuredContent.disclaimer).toBeTruthy();
  });
});
