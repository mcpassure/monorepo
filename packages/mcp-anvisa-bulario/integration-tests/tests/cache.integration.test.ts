import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteCache } from "../../src/cache/sqlite-cache.js";
import { DEFAULT_TTLS } from "../../src/cache/types.js";

function makeTempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anvisa-cache-int-"));
  return { dbPath: path.join(dir, "cache.db"), dir };
}

describe("SqliteCache — integration", () => {
  let cache: SqliteCache;
  let tmpDir: string;

  beforeEach(() => {
    const { dbPath, dir } = makeTempDb();
    tmpDir = dir;
    cache = new SqliteCache(dbPath);
  });

  afterEach(() => {
    cache.close();
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("set and get returns same value within TTL", () => {
    cache.set("key:1", { data: "hello" }, 3600);
    const result = cache.get<{ data: string }>("key:1");
    expect(result).not.toBeNull();
    expect(result?.value.data).toBe("hello");
  });

  it("get returns null for missing key", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("get returns null after TTL expires", async () => {
    cache.set("key:ttl", { x: 1 }, 0);
    await new Promise((r) => setTimeout(r, 10));
    expect(cache.get("key:ttl")).toBeNull();
  });

  it("set overwrites previous value for same key", () => {
    cache.set("key:overwrite", "first", 3600);
    cache.set("key:overwrite", "second", 3600);
    expect(cache.get<string>("key:overwrite")?.value).toBe("second");
  });

  it("invalidate removes entry", () => {
    cache.set("key:inv", { v: 42 }, 3600);
    cache.invalidate("key:inv");
    expect(cache.get("key:inv")).toBeNull();
  });

  it("invalidate on missing key does not throw", () => {
    expect(() => cache.invalidate("does-not-exist")).not.toThrow();
  });

  it("stores and retrieves complex nested objects", () => {
    const obj = {
      numProcesso: "25351617747202347",
      nomeProduto: "NOVALGINA",
      tarja: "VERMELHA",
      classesTerapeuticas: ["ANALGESICOS NAO NARCOTICOS"],
      apresentacoes: [{ descricao: "500MG COMPRIMIDO 10 UNIDADES" }],
    };
    cache.set("medicamento:novalgina", obj, DEFAULT_TTLS.medicamentoDetalhes);
    const retrieved = cache.get<typeof obj>("medicamento:novalgina");
    expect(retrieved?.value).toEqual(obj);
  });

  it("multiple independent keys coexist", () => {
    cache.set("key:a", "valueA", 3600);
    cache.set("key:b", "valueB", 3600);
    cache.set("key:c", "valueC", 3600);
    expect(cache.get<string>("key:a")?.value).toBe("valueA");
    expect(cache.get<string>("key:b")?.value).toBe("valueB");
    expect(cache.get<string>("key:c")?.value).toBe("valueC");
  });

  it("persists data across cache instance re-opens (same file)", () => {
    const { dbPath, dir: dir2 } = makeTempDb();
    const cache1 = new SqliteCache(dbPath);
    cache1.set("persistent:key", { saved: true }, 86400);
    cache1.close();

    const cache2 = new SqliteCache(dbPath);
    const result = cache2.get<{ saved: boolean }>("persistent:key");
    cache2.close();
    try {
      fs.rmSync(dir2, { recursive: true });
    } catch {
      /* ignore */
    }

    expect(result?.value.saved).toBe(true);
  });

  it("uses cache key prefix for search results", () => {
    const cacheKey = `search:name:novalgina:1:10`;
    const data = { total: 2, pagina: 1, medicamentos: [] };
    cache.set(cacheKey, data, DEFAULT_TTLS.searchResults);
    expect(cache.get(cacheKey)?.value).toEqual(data);
  });

  it("different pagina produces different cache entries", () => {
    cache.set("search:name:x:1:10", { pagina: 1 }, 3600);
    cache.set("search:name:x:2:10", { pagina: 2 }, 3600);
    const p1 = cache.get<{ pagina: number }>("search:name:x:1:10");
    const p2 = cache.get<{ pagina: number }>("search:name:x:2:10");
    expect(p1?.value.pagina).toBe(1);
    expect(p2?.value.pagina).toBe(2);
  });

  it("handles unicode values correctly", () => {
    const value = {
      nome: "NOVALGINA",
      principio: "dipirona monoidratada",
      empresa: "OPELLA HEALTHCARE BRAZIL LTDA",
    };
    cache.set("unicode:test", value, 3600);
    expect(cache.get("unicode:test")?.value).toEqual(value);
  });
});
