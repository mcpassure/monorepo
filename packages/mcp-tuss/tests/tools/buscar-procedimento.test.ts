import { describe, expect, it } from "vitest";
import { buscarProcedimentoHandler } from "../../src/tools/buscar-procedimento.js";
import { createEmptyDb, createRepo, createSeededDb } from "../helpers.js";

describe("buscar_procedimento_tuss", () => {
  it("retorna procedimento por código exato", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarProcedimentoHandler({ codigo: "10101012", limit: 20 }, repo);
    expect(result.data).toHaveLength(1);
    expect((result.data[0] as { codigo: string }).codigo).toBe("10101012");
    expect((result.data[0] as { termo: string }).termo).toContain("consultório");
  });

  it("retorna array vazio para código inexistente", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarProcedimentoHandler({ codigo: "99999999", limit: 20 }, repo);
    expect(result.data).toHaveLength(0);
  });

  it("busca por query retorna múltiplos resultados", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarProcedimentoHandler({ query: "Consulta", limit: 20 }, repo);
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  it("respeita limite de resultados", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarProcedimentoHandler({ query: "a", limit: 1 }, repo);
    expect(result.data.length).toBeLessThanOrEqual(1);
  });

  it("inclui _meta com modo cache_local", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarProcedimentoHandler({ codigo: "10101012", limit: 20 }, repo);
    expect(result._meta).toBeDefined();
    expect(result._meta.modo).toBe("cache_local");
    expect(result._meta.fonte).toContain("ANS TUSS");
    expect(typeof result._meta.defasagem_dias).toBe("number");
    expect(result.disclaimer).toBeTruthy();
    expect((result.disclaimer as string).length).toBeGreaterThan(50);
  });

  it("cache vazio retorna modo cache_vazio e aviso", () => {
    const repo = createRepo(createEmptyDb());
    const result = buscarProcedimentoHandler({ codigo: "10101012", limit: 20 }, repo);
    expect(result._meta.modo).toBe("cache_vazio");
    expect(result.data).toHaveLength(0);
    expect(result.disclaimer).toBeTruthy();
  });

  it("sem código nem query retorna erro orientativo", () => {
    const repo = createRepo(createSeededDb());
    const result = buscarProcedimentoHandler({ limit: 20 }, repo);
    expect("error" in result).toBe(true);
    expect(result.disclaimer).toBeTruthy();
  });
});
