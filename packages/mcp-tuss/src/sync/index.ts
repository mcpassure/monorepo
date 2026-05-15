#!/usr/bin/env tsx
import type Database from "better-sqlite3";
import { getDb } from "../db/connection.js";
import type { TussRow } from "../domain/types.js";
import { FetchHttpDownload } from "../utils/http.js";
import { extractTussData } from "./tuss-source.js";

function upsertRows(db: Database.Database, table: string, rows: TussRow[], versao: string): number {
  const stmt = db.prepare(`
    INSERT INTO ${table} (codigo, termo, data_inicio, data_fim, versao, extra_json)
    VALUES (@codigo, @termo, @data_inicio, @data_fim, @versao, @extra_json)
    ON CONFLICT(codigo) DO UPDATE SET
      termo       = excluded.termo,
      data_inicio = excluded.data_inicio,
      data_fim    = excluded.data_fim,
      versao      = excluded.versao,
      extra_json  = excluded.extra_json
  `);

  const insertMany = db.transaction((items: TussRow[]) => {
    for (const row of items) {
      stmt.run({ ...row, versao });
    }
  });

  insertMany(rows);
  return rows.length;
}

export async function runSync(versao?: string): Promise<void> {
  const db = getDb();
  const client = new FetchHttpDownload();

  process.stderr.write("[sync] Iniciando sincronização TUSS...\n");

  let result: Awaited<ReturnType<typeof extractTussData>> | null = null;

  try {
    result = await extractTussData(client, versao);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[sync] Erro no download/parse: ${msg}\n`);
    db.prepare(
      "INSERT INTO sync_log (tabela, versao, rows_upserted, status, error_msg, synced_at) VALUES (?,?,?,?,?,?)"
    ).run("sync", versao ?? "unknown", 0, "error", msg, new Date().toISOString());
    process.exit(1);
  }

  const synced_at = new Date().toISOString();
  const { versao: ver, tuss22, tuss20, tuss18 } = result;

  if (tuss22.length > 0) {
    const n = upsertRows(db, "tuss_22", tuss22, ver);
    db.prepare(
      "INSERT INTO sync_log (tabela, versao, rows_upserted, status, error_msg, synced_at) VALUES (?,?,?,?,?,?)"
    ).run("tuss_22", ver, n, "ok", null, synced_at);
    process.stderr.write(`[sync] tuss_22: ${n} registros\n`);
  }

  if (tuss20.length > 0) {
    const n = upsertRows(db, "tuss_20", tuss20, ver);
    db.prepare(
      "INSERT INTO sync_log (tabela, versao, rows_upserted, status, error_msg, synced_at) VALUES (?,?,?,?,?,?)"
    ).run("tuss_20", ver, n, "ok", null, synced_at);
    process.stderr.write(`[sync] tuss_20: ${n} registros\n`);
  }

  if (tuss18.length > 0) {
    const n = upsertRows(db, "tuss_18", tuss18, ver);
    db.prepare(
      "INSERT INTO sync_log (tabela, versao, rows_upserted, status, error_msg, synced_at) VALUES (?,?,?,?,?,?)"
    ).run("tuss_18", ver, n, "ok", null, synced_at);
    process.stderr.write(`[sync] tuss_18: ${n} registros\n`);
  }

  // Força checkpoint do WAL pra garantir que tudo está no .db principal
  // (caso contrário, copias/uploads do .db podem capturar estado parcial)
  db.pragma("wal_checkpoint(TRUNCATE)");
  process.stderr.write("[sync] WAL consolidado no .db principal.\n");

  process.stderr.write(`[sync] Concluído. Versão ${ver} sincronizada.\n`);
}

// Entry point quando executado diretamente
const isMain = process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isMain) {
  const versao = process.argv[2]; // ex: tsx src/sync/index.ts 202603
  runSync(versao).catch((err: unknown) => {
    process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
