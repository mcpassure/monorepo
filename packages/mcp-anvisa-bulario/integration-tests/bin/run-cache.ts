#!/usr/bin/env tsx

/**
 * Testa o comportamento do cache SQLite de forma isolada.
 * Uso: npx tsx integration-tests/bin/run-cache.ts
 *
 * Nota: SqliteCache.get() retorna { value, data_da_base } | null (CacheStore interface).
 * Os testes acessam o payload original via `.value.<campo>`.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SqliteCache } from "../../src/cache/sqlite-cache.js";
import { DEFAULT_TTLS } from "../../src/cache/types.js";
import type { TestResult } from "../setup/helpers.js";
import { printSummary, runTest, saveResults } from "../setup/helpers.js";

function makeTempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anvisa-cache-"));
  return { dbPath: path.join(dir, "test.db"), dir };
}

async function main() {
  const results: TestResult[] = [];

  // ── Basic CRUD ──────────────────────────────────────────────────────────
  results.push(
    await runTest("set/get: valor simples retornado dentro do TTL", async () => {
      const { dbPath, dir } = makeTempDb();
      const c = new SqliteCache(dbPath);
      try {
        c.set("k1", { val: 42 }, 3600);
        const v = c.get<{ val: number }>("k1");
        if (v?.value.val !== 42) throw new Error(`got ${v?.value.val}`);
      } finally {
        c.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  results.push(
    await runTest("get: chave inexistente retorna null", async () => {
      const { dbPath, dir } = makeTempDb();
      const c = new SqliteCache(dbPath);
      try {
        if (c.get("nope") !== null) throw new Error("expected null");
      } finally {
        c.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  results.push(
    await runTest("TTL=0: expirado imediatamente retorna null após delay", async () => {
      const { dbPath, dir } = makeTempDb();
      const c = new SqliteCache(dbPath);
      try {
        c.set("k_ttl", "value", 0);
        await new Promise((r) => setTimeout(r, 20));
        if (c.get("k_ttl") !== null) throw new Error("expected null after TTL=0");
      } finally {
        c.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  results.push(
    await runTest("set: overwrite atualiza valor da mesma chave", async () => {
      const { dbPath, dir } = makeTempDb();
      const c = new SqliteCache(dbPath);
      try {
        c.set("k_over", "v1", 3600);
        c.set("k_over", "v2", 3600);
        if (c.get<string>("k_over")?.value !== "v2") throw new Error("expected v2");
      } finally {
        c.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  results.push(
    await runTest("invalidate: remove chave imediatamente", async () => {
      const { dbPath, dir } = makeTempDb();
      const c = new SqliteCache(dbPath);
      try {
        c.set("k_inv", "val", 86400);
        c.invalidate("k_inv");
        if (c.get("k_inv") !== null) throw new Error("expected null after invalidate");
      } finally {
        c.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  results.push(
    await runTest("invalidate: chave inexistente não lança exceção", async () => {
      const { dbPath, dir } = makeTempDb();
      const c = new SqliteCache(dbPath);
      try {
        c.invalidate("nonexistent-key"); // should not throw
      } finally {
        c.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  // ── Complex data ────────────────────────────────────────────────────────
  results.push(
    await runTest("objeto aninhado: serializa e desserializa corretamente", async () => {
      const { dbPath, dir } = makeTempDb();
      const c = new SqliteCache(dbPath);
      try {
        const obj = {
          numProcesso: "25351617747202347",
          nomeProduto: "NOVALGINA",
          classesTerapeuticas: ["ANALGESICOS NAO NARCOTICOS"],
          bulaPaciente: { id: "abc123", urlPdf: "https://example.com/bula.pdf" },
          tarja: "VERMELHA",
        };
        c.set("med:novalgina", obj, DEFAULT_TTLS.medicamentoDetalhes);
        const v = c.get<typeof obj>("med:novalgina");
        if (JSON.stringify(v?.value) !== JSON.stringify(obj)) throw new Error("mismatch");
      } finally {
        c.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  results.push(
    await runTest("array de objetos: serializa e desserializa", async () => {
      const { dbPath, dir } = makeTempDb();
      const c = new SqliteCache(dbPath);
      try {
        const arr = [{ descricao: "500MG COMPRIMIDO" }, { descricao: "250MG/5ML SUSPENSAO" }];
        c.set("apresentacoes:test", arr, DEFAULT_TTLS.bulaLink);
        const v = c.get<typeof arr>("apresentacoes:test");
        if (!Array.isArray(v?.value) || v.value.length !== 2) throw new Error("array mismatch");
      } finally {
        c.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  // ── Persistence ─────────────────────────────────────────────────────────
  results.push(
    await runTest("persistência: valor sobrevive ao fechamento e reabertura", async () => {
      const { dbPath, dir } = makeTempDb();
      const c1 = new SqliteCache(dbPath);
      c1.set("persist:key", { saved: true, time: Date.now() }, 86400);
      c1.close();

      const c2 = new SqliteCache(dbPath);
      try {
        const v = c2.get<{ saved: boolean }>("persist:key");
        if (!v?.value.saved) throw new Error("data not persisted");
      } finally {
        c2.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  // ── Cache keys ──────────────────────────────────────────────────────────
  results.push(
    await runTest(
      "chaves de cache: diferentes pagina produzem entradas independentes",
      async () => {
        const { dbPath, dir } = makeTempDb();
        const c = new SqliteCache(dbPath);
        try {
          c.set("search:name:novalgina:1:10", { pagina: 1 }, 3600);
          c.set("search:name:novalgina:2:10", { pagina: 2 }, 3600);
          const p1 = c.get<{ pagina: number }>("search:name:novalgina:1:10");
          const p2 = c.get<{ pagina: number }>("search:name:novalgina:2:10");
          if (p1?.value.pagina !== 1 || p2?.value.pagina !== 2) {
            throw new Error("page isolation broken");
          }
        } finally {
          c.close();
          fs.rmSync(dir, { recursive: true });
        }
      }
    )
  );

  results.push(
    await runTest(
      "chaves de cache: case-sensitive (lowercase normalizado externamente)",
      async () => {
        const { dbPath, dir } = makeTempDb();
        const c = new SqliteCache(dbPath);
        try {
          c.set("search:name:novalgina:1:10", "lower", 3600);
          c.set("search:name:NOVALGINA:1:10", "upper", 3600);
          if (c.get<string>("search:name:novalgina:1:10")?.value !== "lower") {
            throw new Error("keys should be case-sensitive");
          }
          if (c.get<string>("search:name:NOVALGINA:1:10")?.value !== "upper") {
            throw new Error("keys should be case-sensitive");
          }
        } finally {
          c.close();
          fs.rmSync(dir, { recursive: true });
        }
      }
    )
  );

  results.push(
    await runTest("ttl: DEFAULT_TTLS.searchResults é 3600 segundos", async () => {
      if (DEFAULT_TTLS.searchResults !== 3600) {
        throw new Error(`expected 3600, got ${DEFAULT_TTLS.searchResults}`);
      }
      if (DEFAULT_TTLS.medicamentoDetalhes !== 86400) {
        throw new Error(`expected 86400, got ${DEFAULT_TTLS.medicamentoDetalhes}`);
      }
      if (DEFAULT_TTLS.bulaLink !== 86400) {
        throw new Error(`expected 86400, got ${DEFAULT_TTLS.bulaLink}`);
      }
    })
  );

  // ── Directory creation ───────────────────────────────────────────────────
  results.push(
    await runTest("cache: cria diretório pai se não existir", async () => {
      const { dir } = makeTempDb();
      const nestedDb = path.join(dir, "a", "b", "c", "cache.db");
      const c = new SqliteCache(nestedDb);
      try {
        c.set("test", "ok", 60);
        if (c.get<string>("test")?.value !== "ok") {
          throw new Error("cache not working in nested dir");
        }
      } finally {
        c.close();
        fs.rmSync(dir, { recursive: true });
      }
    })
  );

  printSummary(results, "Cache Integration Tests");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  saveResults(`run-cache-${timestamp}.json`, { timestamp: new Date().toISOString(), results });
  saveResults("run-cache-latest.json", { timestamp: new Date().toISOString(), results });

  process.exit(results.every((r) => r.passed) ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
