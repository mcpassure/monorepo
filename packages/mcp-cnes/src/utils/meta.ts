import type Database from "better-sqlite3";
import type { Meta } from "../domain/types.js";

function getThresholdDays(): number {
  const env = process.env.MCPASSURE_DEGRADED_THRESHOLD_DAYS;
  const parsed = env ? Number.parseInt(env, 10) : Number.NaN;
  return Number.isNaN(parsed) ? 75 : parsed;
}

function competenciaToDate(competencia: string): Date | null {
  if (!competencia || competencia.length < 6) return null;
  const year = Number.parseInt(competencia.slice(0, 4), 10);
  const month = Number.parseInt(competencia.slice(4, 6), 10);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildMeta(db: Database.Database): Meta {
  const row = db
    .prepare("SELECT MAX(competencia) as competencia FROM sync_log WHERE status = 'ok'")
    .get() as { competencia: string | null } | undefined;

  const competencia = row?.competencia ?? "";
  const threshold = getThresholdDays();

  if (!competencia) {
    return {
      data_da_base: "",
      competencia: "",
      fonte: "DATASUS FTP CNES",
      defasagem_dias: 0,
      modo: "cache_local",
      status: "ok",
    };
  }

  const baseDate = competenciaToDate(competencia);
  const now = new Date();
  const defasagem_dias = baseDate ? Math.max(0, daysBetween(baseDate, now)) : 0;

  return {
    data_da_base: baseDate ? baseDate.toISOString() : "",
    competencia,
    fonte: "DATASUS FTP CNES",
    defasagem_dias,
    modo: "cache_local",
    status: defasagem_dias > threshold ? "stale" : "ok",
  };
}

/**
 * Metadata para resposta quando cache local está vazio.
 * v1.1.1: substitui buildFallbackMeta — não há mais fallback online.
 */
export function buildEmptyMeta(): Meta {
  return {
    data_da_base: "",
    competencia: "",
    fonte: "DATASUS FTP CNES",
    defasagem_dias: 0,
    modo: "cache_vazio",
    status: "empty",
  };
}
