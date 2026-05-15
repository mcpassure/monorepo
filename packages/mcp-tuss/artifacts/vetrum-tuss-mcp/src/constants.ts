export const ANS_URLS = {
  PAGINA_ROL:
    "https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos",
  PAGINA_TISS:
    "https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss",
} as const;

export const FHIR_SYSTEM =
  "https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS";

export const CBHPM_EDICAO = "6ª edição (2022)" as const;

export const DISCLAIMER =
  "Esta ferramenta é fonte de consulta técnica sobre terminologias da saúde suplementar brasileira. " +
  "Não substitui análise jurídica de glosa, parecer de auditoria médica nem orientação de advogado especializado. " +
  "Sempre verifique a versão vigente das normas ANS antes de tomar decisões operacionais.";

export const TABELAS = {
  PROCEDIMENTOS: "22",
  MATERIAIS_OPME: "19",
  MEDICAMENTOS: "20",
  TAXAS_DIARIAS: "18",
} as const;

export const DEFAULT_DB_DIR = ".mcpassure";
export const DEFAULT_DB_FILENAME = "tuss.db";
export const MCPASSURE_VERSION = "1.1.0";
