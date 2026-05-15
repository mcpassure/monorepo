// Mapeamento código de leito DATASUS → descrição legível
// Referência: dicionário de dados CNES/DATASUS grupo LT

export const LEITO_CODIGO_PARA_DESCRICAO: Record<string, string> = {
  "01": "Cirúrgico",
  "02": "Clínico",
  "03": "Obstétrico",
  "04": "Pediátrico",
  "05": "Outras Especialidades",
  "06": "Psiquiátrico",
  "07": "Tisiológico",
  "08": "Hospital-Dia / AIDS",
  "09": "Hospital-Dia / Cirurgia",
  "10": "Hospital-Dia / Geriatria",
  "11": "Hospital-Dia / Saúde Mental",
  "12": "Hospital-Dia / Fibrose Cística",
  "13": "UTI Adulto - Tipo I",
  "14": "UTI Adulto - Tipo II",
  "15": "UTI Adulto - Tipo III",
  "16": "UTI Pediátrica",
  "17": "UTI Neonatal",
  "18": "UTI Queimado",
  "19": "UTI Coronariana Tipo II",
  "20": "UTI Coronariana Tipo III",
  "21": "Reabilitação",
};

export function leitoCodParaDescricao(codigo: string): string {
  return LEITO_CODIGO_PARA_DESCRICAO[codigo] ?? `Leito código ${codigo}`;
}

export function isUTI(codigoLeito: string): boolean {
  const utiCodes = ["13", "14", "15", "16", "17", "18", "19", "20"];
  return utiCodes.includes(codigoLeito);
}
