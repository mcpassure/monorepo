import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureDataset } from "../../../src/bootstrap.js";

const TMP_DIR = join(tmpdir(), `mcp-cnes-bootstrap-test-${Date.now()}`);

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  // Restore env
  delete process.env.MCPASSURE_DB_PATH;
  delete process.env.MCPASSURE_R2_ACCESS_KEY_ID;
  delete process.env.MCPASSURE_R2_SECRET_ACCESS_KEY;
  delete process.env.MCPASSURE_R2_ENDPOINT;
});

describe("ensureDataset — sem credenciais R2", () => {
  it("retorna ok=false quando sem credenciais e sem cache local", async () => {
    process.env.MCPASSURE_DB_PATH = join(TMP_DIR, "nonexistent.db");
    delete process.env.MCPASSURE_R2_ACCESS_KEY_ID;
    delete process.env.MCPASSURE_R2_SECRET_ACCESS_KEY;
    delete process.env.MCPASSURE_R2_ENDPOINT;

    const result = await ensureDataset();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("MCPASSURE_R2_ACCESS_KEY_ID");
    }
  });

  it("retorna ok=true com action=skipped_offline quando cache local existe e sem credenciais", async () => {
    const fakeDb = join(TMP_DIR, "fake-cnes.db");
    writeFileSync(fakeDb, "SQLite format 3\x00");
    process.env.MCPASSURE_DB_PATH = fakeDb;
    delete process.env.MCPASSURE_R2_ACCESS_KEY_ID;

    const result = await ensureDataset();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("skipped_offline");
    }
  });

  it("retorna ok=true mesmo com credenciais parciais (só access key) e cache existente", async () => {
    const fakeDb = join(TMP_DIR, "fake-cnes-2.db");
    writeFileSync(fakeDb, "SQLite format 3\x00");
    process.env.MCPASSURE_DB_PATH = fakeDb;
    process.env.MCPASSURE_R2_ACCESS_KEY_ID = "AKID";
    delete process.env.MCPASSURE_R2_SECRET_ACCESS_KEY;
    delete process.env.MCPASSURE_R2_ENDPOINT;

    const result = await ensureDataset();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("skipped_offline");
    }
  });

  it("retorna ok=false quando credenciais parciais e sem cache", async () => {
    process.env.MCPASSURE_DB_PATH = join(TMP_DIR, "missing.db");
    process.env.MCPASSURE_R2_ACCESS_KEY_ID = "AKID";
    delete process.env.MCPASSURE_R2_SECRET_ACCESS_KEY;
    delete process.env.MCPASSURE_R2_ENDPOINT;

    const result = await ensureDataset();
    expect(result.ok).toBe(false);
  });
});

describe("ensureDataset — com credenciais R2 mas endpoint inválido", () => {
  it("fallback para cache local quando R2 inacessível e cache existe", async () => {
    const fakeDb = join(TMP_DIR, "fake-cnes-r2.db");
    writeFileSync(fakeDb, "SQLite format 3\x00");
    process.env.MCPASSURE_DB_PATH = fakeDb;
    process.env.MCPASSURE_R2_ACCESS_KEY_ID = "AKID";
    process.env.MCPASSURE_R2_SECRET_ACCESS_KEY = "SECRET";
    process.env.MCPASSURE_R2_ENDPOINT = "https://endpoint.invalido.local.test";

    const result = await ensureDataset();
    // R2 inacessível mas cache existe → skipped_offline
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("skipped_offline");
    }
  }, 10000);

  it("retorna ok=false quando R2 inacessível e sem cache", async () => {
    process.env.MCPASSURE_DB_PATH = join(TMP_DIR, "missing-r2.db");
    process.env.MCPASSURE_R2_ACCESS_KEY_ID = "AKID";
    process.env.MCPASSURE_R2_SECRET_ACCESS_KEY = "SECRET";
    process.env.MCPASSURE_R2_ENDPOINT = "https://endpoint.invalido.local.test";

    const result = await ensureDataset();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Sem cache");
    }
  }, 10000);
});
