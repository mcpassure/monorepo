import { homedir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

const dbPath =
  process.platform === "win32"
    ? join(process.env.APPDATA ?? homedir(), "mcpassure", "tuss", "tuss.db")
    : join(homedir(), ".local", "share", "mcpassure", "tuss", "tuss.db");

console.log(`DB: ${dbPath}\n`);

const db = new Database(dbPath, { readonly: true });

for (const tabela of ["tuss_22", "tuss_20", "tuss_18"]) {
  console.log(`=== ${tabela.toUpperCase()} ===`);
  const count = (db.prepare(`SELECT COUNT(*) as c FROM ${tabela}`).get() as { c: number }).c;
  console.log(`Total: ${count} registros`);

  const rows = db
    .prepare(
      `SELECT codigo, substr(termo, 1, 60) as termo, data_inicio, data_fim FROM ${tabela} LIMIT 5`
    )
    .all();
  console.log(JSON.stringify(rows, null, 2));

  // Amostra de vigência atual (data_fim no futuro ou nula)
  const vigentes = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM ${tabela} WHERE data_fim IS NULL OR data_fim >= date('now')`
      )
      .get() as { c: number }
  ).c;
  console.log(`Vigentes hoje: ${vigentes} / ${count}\n`);
}

db.close();
