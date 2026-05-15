import type Database from "better-sqlite3";
import type { Meta } from "../domain/types.js";

const FONTE = "ANS TUSS (ans.gov.br/arquivos/extras/tiss)";

function getThresholdDays(): number {
  const env = process.env.MCPASSURE_DEGRADED_THRESHOLD_DAYS;
  const parsed = env ? Number.parseInt(env, 10) : Number.NaN;
  return Number.isNaN(parsed) ? 120 : parsed;
}

export function buildMeta(db: Database.Database, tabela: "22" | "20" | "18"): Meta {
  const row = db
    .prepare(
      "SELECT versao, synced_at FROM sync_log WHERE tabela = ? AND status = 'ok' ORDER BY id DESC LIMIT 1"
    )
    .get(`tuss_${tabela}`) as { versao: string; synced_at: string } | undefined;

  if (!row) {
    return buildEmptyMeta();
  }

  const threshold = getThresholdDays();
  const baseDate = new Date(row.synced_at);
  const defasagem_dias = Number.isNaN(baseDate.getTime())
    ? 0
    : Math.floor((Date.now() - baseDate.getTime()) / 86_400_000);

  return {
    data_da_base: row.synced_at,
    competencia: row.versao,
    fonte: FONTE,
    defasagem_dias,
    modo: "cache_local",
    status: defasagem_dias > threshold ? "stale" : "ok",
  };
}

export function buildEmptyMeta(): Meta {
  return {
    data_da_base: "",
    competencia: "",
    fonte: FONTE,
    defasagem_dias: 0,
    modo: "cache_vazio",
    status: "empty",
  };
}
