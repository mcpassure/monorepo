// Mapper colunas DBC SR → schema tabela servicos_especializados
//
// v1.1.1: campo `extra_json` preserva a linha DATASUS original como JSON
// (resiliência contra drift de schema do DBC).

export type SrRow = Record<string, string>;

export function mapSR(row: SrRow, competencia: string): Record<string, unknown> {
  return {
    co_cnes: (row.CNES ?? row.CO_CNES ?? "").trim(),
    co_servico: (row.SERV_ESP ?? row.CO_SERVICO ?? "").trim() || null,
    ds_servico: (row.DS_SERVICO ?? "").trim() || null,
    co_class_sr: (row.CLASS_SR ?? row.CO_CLASS_SR ?? "").trim() || null,
    ds_class_sr: (row.DS_CLASS_SR ?? "").trim() || null,
    competencia,
    extra_json: JSON.stringify(row),
  };
}
