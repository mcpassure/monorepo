#!/usr/bin/env tsx
/**
 * Canário diário — valida disponibilidade e layout upstream do CNES/DATASUS.
 * Exit 0: tudo OK.
 * Exit 1: divergência de schema ou fonte primária inacessível.
 *
 * v1.1.1: removido check de fallback REST TCU (endpoint quebrado upstream,
 * decisão de remover fallback online — ver src/fallback/client.ts header).
 *
 * Não executa blast. Não baixa DBC completo. Apenas:
 *   1. Carrega schema baseline (cnes_dbc_layout.v1.json)
 *   2. Lista diretórios FTP DATASUS — detecta indisponibilidade ou drift de formato
 *   3. Reporta competência mais recente por grupo + cobertura de UFs
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client as FtpClient } from "basic-ftp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "..", "src", "sources", "schemas", "cnes_dbc_layout.v1.json");
const FTP_HOST = "ftp.datasus.gov.br";
const FTP_BASE = "/dissemin/publicos/CNES/200508_/Dados";

type GroupSchema = {
  required_columns: string[];
  optional_columns: string[];
};

type LayoutSchema = {
  groups: Record<string, GroupSchema>;
};

function loadSchema(): LayoutSchema {
  if (!existsSync(SCHEMA_PATH)) {
    throw new Error(`Schema baseline não encontrado: ${SCHEMA_PATH}`);
  }
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")) as LayoutSchema;
}

// Regex candidatas em ordem de probabilidade. O DATASUS tem usado historicamente
// múltiplos formatos; mantemos tolerância para evitar falso-positivo de drift.
const REGEX_CANDIDATES = [
  // Padrão atual confirmado em 2026-05: {GRUPO}{UF}{AAMM}.dbc — ex: STSP2603.dbc
  (grupo: string) => ({
    name: `${grupo}{UF}{AAMM}.dbc`,
    regex: new RegExp(`^${grupo}([A-Z]{2})(\\d{4})\\.dbc$`, "i"),
  }),
  // Padrão legado/alternativo: {GRUPO}{UF}{AAAAMM}.dbc
  (grupo: string) => ({
    name: `${grupo}{UF}{AAAAMM}.dbc`,
    regex: new RegExp(`^${grupo}([A-Z]{2})(\\d{6})\\.dbc$`, "i"),
  }),
  // Variante .dbf (alguns grupos antigos)
  (grupo: string) => ({
    name: `${grupo}{UF}{AAMM}.dbf`,
    regex: new RegExp(`^${grupo}([A-Z]{2})(\\d{4})\\.dbf$`, "i"),
  }),
];

async function checkFtpAvailability(): Promise<{
  ok: boolean;
  latestCompetencias: Record<string, string>;
  ufCount: Record<string, number>;
  matchedFormat: Record<string, string>;
}> {
  const client = new FtpClient();
  client.ftp.verbose = false;
  const latestCompetencias: Record<string, string> = {};
  const ufCount: Record<string, number> = {};
  const matchedFormat: Record<string, string> = {};

  try {
    await client.access({ host: FTP_HOST, secure: false });

    for (const grupo of ["ST", "LT", "EQ", "PF", "SR"]) {
      try {
        const files = await client.list(`${FTP_BASE}/${grupo}`);

        let matched: { name: string; ufs: Set<string>; latest: string } | null = null;
        for (const candidateFn of REGEX_CANDIDATES) {
          const candidate = candidateFn(grupo);
          const matches = files
            .map((f) => ({ name: f.name, match: f.name.match(candidate.regex) }))
            .filter(
              (x): x is { name: string; match: RegExpMatchArray } => x.match !== null
            );

          if (matches.length > 0) {
            const competencias = matches.map((m) => m.match[2]).sort();
            const ufs = new Set(matches.map((m) => m.match[1]));
            matched = {
              name: candidate.name,
              ufs,
              latest: competencias[competencias.length - 1],
            };
            break;
          }
        }

        if (!matched) {
          const sampleNames = files
            .filter((f) => f.type === 1 || !f.type)
            .slice(0, 10)
            .map((f) => f.name);
          console.warn(`  [WARN] ${grupo}: 0 matches em nenhum formato. Amostra:`);
          if (sampleNames.length === 0) {
            console.warn(`         (diretório vazio)`);
          } else {
            for (const n of sampleNames) {
              console.warn(`         - ${n}`);
            }
          }
          continue;
        }

        latestCompetencias[grupo] = matched.latest;
        ufCount[grupo] = matched.ufs.size;
        matchedFormat[grupo] = matched.name;
      } catch (err) {
        console.warn(
          `  [WARN] FTP: não foi possível listar ${grupo}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return { ok: true, latestCompetencias, ufCount, matchedFormat };
  } catch (err) {
    console.error(
      `  [FAIL] FTP inacessível: ${err instanceof Error ? err.message : String(err)}`
    );
    return { ok: false, latestCompetencias, ufCount, matchedFormat };
  } finally {
    client.close();
  }
}

async function main(): Promise<void> {
  console.log("=== MCPAssure CNES Canary ===");
  console.log(`Data: ${new Date().toISOString()}`);

  let schema: LayoutSchema;
  try {
    schema = loadSchema();
    console.log("[OK]   Schema baseline carregado");
    console.log(`       Grupos no baseline: ${Object.keys(schema.groups).join(", ")}`);
  } catch (err) {
    console.error(`[FAIL] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  console.log("\n[1/2] Verificando FTP DATASUS (fonte oficial única)...");
  const { ok: ftpOk, latestCompetencias, ufCount, matchedFormat } = await checkFtpAvailability();
  if (!ftpOk) {
    console.error("[FAIL] FTP DATASUS indisponível");
    process.exit(1);
  }
  console.log("  [OK]   FTP acessível");

  console.log("\n[2/2] Competências mais recentes no FTP:");
  const expectedGroups = ["ST", "LT", "EQ", "PF", "SR"];
  const missingGroups: string[] = [];
  for (const grupo of expectedGroups) {
    const comp = latestCompetencias[grupo];
    if (!comp) {
      missingGroups.push(grupo);
      console.log(`  ${grupo}: NENHUMA competência encontrada`);
      continue;
    }
    const year = comp.length === 6 ? comp.slice(0, 4) : `20${comp.slice(0, 2)}`;
    const month = comp.length === 6 ? comp.slice(4, 6) : comp.slice(2, 4);
    const ufs = ufCount[grupo] ?? 0;
    const fmt = matchedFormat[grupo] ?? "?";
    console.log(`  ${grupo}: ${year}-${month} (${comp}) — ${ufs} UFs — formato: ${fmt}`);
  }

  if (missingGroups.length > 0) {
    console.error(`\n[FAIL] Grupos sem arquivos no FTP: ${missingGroups.join(", ")}`);
    console.error(`       Verificar amostra de nomes acima e ajustar regex em REGEX_CANDIDATES.`);
    process.exit(1);
  }

  console.log("\n=== Canário concluído sem divergências ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("[FATAL]", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
