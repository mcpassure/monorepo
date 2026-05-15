// Mapper colunas DBC LT → schema tabela leitos
//
// v1.1.1: campo `extra_json` preserva a linha DATASUS original como JSON
// (resiliência contra drift de schema do DBC).

export type LtRow = Record<string, string>;

export function mapLT(row: LtRow, competencia: string): Record<string, unknown> {
  return {
    co_cnes: (row.CNES ?? row.CO_CNES ?? "").trim(),
    tp_leito: (row.TP_LEITO ?? "").trim() || null,
    co_leito: (row.CO_LEITO ?? "").trim() || null,
    qt_exist: Number.parseInt(row.QT_EXIST ?? "0", 10) || 0,
    qt_sus: Number.parseInt(row.QT_SUS ?? "0", 10) || 0,
    qt_nsus: Number.parseInt(row.QT_NSUS ?? "0", 10) || 0,
    competencia,
    extra_json: JSON.stringify(row),
  };
}
