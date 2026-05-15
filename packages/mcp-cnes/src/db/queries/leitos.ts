import type Database from "better-sqlite3";
import type { LeitoOutput } from "../../tools/schemas.js";
import { leitoCodParaDescricao } from "../leitos_tipos.js";

type LeitoRow = {
  co_cnes: string;
  tp_leito: string | null;
  co_leito: string | null;
  qt_exist: number | null;
  qt_sus: number | null;
  qt_nsus: number | null;
  competencia: string | null;
};

function rowToOutput(row: LeitoRow): LeitoOutput {
  return {
    codigoCnes: row.co_cnes,
    tipo: row.co_leito ? leitoCodParaDescricao(row.co_leito) : (row.tp_leito ?? ""),
    codigo: row.co_leito ?? "",
    leitosExistentes: row.qt_exist ?? 0,
    leitosSus: row.qt_sus ?? 0,
    leitosNaoSus: row.qt_nsus ?? 0,
    competencia: row.competencia ?? "",
  };
}

export function porCnes(db: Database.Database, codigoCnes: string): LeitoOutput[] {
  const rows = db
    .prepare("SELECT * FROM leitos WHERE co_cnes = ? ORDER BY co_leito")
    .all(codigoCnes) as LeitoRow[];
  return rows.map(rowToOutput);
}
