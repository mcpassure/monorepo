import type Database from "better-sqlite3";
import { getInMemoryDb } from "../src/db/connection.js";
import { TussRepository } from "../src/repositories/tuss.repository.js";

export function createSeededDb(): Database.Database {
  const db = getInMemoryDb();

  // Seed TUSS 22 — procedimentos
  const ins22 = db.prepare(
    "INSERT INTO tuss_22 (codigo, termo, data_inicio, data_fim, versao, extra_json) VALUES (?,?,?,?,?,?)"
  );
  ins22.run(
    "10101012",
    "Consulta em consultório (no horário normal ou preestabelecido)",
    "2009-02-13",
    "2010-10-15",
    "202603",
    "{}"
  );
  ins22.run("10101020", "Consulta em domicílio", "2009-02-13", "2010-10-15", "202603", "{}");
  ins22.run("40304361", "Ressonância magnética de crânio", "2009-02-13", null, "202603", "{}");
  ins22.run("31309019", "Tomografia computadorizada de tórax", "2012-10-10", null, "202603", "{}");

  // Seed TUSS 20 — medicamentos
  const ins20 = db.prepare(
    "INSERT INTO tuss_20 (codigo, termo, data_inicio, data_fim, versao, extra_json) VALUES (?,?,?,?,?,?)"
  );
  ins20.run("90010012", "Dipirona sódica", "2009-02-13", null, "202603", "{}");
  ins20.run("90020019", "Amoxicilina", "2009-02-13", null, "202603", "{}");

  // Seed TUSS 18 — diárias e taxas
  const ins18 = db.prepare(
    "INSERT INTO tuss_18 (codigo, termo, data_inicio, data_fim, versao, extra_json) VALUES (?,?,?,?,?,?)"
  );
  ins18.run("04010010", "Diária de UTI adulto", "2009-02-13", null, "202603", "{}");
  ins18.run("04010029", "Diária de internação em apartamento", "2009-02-13", null, "202603", "{}");

  // Seed sync_log
  const synced = new Date("2026-03-15T10:00:00Z").toISOString();
  const insLog = db.prepare(
    "INSERT INTO sync_log (tabela, versao, rows_upserted, status, error_msg, synced_at) VALUES (?,?,?,?,?,?)"
  );
  insLog.run("tuss_22", "202603", 5964, "ok", null, synced);
  insLog.run("tuss_20", "202603", 3500, "ok", null, synced);
  insLog.run("tuss_18", "202603", 120, "ok", null, synced);

  return db;
}

export function createEmptyDb(): Database.Database {
  return getInMemoryDb();
}

export function createRepo(db: Database.Database): TussRepository {
  return new TussRepository(db);
}
