import { describe, expect, it, vi } from "vitest";
import { AllSourcesFailedError, BularioRepository } from "../../src/domain/repository.js";
import type { BularioSource } from "../../src/sources/types.js";

function makeSource(name: string, impl?: Partial<BularioSource>): BularioSource {
  const defaultData = [{ numProcesso: `proc-${name}`, nomeProduto: `MED-${name}`, empresa: "EMP" }];
  return {
    name,
    searchByName: vi.fn().mockResolvedValue(defaultData),
    searchByPrincipalAtivo: vi.fn().mockResolvedValue(defaultData),
    searchByClasseTerapeutica: vi.fn().mockResolvedValue(defaultData),
    searchByTarja: vi.fn().mockResolvedValue(defaultData),
    getDetalhes: vi.fn().mockResolvedValue({
      numProcesso: `proc-${name}`,
      nomeProduto: `MED-${name}`,
      empresa: "EMP",
    }),
    getApresentacoes: vi.fn().mockResolvedValue([{ descricao: "Categoria: Similar" }]),
    getBulaLink: vi.fn().mockResolvedValue({ id: "link-id" }),
    ...impl,
  };
}

describe("BularioRepository v2.0 — SQLite source", () => {
  it("returns cache_local _meta with source name", async () => {
    const source = makeSource("anvisa_dados_abertos_sqlite");
    const repo = new BularioRepository(source);

    const result = await repo.searchByName({ nome: "dipirona" });

    expect(result.data).toBeDefined();
    expect(result._meta.modo).toBe("cache_local");
    expect(result._meta.fonte).toBe("anvisa_dados_abertos_sqlite");
    expect(source.searchByName).toHaveBeenCalled();
  });

  it("delegates searchByName to source", async () => {
    const source = makeSource("primary");
    const repo = new BularioRepository(source);
    await repo.searchByName({ nome: "dipirona" });
    expect(source.searchByName).toHaveBeenCalledWith({ nome: "dipirona" });
  });

  it("delegates searchByPrincipalAtivo to source", async () => {
    const source = makeSource("s1");
    const repo = new BularioRepository(source);
    await repo.searchByPrincipalAtivo({ principioAtivo: "paracetamol" });
    expect(source.searchByPrincipalAtivo).toHaveBeenCalledWith({ principioAtivo: "paracetamol" });
  });

  it("delegates searchByClasseTerapeutica to source", async () => {
    const source = makeSource("s1");
    const repo = new BularioRepository(source);
    await repo.searchByClasseTerapeutica({ classeTerapeutica: "analgésico" });
    expect(source.searchByClasseTerapeutica).toHaveBeenCalledWith({
      classeTerapeutica: "analgésico",
    });
  });

  it("delegates searchByTarja to source", async () => {
    const source = makeSource("s1");
    const repo = new BularioRepository(source);
    await repo.searchByTarja({ tarja: "VERMELHA" });
    expect(source.searchByTarja).toHaveBeenCalledWith({ tarja: "VERMELHA" });
  });

  it("delegates getDetalhes to source", async () => {
    const source = makeSource("s1");
    const repo = new BularioRepository(source);
    await repo.getDetalhes("12345");
    expect(source.getDetalhes).toHaveBeenCalledWith("12345");
  });

  it("delegates getApresentacoes to source", async () => {
    const source = makeSource("s1");
    const repo = new BularioRepository(source);
    await repo.getApresentacoes("12345");
    expect(source.getApresentacoes).toHaveBeenCalledWith("12345");
  });

  it("propagates errors from source as-is", async () => {
    const source = makeSource("s1", {
      searchByName: vi.fn().mockRejectedValue(new Error("DB locked")),
    });
    const repo = new BularioRepository(source);
    await expect(repo.searchByName({ nome: "test" })).rejects.toThrow("DB locked");
  });

  it("_meta has defasagem_dias >= 0", async () => {
    const source = makeSource("s1");
    const repo = new BularioRepository(source);
    const result = await repo.searchByName({ nome: "test" });
    expect(result._meta.defasagem_dias).toBeGreaterThanOrEqual(0);
  });

  it("AllSourcesFailedError is still exported (backward compat)", () => {
    const err = new AllSourcesFailedError([{ source: "s1", error: new Error("fail") }]);
    expect(err).toBeInstanceOf(AllSourcesFailedError);
    expect(err.failures).toHaveLength(1);
  });
});
