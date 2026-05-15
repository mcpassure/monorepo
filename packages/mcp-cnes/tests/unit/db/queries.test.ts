import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { getInMemoryDb } from "../../../src/db/connection.js";
import { porCnes as equipamentosPorCnes } from "../../../src/db/queries/equipamentos.js";
import {
  porCodigo,
  porMunicipio,
  porNome,
  porTipo,
} from "../../../src/db/queries/estabelecimentos.js";
import { porCnes as leitosPorCnes } from "../../../src/db/queries/leitos.js";
import { porCnes as profissionaisPorCnes } from "../../../src/db/queries/profissionais.js";
import { porCnes as servicosPorCnes } from "../../../src/db/queries/servicos.js";
import { seedDatabase } from "../../fixtures/seed.js";

let db: Database.Database;

beforeEach(() => {
  db = getInMemoryDb();
  seedDatabase(db);
});

describe("estabelecimentos queries", () => {
  it("porCodigo retorna estabelecimento existente", () => {
    const result = porCodigo(db, "2077485");
    expect(result).not.toBeNull();
    expect(result?.codigoCnes).toBe("2077485");
    expect(result?.nomeFantasia).toContain("CLINICAS");
    expect(result?.source).toBe("local");
  });

  it("porCodigo retorna null para CNES inexistente", () => {
    expect(porCodigo(db, "0000001")).toBeNull();
  });

  it("porNome retorna resultados por busca parcial", () => {
    const result = porNome(db, "clinicas");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].nomeFantasia.toLowerCase()).toContain("clinicas");
  });

  it("porNome filtra por UF", () => {
    const resultSP = porNome(db, "hospital", "SP");
    const resultSC = porNome(db, "hospital", "SC");
    expect(resultSP.every((e) => e.uf === "SP")).toBe(true);
    expect(resultSC.length).toBe(0);
  });

  it("porMunicipio retorna estabelecimentos do município", () => {
    const result = porMunicipio(db, "355030");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e) => e.codigoIbge === "355030")).toBe(true);
  });

  it("porMunicipio com tipo filtra corretamente", () => {
    const result = porMunicipio(db, "355030", "hospital");
    expect(result.every((e) => e.tipo.toLowerCase().includes("hospital"))).toBe(true);
  });

  it("porTipo retorna hospitais em SP", () => {
    const result = porTipo(db, "hospital", "SP");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e) => e.uf === "SP")).toBe(true);
  });
});

describe("leitos queries", () => {
  it("porCnes retorna leitos do HC FMUSP", () => {
    const result = leitosPorCnes(db, "2077485");
    expect(result.length).toBeGreaterThan(0);
  });

  it("leitos incluem UTI adulto", () => {
    const result = leitosPorCnes(db, "2077485");
    const uti = result.find((l) => l.tipo.toLowerCase().includes("uti"));
    expect(uti).toBeDefined();
  });

  it("porCnes retorna array vazio para CNES sem leitos", () => {
    expect(leitosPorCnes(db, "0000001")).toHaveLength(0);
  });
});

describe("equipamentos queries", () => {
  it("porCnes retorna equipamentos do HC FMUSP", () => {
    const result = equipamentosPorCnes(db, "2077485");
    expect(result.length).toBeGreaterThan(0);
  });

  it("equipamentos incluem ressonância magnética", () => {
    const result = equipamentosPorCnes(db, "2077485");
    const rm = result.find(
      (e) => e.codigo === "031" || e.descricao.toLowerCase().includes("resso")
    );
    expect(rm).toBeDefined();
  });
});

describe("profissionais queries", () => {
  it("porCnes retorna profissionais com CPF mascarado no formato ***.***.XXX-**", () => {
    const result = profissionaisPorCnes(db, "2077485");
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      if (p.cpf) {
        // Formato LGPD v0.1.1: ***.***.XXX-** (preserva apenas dígitos 7-9)
        expect(p.cpf).toMatch(/^\*\*\*\.\*\*\*\.\d{3}-\*\*$/);
      }
    }
  });
});

describe("servicos queries", () => {
  it("porCnes retorna serviços do HC FMUSP", () => {
    const result = servicosPorCnes(db, "2077485");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].codigoCnes).toBe("2077485");
  });
});
