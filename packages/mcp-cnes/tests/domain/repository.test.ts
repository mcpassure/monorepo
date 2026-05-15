import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { getInMemoryDb } from "../../src/db/connection.js";
import { CnesRepository } from "../../src/domain/repository.js";
import { seedDatabase } from "../fixtures/seed.js";

let db: Database.Database;
let repo: CnesRepository;

beforeEach(() => {
  db = getInMemoryDb();
  repo = new CnesRepository(() => db);
});

describe("CnesRepository — _meta construction", () => {
  it("retorna modo cache_local quando dataset populado", async () => {
    seedDatabase(db);
    const result = await repo.buscarPorCodigoCnes("2077485");
    expect(result._meta.modo).toBe("cache_local");
    expect(result._meta.fonte).toBe("DATASUS FTP CNES");
  });

  it("retorna _meta com competencia vazia quando sync_log vazio", async () => {
    seedDatabase(db);
    const result = await repo.buscarPorCodigoCnes("2077485");
    // sync_log está vazio no seed (seed não popula sync_log)
    expect(result._meta.competencia).toBe("");
    expect(result._meta.defasagem_dias).toBe(0);
    expect(result._meta.status).toBe("ok");
  });

  it("retorna _meta.competencia lida de sync_log quando preenchida", async () => {
    seedDatabase(db);
    db.prepare(
      "INSERT INTO sync_log (grupo, uf, competencia, rows_upserted, status, synced_at) VALUES (?,?,?,?,?,?)"
    ).run("ST", "SP", "202601", 100, "ok", new Date().toISOString());

    const result = await repo.buscarPorCodigoCnes("2077485");
    expect(result._meta.competencia).toBe("202601");
    expect(result._meta.data_da_base).toContain("2026-01-01");
  });

  it("calcula defasagem_dias correto para competência de janeiro 2026", async () => {
    seedDatabase(db);
    db.prepare(
      "INSERT INTO sync_log (grupo, uf, competencia, rows_upserted, status, synced_at) VALUES (?,?,?,?,?,?)"
    ).run("ST", "SP", "202601", 100, "ok", new Date().toISOString());

    const result = await repo.buscarPorCodigoCnes("2077485");
    // Base = 2026-01-01. Hoje ≥ 2026-05-13. Defasagem ≥ 132 dias.
    expect(result._meta.defasagem_dias).toBeGreaterThan(100);
  });

  it("marca status stale quando defasagem > 75 dias", async () => {
    seedDatabase(db);
    db.prepare(
      "INSERT INTO sync_log (grupo, uf, competencia, rows_upserted, status, synced_at) VALUES (?,?,?,?,?,?)"
    ).run("ST", "SP", "202601", 100, "ok", new Date().toISOString());

    const result = await repo.buscarPorCodigoCnes("2077485");
    expect(result._meta.status).toBe("stale");
  });

  it("retorna modo cache_vazio + mensagem de sync quando dataset vazio (v1.1.1)", async () => {
    // Não faz seed. Dataset vazio. Sem fallback online — espera mensagem clara.
    const result = await repo.buscarPorCodigoCnes("0000001");
    expect(result._meta.modo).toBe("cache_vazio");
    expect(result._meta.status).toBe("empty");
    expect(result.data.encontrado).toBe(false);
    expect(result.data.mensagem).toContain("sync");
  });

  it("buscarPorNome retorna cache_vazio + aviso de sync quando dataset vazio", async () => {
    const result = await repo.buscarPorNome({ nome: "qualquer", limit: 5 } as Parameters<
      typeof repo.buscarPorNome
    >[0]);
    expect(result._meta.modo).toBe("cache_vazio");
    expect(result.data.total).toBe(0);
    expect(result.data.aviso).toContain("sync");
  });

  it("todas as 8 operações retornam _meta bem formado quando dataset populado", async () => {
    seedDatabase(db);
    const operations = [
      () => repo.buscarPorCodigoCnes("2077485"),
      () =>
        repo.buscarPorNome({ nome: "clinicas", limit: 5 } as Parameters<
          typeof repo.buscarPorNome
        >[0]),
      () =>
        repo.buscarPorMunicipio({ codigoIbge: "355030", limit: 5 } as Parameters<
          typeof repo.buscarPorMunicipio
        >[0]),
      () =>
        repo.buscarPorTipo({ tipo: "hospital", limit: 5 } as Parameters<
          typeof repo.buscarPorTipo
        >[0]),
      () => repo.listarProfissionais("2077485"),
      () => repo.listarLeitos("2077485"),
      () => repo.listarEquipamentos("2077485"),
      () => repo.listarServicos("2077485"),
    ];

    for (const op of operations) {
      const result = await op();
      expect(result._meta).toBeDefined();
      expect(result._meta.modo).toBe("cache_local");
      expect(result._meta.fonte).toBe("DATASUS FTP CNES");
      expect(typeof result._meta.defasagem_dias).toBe("number");
      expect(result.data).toBeDefined();
    }
  });

  it("todas as 8 operações retornam cache_vazio quando dataset vazio", async () => {
    // Sem seed.
    const operations = [
      () => repo.buscarPorCodigoCnes("2077485"),
      () =>
        repo.buscarPorNome({ nome: "clinicas", limit: 5 } as Parameters<
          typeof repo.buscarPorNome
        >[0]),
      () =>
        repo.buscarPorMunicipio({ codigoIbge: "355030", limit: 5 } as Parameters<
          typeof repo.buscarPorMunicipio
        >[0]),
      () =>
        repo.buscarPorTipo({ tipo: "hospital", limit: 5 } as Parameters<
          typeof repo.buscarPorTipo
        >[0]),
      () => repo.listarProfissionais("2077485"),
      () => repo.listarLeitos("2077485"),
      () => repo.listarEquipamentos("2077485"),
      () => repo.listarServicos("2077485"),
    ];

    for (const op of operations) {
      const result = await op();
      expect(result._meta.modo).toBe("cache_vazio");
      expect(result._meta.status).toBe("empty");
    }
  });
});
