import type Database from "better-sqlite3";
import type { Meta, TussCode, TussDiaria, TussMedicamento } from "../domain/types.js";
import { buildMeta } from "../utils/meta.js";

type DbRow = { codigo: string; termo: string; data_inicio: string | null; data_fim: string | null };

function mapCode(row: DbRow): TussCode {
  return { ...row, tabela: "22" };
}

function mapMed(row: DbRow): TussMedicamento {
  return { ...row, tabela: "20" };
}

function mapDiaria(row: DbRow): TussDiaria {
  return { ...row, tabela: "18" };
}

export class TussRepository {
  constructor(private readonly db: Database.Database) {}

  // ── TUSS 22 — Procedimentos ────────────────────────────────────────────────

  buscarProcedimentoPorCodigo(codigo: string): TussCode | null {
    const row = this.db
      .prepare("SELECT codigo, termo, data_inicio, data_fim FROM tuss_22 WHERE codigo = ?")
      .get(codigo) as DbRow | undefined;
    return row ? mapCode(row) : null;
  }

  buscarProcedimentos(query: string, limit = 20): TussCode[] {
    const rows = this.db
      .prepare(
        "SELECT codigo, termo, data_inicio, data_fim FROM tuss_22 WHERE unicodelower(termo) LIKE unicodelower(?) LIMIT ?"
      )
      .all(`%${query}%`, limit) as DbRow[];
    return rows.map(mapCode);
  }

  // ── TUSS 20 — Medicamentos ─────────────────────────────────────────────────

  buscarMedicamentoPorCodigo(codigo: string): TussMedicamento | null {
    const row = this.db
      .prepare("SELECT codigo, termo, data_inicio, data_fim FROM tuss_20 WHERE codigo = ?")
      .get(codigo) as DbRow | undefined;
    return row ? mapMed(row) : null;
  }

  buscarMedicamentos(query: string, limit = 20): TussMedicamento[] {
    const rows = this.db
      .prepare(
        "SELECT codigo, termo, data_inicio, data_fim FROM tuss_20 WHERE unicodelower(termo) LIKE unicodelower(?) LIMIT ?"
      )
      .all(`%${query}%`, limit) as DbRow[];
    return rows.map(mapMed);
  }

  // ── TUSS 18 — Diárias e Taxas ──────────────────────────────────────────────

  buscarDiariaPorCodigo(codigo: string): TussDiaria | null {
    const row = this.db
      .prepare("SELECT codigo, termo, data_inicio, data_fim FROM tuss_18 WHERE codigo = ?")
      .get(codigo) as DbRow | undefined;
    return row ? mapDiaria(row) : null;
  }

  buscarDiarias(query: string, limit = 20): TussDiaria[] {
    const rows = this.db
      .prepare(
        "SELECT codigo, termo, data_inicio, data_fim FROM tuss_18 WHERE unicodelower(termo) LIKE unicodelower(?) LIMIT ?"
      )
      .all(`%${query}%`, limit) as DbRow[];
    return rows.map(mapDiaria);
  }

  // ── Meta ───────────────────────────────────────────────────────────────────

  getMeta(tabela: "22" | "20" | "18"): Meta {
    return buildMeta(this.db, tabela);
  }

  isDatasetEmpty(): boolean {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM tuss_22").get() as { cnt: number };
    return row.cnt === 0;
  }

  getSyncStatus(): {
    tuss22: { versao: string | null; rows: number; synced_at: string | null };
    tuss20: { versao: string | null; rows: number; synced_at: string | null };
    tuss18: { versao: string | null; rows: number; synced_at: string | null };
  } {
    const lastSync = (tabela: string) => {
      const r = this.db
        .prepare(
          "SELECT versao, synced_at FROM sync_log WHERE tabela = ? AND status = 'ok' ORDER BY id DESC LIMIT 1"
        )
        .get(tabela) as { versao: string; synced_at: string } | undefined;
      return { versao: r?.versao ?? null, synced_at: r?.synced_at ?? null };
    };

    const count = (table: string) => {
      const r = this.db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as { cnt: number };
      return r.cnt;
    };

    return {
      tuss22: { ...lastSync("tuss_22"), rows: count("tuss_22") },
      tuss20: { ...lastSync("tuss_20"), rows: count("tuss_20") },
      tuss18: { ...lastSync("tuss_18"), rows: count("tuss_18") },
    };
  }
}
