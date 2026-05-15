import type Database from "better-sqlite3";

export function jaProcessado(
  db: Database.Database,
  grupo: string,
  uf: string,
  competencia: string
): boolean {
  const row = db
    .prepare(
      "SELECT id FROM sync_log WHERE grupo = ? AND uf = ? AND competencia = ? AND status = 'ok' LIMIT 1"
    )
    .get(grupo, uf, competencia) as { id: number } | undefined;
  return !!row;
}

export function registrarSync(
  db: Database.Database,
  grupo: string,
  uf: string,
  competencia: string,
  rowsUpserted: number,
  status: "ok" | "error",
  errorMsg?: string
): void {
  db.prepare(
    "INSERT INTO sync_log (grupo, uf, competencia, rows_upserted, status, error_msg, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(grupo, uf, competencia, rowsUpserted, status, errorMsg ?? null, new Date().toISOString());
}

export function ultimaCompetenciaSincronizada(db: Database.Database, grupo: string): string | null {
  const row = db
    .prepare(
      "SELECT competencia FROM sync_log WHERE grupo = ? AND status = 'ok' ORDER BY competencia DESC LIMIT 1"
    )
    .get(grupo) as { competencia: string } | undefined;
  return row?.competencia ?? null;
}
