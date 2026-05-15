import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Baseline {
  source: string;
  schema: {
    csvUrl: string;
    expectedColumns: string[];
    columnCount: number;
    minSizeBytes: number;
    minRows: number;
    dbTable: { name: string; columns: string[] };
  };
}

async function checkCsvAccessible(
  url: string,
  minBytes: number,
): Promise<{ ok: boolean; details: string }> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) return { ok: false, details: `HTTP ${resp.status}` };

    const size = resp.headers.get("content-length");
    if (size && parseInt(size) < minBytes) {
      return { ok: false, details: `CSV muito pequeno: ${size} bytes (mínimo ${minBytes})` };
    }

    return { ok: true, details: `Size: ${size ?? "desconhecido"}` };
  } catch (err: unknown) {
    return { ok: false, details: `Erro: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function check(): Promise<{ ok: boolean; diffs: string[] }> {
  const baseline: Baseline = JSON.parse(
    readFileSync(
      join(__dirname, "../tests/fixtures/schema-baseline.medicamentos.json"),
      "utf-8",
    ),
  );

  const diffs: string[] = [];

  const access = await checkCsvAccessible(baseline.schema.csvUrl, baseline.schema.minSizeBytes);
  if (!access.ok) {
    diffs.push(`CSV ANVISA inacessível (${baseline.schema.csvUrl}): ${access.details}`);
  } else {
    console.log(`CSV ANVISA acessível: ${access.details}`);
  }

  // Check local DB schema
  try {
    const { default: Database } = await import("better-sqlite3");
    const { getDbPath } = await import("../src/bootstrap.js");
    const db = new Database(getDbPath(), { readonly: true });

    const { name, columns } = baseline.schema.dbTable;
    const cols = db.prepare(`PRAGMA table_info(${name})`).all() as Array<{ name: string }>;
    if (cols.length === 0) {
      diffs.push(`Tabela '${name}' não encontrada no DB local`);
    } else {
      const actualNames = cols.map((c) => c.name);
      for (const expected of columns) {
        if (!actualNames.includes(expected)) {
          diffs.push(`Tabela '${name}': coluna '${expected}' ausente`);
        }
      }
      const row = db.prepare(`SELECT COUNT(*) as n FROM ${name}`).get() as { n: number };
      console.log(`Tabela '${name}': ${row.n} linhas`);
      if (row.n < baseline.schema.minRows) {
        diffs.push(`Tabela '${name}': ${row.n} linhas < mínimo ${baseline.schema.minRows}`);
      }
    }

    db.close();
  } catch (err) {
    console.warn(`Aviso: verificação DB local falhou: ${err}`);
  }

  return { ok: diffs.length === 0, diffs };
}

check()
  .then((result) => {
    if (!result.ok) {
      console.error("DRIFT DETECTADO:");
      result.diffs.forEach((d) => console.error(`  - ${d}`));
      process.exit(1);
    }
    console.log("Schema ANVISA Bulário OK — sem drift detectado");
  })
  .catch((err) => {
    console.error("Erro durante check:", err);
    process.exit(2);
  });
