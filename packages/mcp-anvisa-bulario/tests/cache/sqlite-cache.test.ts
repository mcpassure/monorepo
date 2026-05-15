import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteCache } from "../../src/cache/sqlite-cache.js";

let cache: SqliteCache;
let dbPath: string;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `test-cache-${Date.now()}.db`);
  cache = new SqliteCache(dbPath);
});

afterEach(() => {
  cache.close();
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* ignore */
  }
});

describe("SqliteCache", () => {
  it("returns null for missing key", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("stores and retrieves a value with data_da_base", () => {
    const dataBase = "2026-05-01T00:00:00.000Z";
    cache.set("key1", { foo: "bar" }, 60, dataBase);
    const result = cache.get<{ foo: string }>("key1");
    expect(result).not.toBeNull();
    expect(result?.value).toEqual({ foo: "bar" });
    expect(result?.data_da_base).toBe(dataBase);
  });

  it("uses current time as data_da_base when not provided", () => {
    const before = new Date().toISOString();
    cache.set("key_nobase", 42, 60);
    const after = new Date().toISOString();
    const result = cache.get<number>("key_nobase");
    expect(result).not.toBeNull();
    expect(result?.value).toBe(42);
    expect((result?.data_da_base ?? "") >= before).toBe(true);
    expect((result?.data_da_base ?? "") <= after).toBe(true);
  });

  it("returns null for expired entry", async () => {
    cache.set("key2", { x: 1 }, 0);
    await new Promise((r) => setTimeout(r, 10));
    expect(cache.get("key2")).toBeNull();
  });

  it("overwrites existing key on set", () => {
    cache.set("key3", "original", 60, "2026-01-01T00:00:00.000Z");
    cache.set("key3", "updated", 60, "2026-05-01T00:00:00.000Z");
    const result = cache.get<string>("key3");
    expect(result?.value).toBe("updated");
    expect(result?.data_da_base).toBe("2026-05-01T00:00:00.000Z");
  });

  it("invalidate removes the key", () => {
    cache.set("key4", 42, 60);
    cache.invalidate("key4");
    expect(cache.get("key4")).toBeNull();
  });

  it("handles complex nested objects", () => {
    const value = { medicamentos: [{ id: "1", nome: "test" }], total: 1, pagina: 1 };
    cache.set("complex", value, 60, "2026-05-13T00:00:00.000Z");
    const result = cache.get<typeof value>("complex");
    expect(result?.value).toEqual(value);
    expect(result?.data_da_base).toBe("2026-05-13T00:00:00.000Z");
  });
});
