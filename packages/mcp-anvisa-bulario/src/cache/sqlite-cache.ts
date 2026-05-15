import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { CacheStore } from "./types.js";

type SqliteRow = { value: string; expires_at: number; data_da_base: string };

export class SqliteCache implements CacheStore {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(dbPath);

    this.db.exec(`
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        data_da_base TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );
    `);

    // Migration: add data_da_base column to existing databases that don't have it
    try {
      this.db.exec(
        `ALTER TABLE cache ADD COLUMN data_da_base TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`
      );
    } catch {
      // Column already exists — expected on fresh databases or after first migration
    }
  }

  get<T>(key: string): { value: T; data_da_base: string } | null {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(
      "SELECT value, expires_at, data_da_base FROM cache WHERE key = ? AND expires_at > ?"
    );
    const row = stmt.get(key, now) as SqliteRow | undefined;

    if (!row) return null;

    try {
      return {
        value: JSON.parse(row.value) as T,
        data_da_base: row.data_da_base,
      };
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T, ttlSeconds: number, data_da_base?: string): void {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const serialized = JSON.stringify(value);
    const dataBase = data_da_base ?? new Date().toISOString();
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO cache (key, value, expires_at, data_da_base) VALUES (?, ?, ?, ?)"
    );
    stmt.run(key, serialized, expiresAt, dataBase);
  }

  invalidate(key: string): void {
    const stmt = this.db.prepare("DELETE FROM cache WHERE key = ?");
    stmt.run(key);
  }

  close(): void {
    this.db.close();
  }
}
