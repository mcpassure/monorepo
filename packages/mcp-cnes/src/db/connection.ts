import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { applySchema } from "./schema.js";

function getDbPath(): string {
  const customPath = process.env.MCPASSURE_DB_PATH;
  if (customPath) return customPath;

  const dataDir =
    process.env.XDG_DATA_HOME ??
    (process.platform === "win32"
      ? join(process.env.APPDATA ?? homedir(), "mcpassure", "cnes")
      : join(homedir(), ".local", "share", "mcpassure", "cnes"));

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  return join(dataDir, "cnes.db");
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const path = getDbPath();
  _db = new Database(path);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  applySchema(_db);
  return _db;
}

export function getInMemoryDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  applySchema(db);
  return db;
}

export function isDatasetEmpty(db: Database.Database): boolean {
  const row = db.prepare("SELECT COUNT(*) as cnt FROM estabelecimentos").get() as {
    cnt: number;
  };
  return row.cnt === 0;
}
