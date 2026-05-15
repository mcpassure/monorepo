import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { DEFAULT_DB_DIR, DEFAULT_DB_FILENAME } from "../constants.js";

let _db: Database.Database | null = null;

export function getDbPath(): string {
  if (process.env.MCPASSURE_DB_PATH) {
    return process.env.MCPASSURE_DB_PATH;
  }
  const dir = join(homedir(), DEFAULT_DB_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, DEFAULT_DB_FILENAME);
}

export function openDb(path?: string): Database.Database {
  if (_db) return _db;
  const dbPath = path ?? getDbPath();
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  _db.pragma("foreign_keys = ON");
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
