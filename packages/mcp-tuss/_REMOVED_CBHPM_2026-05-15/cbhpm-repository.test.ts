import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb } from "../fixtures.js";
import { CbhpmRepository } from "../../src/domain/cbhpm-repository.js";
import { CBHPM_EDICAO } from "../../src/constants.js";
import type Database from "better-sqlite3";

let repo: CbhpmRepository;

beforeAll(() => {
  const db = createTestDb() as Database.Database;
  repo = new CbhpmRepository(db);
});

describe("CbhpmRepository", () => {
  it("getMeta() retorna TerminologiaMeta com terminologia='CBHPM'", () => {
    const meta = repo.getMeta();
    expect(meta.terminologia).toBe("CBHPM");
    expect(meta.versao).toBe(CBHPM_EDICAO);
    expect(typeof meta.defasagem_dias).toBe("number");
    expect(meta.defasagem_dias).toBeGreaterThanOrEqual(0);
    expect(meta.modo).toBe("cache_local");
  });

  it("getMeta() retorna status ok ou stale", () => {
    const meta = repo.getMeta();
    expect(["ok", "stale"]).toContain(meta.status);
  });

  it("getHierarquia retorna hierarquia válida para código com CBHPM", () => {
    const result = repo.getHierarquia("10101012");
    expect(result.data.hierarquia).not.toBeNull();
    expect(result.data.hierarquia?.capitulo).toBeTruthy();
    expect(result.data.hierarquia?.grupo).toBeTruthy();
    expect(result._meta.terminologia).toBe("CBHPM");
    expect(result._meta.versao).toBe(CBHPM_EDICAO);
  });

  it("getHierarquia retorna hierarquia null para código sem CBHPM", () => {
    const result = repo.getHierarquia("99999999");
    expect(result.data.hierarquia).toBeNull();
    expect(result._meta.terminologia).toBe("CBHPM");
  });

  it("getHierarquia retorna descricaoTuss quando código existe na Tab. 22", () => {
    const result = repo.getHierarquia("10101012");
    expect(result.data.descricaoTuss).toContain("Consulta");
  });

  it("getHierarquia retorna _meta com fonte e defasagem_dias", () => {
    const result = repo.getHierarquia("10101012");
    expect(result._meta.fonte).toBeTruthy();
    expect(typeof result._meta.defasagem_dias).toBe("number");
    expect(typeof result._meta.data_da_base).toBe("string");
  });
});
