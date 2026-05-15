import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type Database from "better-sqlite3";
import iconv from "iconv-lite";
import { mapEQ } from "./mappers/EQ.js";
import { mapLT } from "./mappers/LT.js";
import { mapPF } from "./mappers/PF.js";
import { mapSR } from "./mappers/SR.js";
import { mapST } from "./mappers/ST.js";

const BATCH_SIZE = 1000;

const TABLE_MAP: Record<string, string> = {
  ST: "estabelecimentos",
  LT: "leitos",
  EQ: "equipamentos",
  PF: "profissionais",
  SR: "servicos_especializados",
};

type MapFn = (row: Record<string, string>, competencia: string) => Record<string, unknown>;
const MAPPER_MAP: Record<string, MapFn> = {
  ST: mapST,
  LT: mapLT,
  EQ: mapEQ,
  PF: mapPF,
  SR: mapSR,
};

function buildUpsert(table: string, keys: string[]): string {
  const cols = keys.join(", ");
  const placeholders = keys.map((k) => `@${k}`).join(", ");
  return `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`;
}

export async function ingerirCsv(
  db: Database.Database,
  csvPath: string,
  grupo: string,
  competencia: string
): Promise<number> {
  const table = TABLE_MAP[grupo];
  const mapper = MAPPER_MAP[grupo];
  if (!table || !mapper) throw new Error(`Grupo desconhecido: ${grupo}`);

  let rowsUpserted = 0;
  let headers: string[] = [];
  let batch: Record<string, unknown>[] = [];
  let stmt: ReturnType<Database.Database["prepare"]> | null = null;

  const stream = createReadStream(csvPath);
  const decodedStream = stream.pipe(iconv.decodeStream("latin1"));
  const rl = createInterface({ input: decodedStream });

  const flushBatch = db.transaction((rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      stmt?.run(row);
    }
    rowsUpserted += rows.length;
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (headers.length === 0) {
      headers = line.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      continue;
    }

    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const rowObj: Record<string, string> = {};
    headers.forEach((h, i) => {
      rowObj[h] = values[i] ?? "";
    });

    const mapped = mapper(rowObj, competencia);

    if (!stmt) {
      const keys = Object.keys(mapped);
      stmt = db.prepare(buildUpsert(table, keys));
    }

    batch.push(mapped);

    if (batch.length >= BATCH_SIZE) {
      flushBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0 && stmt) {
    flushBatch(batch);
  }

  return rowsUpserted;
}
