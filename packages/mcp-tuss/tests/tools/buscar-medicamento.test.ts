import { describe, expect, it } from "vitest";
import { buscarMedicamentoHandler } from "../../src/tools/buscar-medicamento.js";
import { createEmptyDb, createRepo, createSeededDb } from "../helpers.js";

describe("buscar_medicamento_tuss", () => {
  it("retorna medicamento por código exato", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarMedicamentoHandler({ codigo: "90010012", limit: 20 }, repo);
    expect(result.data).toHaveLength(1);
    expect((result.data[0] as { termo: string }).termo).toContain("Dipirona");
  });

  it("busca por query retorna resultados", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarMedicamentoHandler({ query: "Amox", limit: 20 }, repo);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  it("inclui _meta com modo cache_local", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarMedicamentoHandler({ query: "Dipirona", limit: 20 }, repo);
    expect(result._meta.modo).toBe("cache_local");
    expect(result._meta.competencia).toBe("202603");
    expect(result.disclaimer).toBeTruthy();
    expect((result.disclaimer as string).length).toBeGreaterThan(50);
  });

  it("cache vazio retorna modo cache_vazio", () => {
    const repo = createRepo(createEmptyDb());
    const result = buscarMedicamentoHandler({ codigo: "90010012", limit: 20 }, repo);
    expect(result._meta.modo).toBe("cache_vazio");
    expect(result.disclaimer).toBeTruthy();
  });

  it("sem codigo nem query retorna erro orientativo", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarMedicamentoHandler({ limit: 20 }, repo);
    expect(result.data).toHaveLength(0);
    expect((result as { error?: string }).error).toBe("Informe `codigo` ou `query`.");
    expect(result._meta).toBeDefined();
    expect(result.disclaimer).toBeTruthy();
  });
});
