import type Database from "better-sqlite3";

function registerFunctions(db: Database.Database): void {
  db.function("unicodelower", (s: unknown) => (typeof s === "string" ? s.toLowerCase() : s));
}

export function applySchema(db: Database.Database): void {
  registerFunctions(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tuss_22 (
      codigo      TEXT PRIMARY KEY,
      termo       TEXT NOT NULL,
      data_inicio TEXT,
      data_fim    TEXT,
      versao      TEXT,
      extra_json  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tuss22_termo
      ON tuss_22(termo COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS tuss_20 (
      codigo      TEXT PRIMARY KEY,
      termo       TEXT NOT NULL,
      data_inicio TEXT,
      data_fim    TEXT,
      versao      TEXT,
      extra_json  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tuss20_termo
      ON tuss_20(termo COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS tuss_18 (
      codigo      TEXT PRIMARY KEY,
      termo       TEXT NOT NULL,
      data_inicio TEXT,
      data_fim    TEXT,
      versao      TEXT,
      extra_json  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tuss18_termo
      ON tuss_18(termo COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS sync_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tabela        TEXT NOT NULL,
      versao        TEXT NOT NULL,
      rows_upserted INTEGER NOT NULL DEFAULT 0,
      status        TEXT NOT NULL,
      error_msg     TEXT,
      synced_at     TEXT NOT NULL
    );
  `);
}
