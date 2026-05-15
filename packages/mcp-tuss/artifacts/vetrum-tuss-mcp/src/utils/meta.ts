import type { Database } from "better-sqlite3";
import type { TerminologiaMeta } from "../domain/types.js";
import { CBHPM_EDICAO } from "../constants.js";

const STALE_THRESHOLD_DAYS = parseInt(
  process.env.MCPASSURE_DEGRADED_THRESHOLD_DAYS ?? "90",
  10
);

export function calcularDefasagem(dataBase: string | null | undefined): number {
  if (!dataBase) return 0;
  const base = new Date(dataBase).getTime();
  if (isNaN(base)) return 0;
  const now = Date.now();
  return Math.max(0, Math.floor((now - base) / (1000 * 60 * 60 * 24)));
}

interface SyncRow {
  versao: string | null;
  data_sincronizacao: string | null;
  rn_referencia: string | null;
  url_fonte: string | null;
}

function getSyncRow(db: Database, tabela: string): SyncRow | undefined {
  return db
    .prepare(
      "SELECT versao, data_sincronizacao, rn_referencia, url_fonte FROM sincronizacao_versoes WHERE tabela = ?"
    )
    .get(tabela) as SyncRow | undefined;
}

export function buildTussMeta(db: Database): TerminologiaMeta {
  const row = getSyncRow(db, "tuss_22");
  const dataBase = row?.data_sincronizacao ?? null;
  const defasagem = calcularDefasagem(dataBase);
  return {
    terminologia: "TUSS",
    versao: row?.versao ?? "desconhecida",
    data_da_base: dataBase ?? new Date(0).toISOString(),
    fonte:
      row?.url_fonte ??
      "https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS",
    defasagem_dias: defasagem,
    modo: "cache_local",
    status: defasagem > STALE_THRESHOLD_DAYS ? "stale" : "ok",
  };
}

export function buildRolAnsMeta(db: Database): TerminologiaMeta {
  const row = getSyncRow(db, "rol_correlacao");
  const dataBase = row?.data_sincronizacao ?? null;
  const defasagem = calcularDefasagem(dataBase);
  return {
    terminologia: "Rol ANS",
    versao: row?.rn_referencia ?? row?.versao ?? "desconhecida",
    data_da_base: dataBase ?? new Date(0).toISOString(),
    fonte:
      row?.url_fonte ??
      "https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos",
    defasagem_dias: defasagem,
    modo: "cache_local",
    status: defasagem > STALE_THRESHOLD_DAYS ? "stale" : "ok",
  };
}

export function buildCbhpmMeta(db: Database): TerminologiaMeta {
  const row = getSyncRow(db, "tuss_22");
  const dataBase = row?.data_sincronizacao ?? null;
  const defasagem = calcularDefasagem(dataBase);
  return {
    terminologia: "CBHPM",
    versao: CBHPM_EDICAO,
    data_da_base: dataBase ?? new Date(0).toISOString(),
    fonte: "https://www.amb.org.br",
    defasagem_dias: defasagem,
    modo: "cache_local",
    status: defasagem > STALE_THRESHOLD_DAYS ? "stale" : "ok",
  };
}
