/**
 * Integration tests — require real synced DB.
 * Run AFTER: MCPASSURE_INSECURE_TLS=1 MCPASSURE_DB_PATH=./tuss_real.db npx tsx src/sync/index.ts
 * Skip individually if DB is missing.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import { applySchema } from "../../src/db/schema.js";
import { TussRepository } from "../../src/repositories/tuss.repository.js";
import { buscarDiariaHandler } from "../../src/tools/buscar-diaria.js";
import { buscarMedicamentoHandler } from "../../src/tools/buscar-medicamento.js";
import { buscarProcedimentoHandler } from "../../src/tools/buscar-procedimento.js";
import { statusSyncHandler } from "../../src/tools/status-sync.js";

const DB_PATH = resolve(process.cwd(), "tuss_real.db");
const hasRealDb = existsSync(DB_PATH);

function openRealDb(): Database.Database {
  const db = new Database(DB_PATH, { readonly: true });
  applySchema(db);
  return db;
}

// Minimal counts expected from real TUSS 202603 data (verified against downloaded ZIP)
const MIN_TUSS22 = 5_900;
const MIN_TUSS20 = 43_000;
const MIN_TUSS18 = 3_500;

describe.skipIf(!hasRealDb)("Integração — dados reais TUSS 202603", () => {
  let db: Database.Database;
  let repo: TussRepository;

  beforeAll(() => {
    db = openRealDb();
    repo = new TussRepository(db);
  });

  // ── Row counts ───────────────────────────────────────────────────────────────

  it(`TUSS 22 tem ao menos ${MIN_TUSS22} procedimentos`, () => {
    const r = db.prepare("SELECT COUNT(*) as n FROM tuss_22").get() as { n: number };
    expect(r.n).toBeGreaterThanOrEqual(MIN_TUSS22);
  });

  it(`TUSS 20 tem ao menos ${MIN_TUSS20} medicamentos`, () => {
    const r = db.prepare("SELECT COUNT(*) as n FROM tuss_20").get() as { n: number };
    expect(r.n).toBeGreaterThanOrEqual(MIN_TUSS20);
  });

  it(`TUSS 18 tem ao menos ${MIN_TUSS18} diárias/taxas`, () => {
    const r = db.prepare("SELECT COUNT(*) as n FROM tuss_18").get() as { n: number };
    expect(r.n).toBeGreaterThanOrEqual(MIN_TUSS18);
  });

  // ── Códigos conhecidos (verificados na base 202603) ──────────────────────────

  it("código 10101012 — Consulta em consultório existe no TUSS 22", () => {
    const r = repo.buscarProcedimentoPorCodigo("10101012");
    expect(r).not.toBeNull();
    expect(r?.termo.toLowerCase()).toContain("consulta");
    expect(r?.tabela).toBe("22");
  });

  it("código 40304361 — Hemograma existe no TUSS 22", () => {
    const r = repo.buscarProcedimentoPorCodigo("40304361");
    expect(r).not.toBeNull();
    expect(r?.termo.toLowerCase()).toMatch(/hemograma|plaquetas/i);
  });

  it("código 90282680 — Dipirona Sódica existe no TUSS 20", () => {
    const r = repo.buscarMedicamentoPorCodigo("90282680");
    expect(r).not.toBeNull();
    expect(r?.termo.toLowerCase()).toContain("dipirona");
    expect(r?.tabela).toBe("20");
  });

  it("código 60000279 — Diária UTI adulto existe no TUSS 18", () => {
    const r = repo.buscarDiariaPorCodigo("60000279");
    expect(r).not.toBeNull();
    expect(r?.termo.toLowerCase()).toMatch(/uti|terapia intensiva/i);
    expect(r?.tabela).toBe("18");
  });

  // ── Busca textual ───────────────────────────────────────────────────────────

  it("busca por 'tomografia' retorna resultados no TUSS 22", () => {
    const result = buscarProcedimentoHandler({ query: "tomografia", limit: 10 }, repo);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result._meta.modo).toBe("cache_local");
  });

  it("busca por 'Ressonância' retorna resultados no TUSS 22", () => {
    const result = buscarProcedimentoHandler({ query: "ressonância", limit: 10 }, repo);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("busca por 'Dipirona' retorna resultados no TUSS 20", () => {
    const result = buscarMedicamentoHandler({ query: "Dipirona", limit: 10 }, repo);
    expect(result.data.length).toBeGreaterThan(0);
    const found = result.data.some((d) =>
      (d as { termo: string }).termo.toLowerCase().includes("dipirona")
    );
    expect(found).toBe(true);
  });

  it("busca por 'UTI' retorna resultado no TUSS 18", () => {
    const result = buscarDiariaHandler({ query: "UTI", limit: 10 }, repo);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("busca por código exato no TUSS 22 retorna 1 resultado", () => {
    const result = buscarProcedimentoHandler({ codigo: "10101012", limit: 5 }, repo);
    expect(result.data).toHaveLength(1);
  });

  it("busca por código inexistente retorna array vazio", () => {
    const result = buscarProcedimentoHandler({ codigo: "99999999", limit: 5 }, repo);
    expect(result.data).toHaveLength(0);
    expect(result._meta.modo).toBe("cache_local");
  });

  it("disclaimer presente em todas as respostas de busca", () => {
    const r1 = buscarProcedimentoHandler({ codigo: "10101012", limit: 5 }, repo);
    const r2 = buscarMedicamentoHandler({ codigo: "90282680", limit: 5 }, repo);
    const r3 = buscarDiariaHandler({ codigo: "60000279", limit: 5 }, repo);
    const r4 = statusSyncHandler({}, repo);
    for (const r of [r1, r2, r3]) {
      expect((r as { disclaimer?: string }).disclaimer).toBeTruthy();
      expect(((r as { disclaimer?: string }).disclaimer as string).length).toBeGreaterThan(50);
    }
    expect((r4 as { disclaimer?: string }).disclaimer).toBeTruthy();
  });

  // ── Meta e sync_log ──────────────────────────────────────────────────────────

  it("sync_log tem 3 entradas de status 'ok'", () => {
    const rows = db.prepare("SELECT * FROM sync_log WHERE status = 'ok'").all() as Array<{
      tabela: string;
      versao: string;
    }>;
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const tabelas = rows.map((r) => r.tabela);
    expect(tabelas).toContain("tuss_22");
    expect(tabelas).toContain("tuss_20");
    expect(tabelas).toContain("tuss_18");
  });

  it("sync_log versão é 202603", () => {
    const row = db
      .prepare("SELECT versao FROM sync_log WHERE tabela = 'tuss_22' AND status = 'ok' LIMIT 1")
      .get() as { versao: string } | undefined;
    expect(row?.versao).toBe("202603");
  });

  it("getMeta retorna modo cache_local para TUSS 22", () => {
    const meta = repo.getMeta("22");
    expect(meta.modo).toBe("cache_local");
    expect(meta.competencia).toBe("202603");
    expect(meta.fonte).toBeTruthy();
  });

  it("getMeta retorna modo cache_local para TUSS 20", () => {
    const meta = repo.getMeta("20");
    expect(meta.modo).toBe("cache_local");
    expect(meta.competencia).toBe("202603");
  });

  it("getMeta retorna modo cache_local para TUSS 18", () => {
    const meta = repo.getMeta("18");
    expect(meta.modo).toBe("cache_local");
    expect(meta.competencia).toBe("202603");
  });

  // ── status_sincronizacao_tuss ────────────────────────────────────────────────

  it("statusSyncHandler retorna dados completos com DB real", () => {
    const result = statusSyncHandler({}, repo);
    const data = result.data as {
      tuss22: { versao: string | null; total_registros: number };
      tuss20: { versao: string | null; total_registros: number };
      tuss18: { versao: string | null; total_registros: number };
      cache_vazio: boolean;
    };
    expect(data.cache_vazio).toBe(false);
    expect(data.tuss22.versao).toBe("202603");
    expect(data.tuss22.total_registros).toBeGreaterThanOrEqual(MIN_TUSS22);
    expect(data.tuss20.total_registros).toBeGreaterThanOrEqual(MIN_TUSS20);
    expect(data.tuss18.total_registros).toBeGreaterThanOrEqual(MIN_TUSS18);
  });

  // ── Qualidade de dados ───────────────────────────────────────────────────────

  it("todos os registros TUSS 22 têm codigo e termo não-vazios", () => {
    const bad = db
      .prepare(
        "SELECT COUNT(*) as n FROM tuss_22 WHERE codigo IS NULL OR codigo = '' OR termo IS NULL OR termo = ''"
      )
      .get() as { n: number };
    expect(bad.n).toBe(0);
  });

  it("todos os registros TUSS 20 têm codigo numérico", () => {
    const bad = db
      .prepare("SELECT COUNT(*) as n FROM tuss_20 WHERE codigo NOT GLOB '[0-9]*'")
      .get() as { n: number };
    expect(bad.n).toBe(0);
  });

  it("todos os registros TUSS 18 têm codigo e termo não-vazios", () => {
    const bad = db
      .prepare(
        "SELECT COUNT(*) as n FROM tuss_18 WHERE codigo IS NULL OR codigo = '' OR termo IS NULL OR termo = ''"
      )
      .get() as { n: number };
    expect(bad.n).toBe(0);
  });

  // ── Limite e paginação ───────────────────────────────────────────────────────

  it("busca com limit=5 retorna no máximo 5 resultados", () => {
    const result = buscarProcedimentoHandler({ query: "consulta", limit: 5 }, repo);
    expect(result.data.length).toBeLessThanOrEqual(5);
  });

  it("busca de medicamento com limit=3 retorna no máximo 3 resultados", () => {
    const result = buscarMedicamentoHandler({ query: "Dipirona", limit: 3 }, repo);
    expect(result.data.length).toBeLessThanOrEqual(3);
  });
});
