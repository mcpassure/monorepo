import Database from "better-sqlite3";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Raiz do projeto source: integration-tests/bin/lib → ../../.. → raiz do monorepo
const MONOREPO_ROOT = path.resolve(__dirname, "..", "..", "..");
export const SRC_ROOT = path.join(MONOREPO_ROOT, "artifacts", "vetrum-tuss-mcp", "src");

/**
 * Dynamic import compatível com Windows: converte caminho absoluto para file:// URL.
 * Aceita um ou mais segmentos de caminho relativo ao SRC_ROOT.
 * Uso: const { handler } = await srcImport("tools", "buscar-por-codigo.js");
 *      const { handler } = await srcImport("tools/buscar-por-codigo.js");
 */
export async function srcImport(...parts: string[]): Promise<Record<string, unknown>> {
  const fullPath = path.join(SRC_ROOT, ...parts);
  return import(pathToFileURL(fullPath).href) as Promise<Record<string, unknown>>;
}

// Banco dedicado aos testes integrados
export const INTEGRATION_DB_PATH = path.join(
  __dirname,
  "..",
  "..",
  "results",
  "tuss-integration.db"
);

// Caminho para os módulos source
export function srcPath(...parts: string[]): string {
  return path.join(SRC_ROOT, ...parts);
}

export function openIntegrationDb(): Database.Database {
  const dir = path.dirname(INTEGRATION_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(INTEGRATION_DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  return db;
}

export function dbHasData(db: Database.Database): boolean {
  try {
    const row = db
      .prepare("SELECT count(*) AS cnt FROM tuss_procedimentos")
      .get() as { cnt: number };
    return row.cnt > 0;
  } catch {
    return false;
  }
}

export function dbStats(db: Database.Database): Record<string, number> {
  const tables = [
    "tuss_procedimentos",
    "tuss_materiais",
    "tuss_medicamentos",
    "tuss_taxas_diarias",
    "rol_cobertura",
    "cbhpm_hierarquia",
  ];
  const stats: Record<string, number> = {};
  for (const t of tables) {
    try {
      const row = db.prepare(`SELECT count(*) AS cnt FROM ${t}`).get() as { cnt: number };
      stats[t] = row.cnt;
    } catch {
      stats[t] = -1;
    }
  }
  return stats;
}
