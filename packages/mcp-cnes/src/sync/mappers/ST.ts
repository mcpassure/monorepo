// Mapper colunas DBC ST → schema tabela estabelecimentos
//
// v1.1.1: campo `extra_json` preserva o registro DATASUS original (linha CSV
// inteira) como JSON. Resiliência contra drift de schema do DBC — quando o
// DATASUS adicionar/renomear colunas, o dado bruto continua disponível
// enquanto este mapper é atualizado.

export type StRow = Record<string, string>;

export function mapST(row: StRow, competencia: string): Record<string, unknown> {
  return {
    co_cnes: (row.CO_CNES ?? row.co_cnes ?? "").trim(),
    no_fantasia: (row.NO_FANTASIA ?? row.no_fantasia ?? "").trim() || null,
    no_razao_social: (row.NO_RAZAO_S ?? row.no_razao_s ?? row.NO_RAZAO_SOCIAL ?? "").trim() || null,
    nu_cnpj: (row.NU_CNPJ ?? row.nu_cnpj ?? "").trim() || null,
    tp_unidade: (row.TP_UNIDADE ?? row.tp_unidade ?? "").trim() || null,
    co_natureza_jur: (row.CO_NATUREZA_JUR ?? row.co_natureza_jur ?? "").trim() || null,
    no_municipio: (row.NO_MUNICIPIO ?? row.no_municipio ?? "").trim() || null,
    sg_uf: (row.SG_UF ?? row.sg_uf ?? "").trim() || null,
    co_municipio:
      (row.CO_MUNICIPIO_GESTOR ?? row.co_municipio_gestor ?? row.CO_MUNICIPIO ?? "")
        .trim()
        .slice(0, 6) || null,
    no_logradouro: (row.NO_LOGRADO ?? row.no_logrado ?? row.NO_LOGRADOURO ?? "").trim() || null,
    nu_latitude: Number.parseFloat(row.NU_LATITUDE ?? row.nu_latitude ?? "") || null,
    nu_longitude: Number.parseFloat(row.NU_LONGITUDE ?? row.nu_longitude ?? "") || null,
    nu_telefone: (row.NU_TELEFON ?? row.nu_telefon ?? row.NU_TELEFONE ?? "").trim() || null,
    vinculo_sus: (row.TP_VINCULO_SUS ?? row.tp_vinculo_sus ?? "") === "S" ? 1 : 0,
    tp_gestao: (row.TP_GESTAO ?? row.tp_gestao ?? "").trim() || null,
    competencia,
    updated_at: new Date().toISOString(),
    extra_json: JSON.stringify(row),
  };
}
