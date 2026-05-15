import { describe, it, expect, beforeAll } from "vitest";
import { createTestRepository } from "../fixtures.js";
import type { ITerminologiaRepository } from "../../src/domain/repository.js";
import { handler, inputSchema } from "../../src/tools/listar-cobertura-obrigatoria.js";

let repo: ITerminologiaRepository;

beforeAll(() => {
  repo = createTestRepository();
});

describe("listar-cobertura-obrigatoria", () => {
  it("lista todos os procedimentos com cobertura obrigatória", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number };
    expect(data.total).toBeGreaterThanOrEqual(3);
  });

  it("filtra por segmento AMB", () => {
    const input = inputSchema.parse({ segmento: "AMB" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as {
      resultados: Array<{ coberturas: Array<{ segmento: string; coberto: boolean }> }>;
    };
    expect(
      data.resultados.every((r) =>
        r.coberturas.some((c) => c.segmento === "AMB" && c.coberto)
      )
    ).toBe(true);
  });

  it("filtra por segmento HCO", () => {
    const input = inputSchema.parse({ segmento: "HCO" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { total: number };
    expect(data.total).toBeGreaterThanOrEqual(3);
  });

  it("filtra com com_dut=true retorna apenas procedimentos com DUT", () => {
    const input = inputSchema.parse({ com_dut: true });
    const result = handler(input, repo);

    const data = result.structuredContent.data as {
      total: number;
      resultados: Array<{ tem_dut: boolean }>;
    };
    expect(data.resultados.every((r) => r.tem_dut === true)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it("filtra com com_dut=false retorna procedimentos sem DUT", () => {
    const input = inputSchema.parse({ com_dut: false });
    const result = handler(input, repo);

    const data = result.structuredContent.data as {
      resultados: Array<{ tem_dut: boolean }>;
    };
    expect(data.resultados.every((r) => r.tem_dut === false)).toBe(true);
  });

  it("suporta paginação corretamente", () => {
    const input = inputSchema.parse({ pagina: 1, por_pagina: 2 });
    const result = handler(input, repo);

    const data = result.structuredContent.data as {
      resultados: unknown[];
      pagina: number;
      por_pagina: number;
    };
    expect(data.resultados.length).toBeLessThanOrEqual(2);
    expect(data.pagina).toBe(1);
    expect(data.por_pagina).toBe(2);
  });

  it("rejeita segmento inválido", () => {
    expect(() => inputSchema.parse({ segmento: "INVALIDO" })).toThrow();
  });

  it("rejeita por_pagina maior que 200", () => {
    expect(() => inputSchema.parse({ por_pagina: 201 })).toThrow();
  });

  it("inclui _meta com [TUSS, Rol ANS] e disclaimer", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as Array<{ terminologia: string }>;
    expect(Array.isArray(meta)).toBe(true);
    expect(meta.length).toBe(2);
    expect(meta[0].terminologia).toBe("TUSS");
    expect(meta[1].terminologia).toBe("Rol ANS");
    expect(result.structuredContent.disclaimer).toBeTruthy();
  });

  it("texto do content reflete segmento quando filtrado", () => {
    const input = inputSchema.parse({ segmento: "HSO" });
    const result = handler(input, repo);

    expect(result.content[0].text).toContain("HSO");
  });
});
