#!/usr/bin/env node
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb } from "../db/connection.js";
import { converterDbcParaCsv } from "./convert.js";
import { downloadArquivo, listarArquivos } from "./ftp.js";
import { ingerirCsv } from "./ingest.js";
import { jaProcessado, registrarSync } from "./state.js";

const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
];

const GRUPOS_PADRAO = ["ST", "LT", "EQ", "PF", "SR"];

function parseArgs(): { ufs: string[]; grupos: string[]; force: boolean } {
  const args = process.argv.slice(2);
  let ufs = UFS;
  let grupos = GRUPOS_PADRAO;
  let force = false;

  const ufIdx = args.indexOf("--uf");
  if (ufIdx !== -1 && args[ufIdx + 1]) {
    ufs = args[ufIdx + 1].split(",").map((s) => s.trim().toUpperCase());
  }

  const gruposIdx = args.indexOf("--grupos");
  if (gruposIdx !== -1 && args[gruposIdx + 1]) {
    grupos = args[gruposIdx + 1].split(",").map((s) => s.trim().toUpperCase());
  }

  if (args.includes("--force")) force = true;

  return { ufs, grupos, force };
}

async function main(): Promise<void> {
  const { ufs, grupos, force } = parseArgs();
  const db = getDb();
  const tempDir = join(tmpdir(), `mcpassure-cnes-sync-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  console.log(`Iniciando sync: grupos=${grupos.join(",")} ufs=${ufs.join(",")}`);

  let totalOk = 0;
  let totalErro = 0;

  for (const grupo of grupos) {
    for (const uf of ufs) {
      try {
        const arquivos = await listarArquivos(grupo, uf);
        if (arquivos.length === 0) {
          console.log(`  [SKIP] ${grupo}/${uf}: nenhum arquivo encontrado`);
          continue;
        }

        const mais_recente = arquivos[0];
        const competencia = mais_recente.competencia;

        if (!force && jaProcessado(db, grupo, uf, competencia)) {
          console.log(`  [SKIP] ${grupo}/${uf}/${competencia}: já processado`);
          continue;
        }

        console.log(`  [DOWN] ${grupo}/${uf}/${competencia}: baixando ${mais_recente.nome}...`);
        const dbcPath = await downloadArquivo(grupo, mais_recente.nome, tempDir);

        const csvPath = dbcPath.replace(/\.dbc$/i, ".csv");
        console.log("  [CONV] convertendo DBC → CSV...");
        converterDbcParaCsv(dbcPath, csvPath);

        console.log("  [INGE] ingerindo no SQLite...");
        const rows = await ingerirCsv(db, csvPath, grupo, competencia);

        registrarSync(db, grupo, uf, competencia, rows, "ok");
        console.log(`  [OK]   ${grupo}/${uf}/${competencia}: ${rows} registros`);
        totalOk++;

        // limpar temp files
        rmSync(dbcPath, { force: true });
        rmSync(csvPath, { force: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  [ERRO] ${grupo}/${uf}: ${msg}`);
        registrarSync(db, grupo, uf, "unknown", 0, "error", msg);
        totalErro++;
      }
    }
  }

  rmSync(tempDir, { recursive: true, force: true });
  console.log(`\nSync concluída: ${totalOk} OK, ${totalErro} erros.`);

  if (totalErro > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erro fatal na sync:", err);
  process.exit(1);
});
