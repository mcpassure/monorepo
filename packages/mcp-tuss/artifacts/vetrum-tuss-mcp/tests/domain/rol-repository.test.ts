import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb } from "../fixtures.js";
import { RolAnsRepository } from "../../src/domain/rol-repository.js";
import type Database from "better-sqlite3";

let repo: RolAnsRepository;

beforeAll(() => {
  const db = createTestDb() as Database.Database;
  repo = new RolAnsRepository(db);
});

describe("RolAnsRepository", () => {
  it("getMeta() retorna TerminologiaMeta com terminologia='Rol ANS'", () => {
    const meta = repo.getMeta();
    expect(meta.terminologia).toBe("Rol ANS");
    expect(typeof meta.versao).toBe("string");
    expect(typeof meta.defasagem_dias).toBe("number");
    expect(meta.defasagem_dias).toBeGreaterThanOrEqual(0);
    expect(meta.modo).toBe("cache_local");
  });

  it("getCobertura retorna noRol=true para código no Rol", () => {
    const result = repo.getCobertura("10101012");
    expect(result.data.noRol).toBe(true);
    expect(Array.isArray(result.data.coberturas)).toBe(true);
    expect(result._meta.terminologia).toBe("Rol ANS");
  });

  it("getCobertura filtra por segmento corretamente", () => {
    const result = repo.getCobertura("10101012", "AMB");
    const coberturas = result.data.coberturas;
    expect(coberturas.every((c) => c.segmento === "AMB")).toBe(true);
    expect(coberturas.some((c) => c.coberto === true)).toBe(true);
  });

  it("getCobertura retorna noRol=false para código fora do Rol", () => {
    const result = repo.getCobertura("98765432");
    expect(result.data.noRol).toBe(false);
    expect(result._meta.terminologia).toBe("Rol ANS");
  });

  it("getCobertura retorna _meta com versão e defasagem", () => {
    const result = repo.getCobertura("10101012");
    expect(result._meta.versao).toBeTruthy();
    expect(typeof result._meta.defasagem_dias).toBe("number");
  });

  it("listObrigatorios retorna itens paginados + _meta com terminologia='Rol ANS'", () => {
    const result = repo.listObrigatorios({
      pagina: 1,
      porPagina: 10,
    });
    expect(result.data.total).toBeGreaterThanOrEqual(1);
    expect(result.data.pagina).toBe(1);
    expect(result._meta.terminologia).toBe("Rol ANS");
  });

  it("listObrigatorios filtra por com_dut=true corretamente", () => {
    const result = repo.listObrigatorios({
      comDut: true,
      pagina: 1,
      porPagina: 50,
    });
    expect(result.data.resultados.length).toBeGreaterThanOrEqual(1);
  });

  it("listObrigatorios retorna resultados com cobertura AMB quando segmento=AMB", () => {
    const result = repo.listObrigatorios({
      segmento: "AMB",
      pagina: 1,
      porPagina: 50,
    });
    expect(result.data.total).toBeGreaterThanOrEqual(1);
  });
});
