import type Database from "better-sqlite3";
import type { EquipamentoOutput } from "../../tools/schemas.js";
import { equipCodParaDescricao } from "../equipamentos_tipos.js";

type EquipamentoRow = {
  co_cnes: string;
  co_equip: string | null;
  ds_equip: string | null;
  qt_exist: number | null;
  qt_uso: number | null;
  competencia: string | null;
};

function rowToOutput(row: EquipamentoRow): EquipamentoOutput {
  return {
    codigoCnes: row.co_cnes,
    codigo: row.co_equip ?? "",
    descricao: row.co_equip ? equipCodParaDescricao(row.co_equip) : (row.ds_equip ?? ""),
    quantidadeExistente: row.qt_exist ?? 0,
    quantidadeEmUso: row.qt_uso ?? 0,
    competencia: row.competencia ?? "",
  };
}

export function porCnes(db: Database.Database, codigoCnes: string): EquipamentoOutput[] {
  const rows = db
    .prepare("SELECT * FROM equipamentos WHERE co_cnes = ? ORDER BY co_equip")
    .all(codigoCnes) as EquipamentoRow[];
  return rows.map(rowToOutput);
}
