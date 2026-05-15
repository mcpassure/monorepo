/**
 * LGPD compliance utilities para dados de profissionais de saúde (CNES).
 *
 * Por padrão, CPFs retornados pelas tools são mascarados.
 * Para desabilitar o masking (e.g. em ambiente interno de auditoria), configure:
 *
 *   MCPASSURE_LGPD_ALLOW_PII=cnes
 *
 * Múltiplos datasets separados por vírgula: MCPASSURE_LGPD_ALLOW_PII=cnes,tuss
 *
 * Removido em v0.2.0: fallback VETRUM_LGPD_ALLOW_PII
 */

/**
 * Mascara CPF no formato ***.XXX.YYY-** preservando os dígitos 7-9.
 * Retorna "***" se o CPF não tiver 11 dígitos numéricos.
 */
export function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***";
  return `***.***.${digits.slice(6, 9)}-**`;
}

/**
 * Retorna true se CPFs devem ser mascarados para o dataset CNES.
 * Masking é o comportamento padrão (opt-in para exibir PII).
 */
export function shouldMask(): boolean {
  const allowed =
    process.env.MCPASSURE_LGPD_ALLOW_PII?.split(",").map((s) => s.trim().toLowerCase()) ?? [];
  return !allowed.includes("cnes");
}
