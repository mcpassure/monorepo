// Mapper colunas DBC EQ → schema tabela equipamentos
//
// v1.1.1: campo `extra_json` preserva a linha DATASUS original como JSON
// (resiliência contra drift de schema do DBC).

export type EqRow = Record<string, string>;

export function mapEQ(row: EqRow, competencia: string): Record<string, unknown> {
  return {
    co_cnes: (row.CNES ?? row.CO_CNES ?? "").trim(),
    co_equip: (row.CO_EQUIP ?? "").trim() || null,
    ds_equip: (row.DS_EQUIP ?? "").trim() || null,
    qt_exist: Number.parseInt(row.QT_EXIST ?? "0", 10) || 0,
    qt_uso: Number.parseInt(row.QT_USO ?? "0", 10) || 0,
    competencia,
    extra_json: JSON.stringify(row),
  };
}
