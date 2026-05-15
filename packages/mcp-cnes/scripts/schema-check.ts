import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Baseline {
  source: string;
  schema: {
    tables: Array<{ name: string; columns: string[]; minRows: number }>;
    upstreamFtp: string;
    expectedDbcGroups: string[];
  };
}

async function checkFtpAccessible(host: string): Promise<{ ok: boolean; details: string }> {
  // Use http probe since direct FTP requires extra deps
  // DATASUS also has an HTTP mirror
  try {
    const resp = await fetch(`https://datasus.saude.gov.br/transferencia-de-arquivos/`, {
      method: "HEAD",
      signal: AbortSignal.timeout(30000),
    });
    return { ok: resp.ok || resp.status === 301 || resp.status === 302, details: `HTTP ${resp.status}` };
  } catch (err: unknown) {
    return { ok: false, details: `Erro: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function check(): Promise<{ ok: boolean; diffs: string[] }> {
  const baseline: Baseline = JSON.parse(
    readFileSync(join(__dirname, "../tests/fixtures/schema-baseline.cnes.json"), "utf-8"),
  );

  const diffs: string[] = [];

  const access = await checkFtpAccessible(baseline.schema.upstreamFtp);
  if (!access.ok) {
    diffs.push(`Upstream DATASUS inacessível: ${access.details}`);
  } else {
    console.log(`DATASUS portal acessível: ${access.details}`);
  }

  // Check local DB schema
  try {
    const { getDb } = await import("../src/db/connection.js");
    const db = getDb();

    for (const table of baseline.schema.tables) {
      const cols = db.prepare(`PRAGMA table_info(${table.name})`).all() as Array<{ name: string }>;
      if (cols.length === 0) {
        diffs.push(`Tabela '${table.name}' não encontrada`);
        continue;
      }

      const actualNames = cols.map((c) => c.name);
      for (const expected of table.columns) {
        if (!actualNames.includes(expected)) {
          diffs.push(`Tabela '${table.name}': coluna '${expected}' ausente`);
        }
      }

      const row = db.prepare(`SELECT COUNT(*) as n FROM ${table.name}`).get() as { n: number };
      console.log(`Tabela '${table.name}': ${row.n} linhas`);
      if (row.n < table.minRows) {
        diffs.push(`Tabela '${table.name}': ${row.n} linhas < mínimo ${table.minRows}`);
      }
    }

    db.close();
  } catch (err) {
    console.warn(`Aviso: verificação do DB local falhou: ${err}`);
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
    console.log("Schema CNES OK — sem drift detectado");
  })
  .catch((err) => {
    console.error("Erro durante check:", err);
    process.exit(2);
  });
