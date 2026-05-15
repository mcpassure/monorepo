import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb } from "../fixtures.js";
import { TussRepository } from "../../src/domain/tuss-repository.js";
import type Database from "better-sqlite3";

let repo: TussRepository;

beforeAll(() => {
  const db = createTestDb() as Database.Database;
  repo = new TussRepository(db);
});

describe("TussRepository", () => {
  it("getMeta() retorna TerminologiaMeta com terminologia=TUSS", () => {
    const meta = repo.getMeta();
    expect(meta.terminologia).toBe("TUSS");
    expect(typeof meta.versao).toBe("string");
    expect(typeof meta.defasagem_dias).toBe("number");
    expect(meta.defasagem_dias).toBeGreaterThanOrEqual(0);
    expect(meta.modo).toBe("cache_local");
  });

  it("getMeta() retorna status ok ou stale", () => {
    const meta = repo.getMeta();
    expect(["ok", "stale"]).toContain(meta.status);
  });

  it("findByCodigo retorna record + _meta para código existente", () => {
    const result = repo.findByCodigo("10101012");
    expect(result.data.record).not.toBeNull();
    expect(result.data.record?.codigo).toBe("10101012");
    expect(result.data.record?.tabela_origem).toBe("22");
    expect(result._meta.terminologia).toBe("TUSS");
    expect(result._meta.versao).toBeTruthy();
  });

  it("findByCodigo retorna record null + _meta válido para código inexistente", () => {
    const result = repo.findByCodigo("99999999");
    expect(result.data.record).toBeNull();
    expect(result._meta.terminologia).toBe("TUSS");
    expect(typeof result._meta.defasagem_dias).toBe("number");
  });

  it("findByCodigo retorna coberturas e hierarquia para código existente", () => {
    const result = repo.findByCodigo("10101012");
    expect(Array.isArray(result.data.coberturas)).toBe(true);
    expect(result.data.coberturas.length).toBeGreaterThan(0);
    expect(result.data.hierarquia).not.toBeNull();
  });

  it("findByCodigo retorna material de Tab. 19 corretamente", () => {
    const result = repo.findByCodigo("98765432");
    expect(result.data.record?.tabela_origem).toBe("19");
    expect(result.data.record?.tipo).toBe("opme");
    expect(result._meta.terminologia).toBe("TUSS");
  });

  it("searchByText retorna ResultadoPaginado + _meta com terminologia=TUSS", () => {
    const result = repo.searchByText({
      texto: "Colonoscopia",
      tabelas: ["22"],
      pagina: 1,
      porPagina: 10,
    });
    expect(result.data.total).toBeGreaterThanOrEqual(3);
    expect(result.data.resultados.length).toBeGreaterThan(0);
    expect(result._meta.terminologia).toBe("TUSS");
  });

  it("searchByText filtra por tabela 19 corretamente", () => {
    const result = repo.searchByText({
      texto: "titânio",
      tabelas: ["19"],
      pagina: 1,
      porPagina: 20,
    });
    expect(result.data.resultados.every((r) => r.tabela_origem === "19")).toBe(true);
    expect(result._meta.terminologia).toBe("TUSS");
  });

  it("listByCategoria retorna registros da categoria correta + _meta", () => {
    const result = repo.listByCategoria({
      categoria: "opme",
      pagina: 1,
      porPagina: 50,
    });
    expect(result.data.resultados.length).toBeGreaterThanOrEqual(1);
    expect(result.data.resultados.every((r) => r.tipo === "opme")).toBe(true);
    expect(result._meta.terminologia).toBe("TUSS");
  });
});
