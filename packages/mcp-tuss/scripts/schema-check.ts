import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TableBaseline {
  name: string;
  columns: Array<{ name: string }>;
  minRows: number;
  maxRows: number;
  description: string;
}

interface Baseline {
  source: string;
  schema: {
    tables: TableBaseline[];
    upstreamUrl: string;
    expectedCsvColumns: string[];
  };
}

async function checkUpstreamAccessible(url: string): Promise<{ ok: boolean; details: string }> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(30000),
    });
    return { ok: resp.ok, details: `HTTP ${resp.status}` };
  } catch (err: unknown) {
    return { ok: false, details: `Erro: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function check(): Promise<{ ok: boolean; diffs: string[] }> {
  const baseline: Baseline = JSON.parse(
    readFileSync(join(__dirname, "../tests/fixtures/schema-baseline.tuss.json"), "utf-8")
  );

  const diffs: string[] = [];

  // Check upstream accessibility
  const access = await checkUpstreamAccessible(baseline.schema.upstreamUrl);
  if (!access.ok) {
    diffs.push(`Upstream inacessível (${baseline.schema.upstreamUrl}): ${access.details}`);
  } else {
    console.log(`Upstream acessível: ${access.details}`);
  }

  // Check local DB schema (if DB exists)
  try {
    const { getDb } = await import("../src/db/connection.js");
    const db = getDb();

    for (const table of baseline.schema.tables) {
      const cols = db.prepare(`PRAGMA table_info(${table.name})`).all() as Array<{ name: string }>;
      if (cols.length === 0) {
        diffs.push(`Tabela '${table.name}' não encontrada no DB`);
        continue;
      }

      const actualNames = cols.map((c) => c.name);
      const expectedNames = table.columns.map((c) => c.name);

      for (const expected of expectedNames) {
        if (!actualNames.includes(expected)) {
          diffs.push(
            `Tabela '${table.name}': coluna '${expected}' não encontrada (schema drift local)`
          );
        }
      }

      const row = db.prepare(`SELECT COUNT(*) as n FROM ${table.name}`).get() as { n: number };
      if (row.n < table.minRows) {
        diffs.push(`Tabela '${table.name}': ${row.n} linhas < mínimo esperado ${table.minRows}`);
      } else {
        console.log(`Tabela '${table.name}': ${row.n} linhas OK`);
      }
    }

    db.close();
  } catch (err) {
    console.warn(`Aviso: não foi possível verificar DB local: ${err}`);
  }

  return { ok: diffs.length === 0, diffs };
}

check()
  .then((result) => {
    if (!result.ok) {
      console.error("DRIFT DETECTADO:");
      for (const d of result.diffs) {
        console.error(`  - ${d}`);
      }
      process.exit(1);
    }
    console.log("Schema TUSS OK — sem drift detectado");
  })
  .catch((err) => {
    console.error("Erro durante check:", err);
    process.exit(2);
  });
