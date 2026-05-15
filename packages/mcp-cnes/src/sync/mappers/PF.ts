// Mapper colunas DBC PF → schema tabela profissionais
//
// v1.1.1: campo `extra_json` preserva a linha DATASUS original como JSON
// (resiliência contra drift de schema do DBC). CPF é mascarado tanto na
// coluna tipada quanto no extra_json para evitar exposição de PII.

export type PfRow = Record<string, string>;

function mascaraCpf(cpf: string): string | null {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

function maskRowCpfs(row: PfRow): PfRow {
  const masked: PfRow = { ...row };
  for (const key of Object.keys(masked)) {
    const upper = key.toUpperCase();
    if (upper === "CPF_PROF" || upper === "CPF") {
      const raw = masked[key] ?? "";
      const m = mascaraCpf(raw.trim());
      masked[key] = m ?? "";
    }
  }
  return masked;
}

export function mapPF(row: PfRow, competencia: string): Record<string, unknown> {
  const cpfRaw = (row.CPF_PROF ?? row.cpf_prof ?? "").trim();
  return {
    co_cnes: (row.CNES ?? row.CO_CNES ?? "").trim(),
    cpf_prof: cpfRaw ? mascaraCpf(cpfRaw) : null,
    nm_prof: (row.NM_PROF ?? "").trim() || null,
    co_cbo: (row.CBO ?? row.CO_CBO ?? "").trim() || null,
    ds_cbo: (row.DS_CBO ?? "").trim() || null,
    tp_vinculo: (row.TP_VINCULO ?? "").trim() || null,
    competencia,
    extra_json: JSON.stringify(maskRowCpfs(row)),
  };
}
