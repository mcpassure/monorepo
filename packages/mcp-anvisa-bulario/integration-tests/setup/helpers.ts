import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CacheStore } from "../../src/cache/types.js";
import { BularioRepository } from "../../src/domain/repository.js";
import { createServer } from "../../src/server.js";
import { callTool as sharedCallTool } from "../../test-utils/mcp-helpers.js";
import { FixtureSource } from "./fixture-source.js";

export const RESULTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "results");

export function makeTempDb(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "anvisa-integration-"));
  return path.join(tmp, "test-cache.db");
}

export function makeIntegrationServer(): {
  server: McpServer;
  source: FixtureSource;
  cleanup: () => void;
} {
  const source = new FixtureSource();
  const repository = new BularioRepository(source);
  const server = createServer(repository);
  return {
    server,
    source,
    cleanup: () => {
      // Nothing to clean up in v2.0 (no SqliteCache)
    },
  };
}

/**
 * Re-exporta o `callTool` tipado de `test-utils` para conveniência dos integration tests.
 */
export const callTool = sharedCallTool;

export type TestResult = {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  output?: unknown;
};

export async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, passed: true, durationMs: Date.now() - start };
  } catch (err) {
    return {
      name,
      passed: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertDefined<T>(value: T | undefined | null, label: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`${label}: expected a value, got ${value}`);
  }
}

export function assertArrayMinLength(arr: unknown[], min: number, label: string): void {
  if (!Array.isArray(arr) || arr.length < min) {
    throw new Error(
      `${label}: expected array of length >= ${min}, got ${Array.isArray(arr) ? arr.length : "non-array"}`
    );
  }
}

export function saveResults(filename: string, data: unknown): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
}

export function printSummary(results: TestResult[], suiteName: string): void {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  process.stdout.write(`\n=== ${suiteName} ===\n`);
  for (const r of results) {
    const icon = r.passed ? "✓" : "✗";
    const errStr = r.error ? ` — ${r.error}` : "";
    process.stdout.write(`  ${icon} [${r.durationMs}ms] ${r.name}${errStr}\n`);
  }
  process.stdout.write(`\nResult: ${passed}/${total} passed in ${totalMs}ms\n`);
}

/**
 * In-memory CacheStore for tests. Conforms to the same wrapper signature
 * as SqliteCache: returns { value, data_da_base } | null.
 */
export function makeInMemoryCache(): CacheStore {
  const store = new Map<string, { value: unknown; expiresAt: number; data_da_base: string }>();
  return {
    get<T>(key: string): { value: T; data_da_base: string } | null {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return { value: entry.value as T, data_da_base: entry.data_da_base };
    },
    set<T>(key: string, value: T, ttlSeconds: number, data_da_base?: string): void {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
        data_da_base: data_da_base ?? new Date().toISOString(),
      });
    },
    invalidate(key: string): void {
      store.delete(key);
    },
    close(): void {
      store.clear();
    },
  };
}
