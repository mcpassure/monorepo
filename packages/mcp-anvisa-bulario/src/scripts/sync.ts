#!/usr/bin/env node
/**
 * sync.ts — Sincroniza o dataset ANVISA Bulário local
 *
 * Baixa DADOS_ABERTOS_MEDICAMENTOS.csv da ANVISA, parseia Latin1 → UTF-8,
 * popula o SQLite local e gera SHA-256 para upload ao R2.
 *
 * Uso: npx tsx src/scripts/sync.ts
 *   ou: npm run sync
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { SCHEMA_SQL, SCHEMA_VERSION } from "../db/schema.js";

// ── Config ────────────────────────────────────────────────────────────────────

const CSV_URL = "https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv";
const TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 10_000;

function getDataDir(): string {
  return process.platform === "win32"
    ? join(process.env.APPDATA ?? homedir(), "mcpassure", "anvisa-bulario")
    : join(
        process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"),
        "mcpassure",
        "anvisa-bulario"
      );
}

function getDbPath(): string {
  return process.env.MCPASSURE_DB_PATH ?? join(getDataDir(), "bulario.db");
}

function log(msg: string): void {
  process.stderr.write(`[sync] ${msg}\n`);
}

// ── CSV download ──────────────────────────────────────────────────────────────

async function downloadCsv(attempt: number): Promise<Buffer> {
  log(`Baixando CSV da ANVISA (tentativa ${attempt + 1}/${MAX_RETRIES + 1})...`);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(CSV_URL, {
      signal: ctrl.signal,
      headers: { "User-Agent": "mcpassure/mcp-anvisa-bulario sync" },
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    log(`Download concluído: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadWithRetry(): Promise<Buffer> {
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await downloadCsv(i);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (i < MAX_RETRIES) {
        log(`Falha (${msg}). Aguardando ${RETRY_DELAY_MS / 1000}s antes de retry...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        throw new Error(`Download falhou após ${MAX_RETRIES + 1} tentativas: ${msg}`);
      }
    }
  }
  throw new Error("Unreachable");
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

type CsvRow = {
  tipo_produto: string;
  nome_produto: string;
  data_finalizacao: string;
  categoria_regulatoria: string;
  numero_registro: string;
  data_vencimento: string;
  numero_processo: string;
  classe_terapeutica: string;
  empresa: string;
  situacao_registro: string;
  principio_ativo: string;
};

function parseLatin1Buffer(buf: Buffer): string {
  // Convert Latin1/ISO-8859-1 to UTF-8
  return buf.toString("latin1");
}

function unquote(s: string): string {
  s = s.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/""/g, '"');
  }
  return s;
}

function parseLine(line: string): string[] {
  // Simple CSV parser for semicolon-separated, optionally quoted fields
  const fields: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ";" && !inQuote) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function csvToCsvRows(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV sem dados");

  // Skip header (line 0)
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseLine(line);
    if (fields.length < 11) continue;

    const [
      tipo_produto,
      nome_produto,
      data_finalizacao,
      categoria_regulatoria,
      numero_registro,
      data_vencimento,
      numero_processo,
      classe_terapeutica,
      empresa,
      situacao_registro,
      principio_ativo,
    ] = fields.map(unquote);

    if (!nome_produto) continue;

    rows.push({
      tipo_produto,
      nome_produto,
      data_finalizacao,
      categoria_regulatoria,
      numero_registro,
      data_vencimento,
      numero_processo,
      classe_terapeutica,
      empresa,
      situacao_registro,
      principio_ativo,
    });
  }

  return rows;
}

// ── SQLite population ─────────────────────────────────────────────────────────

function populateDb(dbPath: string, rows: CsvRow[], generatedAt: string): void {
  const tmp = `${dbPath}.build`;
  if (existsSync(tmp)) {
    try {
      unlinkSync(tmp);
    } catch {
      // ignore
    }
  }

  const db = new Database(tmp);
  try {
    db.exec(SCHEMA_SQL);

    const insert = db.prepare(`
      INSERT INTO medicamentos (
        tipo_produto, nome_produto, data_finalizacao, categoria_regulatoria,
        numero_registro, data_vencimento, numero_processo, classe_terapeutica,
        empresa, situacao_registro, principio_ativo
      ) VALUES (
        @tipo_produto, @nome_produto, @data_finalizacao, @categoria_regulatoria,
        @numero_registro, @data_vencimento, @numero_processo, @classe_terapeutica,
        @empresa, @situacao_registro, @principio_ativo
      )
    `);

    const insertMany = db.transaction((data: CsvRow[]) => {
      for (const row of data) {
        insert.run(row);
      }
    });

    log(`Inserindo ${rows.length} registros em transação...`);
    insertMany(rows);

    // Populate FTS
    log("Populando índice FTS...");
    db.exec(`
      INSERT INTO medicamentos_fts(rowid, nome_produto, principio_ativo, classe_terapeutica)
      SELECT rowid, nome_produto, principio_ativo, classe_terapeutica FROM medicamentos;
    `);

    // Store metadata
    db.prepare(`INSERT OR REPLACE INTO dataset_meta (key, value) VALUES (?, ?)`).run(
      "generated_at",
      generatedAt
    );
    db.prepare(`INSERT OR REPLACE INTO dataset_meta (key, value) VALUES (?, ?)`).run(
      "schema_version",
      SCHEMA_VERSION
    );
    db.prepare(`INSERT OR REPLACE INTO dataset_meta (key, value) VALUES (?, ?)`).run(
      "record_count",
      String(rows.length)
    );
    db.prepare(`INSERT OR REPLACE INTO dataset_meta (key, value) VALUES (?, ?)`).run(
      "source_url",
      "https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv"
    );

    // WAL checkpoint
    db.pragma("wal_checkpoint(TRUNCATE)");
    log(`Checkpoint WAL concluído.`);
  } finally {
    db.close();
  }
}

// ── SHA-256 ───────────────────────────────────────────────────────────────────

function sha256File(path: string): string {
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dbPath = getDbPath();

  log(`Dataset path: ${dbPath}`);
  await mkdir(dirname(dbPath), { recursive: true });

  // Support --local-csv /path/to/file.csv for offline/dev scenarios
  let csvBuf: Buffer;
  const localCsvArg = process.argv.find((a) => a.startsWith("--local-csv="));
  if (localCsvArg) {
    const localPath = localCsvArg.split("=").slice(1).join("=");
    log(`Modo local: lendo CSV de ${localPath}`);
    csvBuf = readFileSync(localPath);
    log(`CSV local carregado: ${(csvBuf.length / 1024 / 1024).toFixed(2)} MB`);
  } else {
    // Download
    csvBuf = await downloadWithRetry();
  }

  // Parse
  log("Parseando CSV (Latin1 → UTF-8)...");
  const content = parseLatin1Buffer(csvBuf);
  const rows = csvToCsvRows(content);
  log(`Total de registros parseados: ${rows.length}`);

  if (rows.length < 100) {
    throw new Error(
      `CSV parece inválido — apenas ${rows.length} registros encontrados (esperado > 10.000)`
    );
  }

  // Populate
  const generatedAt = new Date().toISOString();
  populateDb(dbPath, rows, generatedAt);

  // Atomic rename
  const tmpPath = `${dbPath}.build`;
  await rename(tmpPath, dbPath);
  log(`Database atualizado: ${dbPath}`);

  // SHA-256
  const hash = sha256File(dbPath);
  const size = statSync(dbPath).size;
  log(`SHA-256: ${hash}`);
  log(`Tamanho: ${(size / 1024 / 1024).toFixed(2)} MB`);

  // Smoke test
  const db = new Database(dbPath, { readonly: true });
  const testRows = db
    .prepare(`SELECT COUNT(*) as cnt FROM medicamentos WHERE nome_produto LIKE '%DIPIRONA%'`)
    .get() as { cnt: number };
  db.close();
  log(`Smoke test: ${testRows.cnt} registros com "DIPIRONA"`);

  if (testRows.cnt === 0) {
    throw new Error("Smoke test falhou — nenhum registro com DIPIRONA encontrado");
  }

  // Write manifest hint
  const manifestHint = {
    generated_at: generatedAt,
    sha256: hash,
    size_bytes: size,
    record_count: rows.length,
    source_url: "https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv",
    note: "Upload este arquivo ao R2 como bulario/v{YYYYMMDD}/bulario.db e atualize o manifest.json",
  };
  const hintPath = join(dirname(dbPath), "sync-manifest-hint.json");
  await writeFile(hintPath, JSON.stringify(manifestHint, null, 2));
  log(`Manifest hint: ${hintPath}`);

  log("Sync concluído com sucesso.");
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[sync] ERRO: ${msg}\n`);
  process.exit(1);
});
