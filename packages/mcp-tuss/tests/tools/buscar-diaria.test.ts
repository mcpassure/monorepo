import { describe, expect, it } from "vitest";
import { buscarDiariaHandler } from "../../src/tools/buscar-diaria.js";
import { createEmptyDb, createRepo, createSeededDb } from "../helpers.js";

describe("buscar_diaria_taxa_tuss", () => {
  it("retorna diária por código", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarDiariaHandler({ codigo: "04010010", limit: 20 }, repo);
    expect(result.data).toHaveLength(1);
    expect((result.data[0] as { termo: string }).termo).toContain("UTI");
  });

  it("busca por query retorna resultados", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarDiariaHandler({ query: "internação", limit: 20 }, repo);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  it("inclui _meta válido", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarDiariaHandler({ query: "Diária", limit: 20 }, repo);
    expect(result._meta).toBeDefined();
    expect(result._meta.modo).toBe("cache_local");
    expect(result._meta.fonte).toBeTruthy();
    expect(result.disclaimer).toBeTruthy();
    expect((result.disclaimer as string).length).toBeGreaterThan(50);
  });

  it("cache vazio retorna modo cache_vazio", () => {
    const repo = createRepo(createEmptyDb());
    const result = buscarDiariaHandler({ codigo: "04010010", limit: 20 }, repo);
    expect(result._meta.modo).toBe("cache_vazio");
    expect(result.disclaimer).toBeTruthy();
  });

  it("sem codigo nem query retorna erro orientativo", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarDiariaHandler({ limit: 20 }, repo);
    expect(result.data).toHaveLength(0);
    expect((result as { error?: string }).error).toBe("Informe `codigo` ou `query`.");
    expect(result._meta).toBeDefined();
    expect(result.disclaimer).toBeTruthy();
  });
});
