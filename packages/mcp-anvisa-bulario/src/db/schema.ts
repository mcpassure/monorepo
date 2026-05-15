/**
 * Schema SQLite para o dataset ANVISA Dados Abertos — Medicamentos
 * Fonte: https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv
 * Colunas CSV (separador `;`, encoding Latin1/ISO-8859-1):
 *   TIPO_PRODUTO; NOME_PRODUTO; DATA_FINALIZACAO_PROCESSO; CATEGORIA_REGULATORIA;
 *   NUMERO_REGISTRO_PRODUTO; DATA_VENCIMENTO_REGISTRO; NUMERO_PROCESSO;
 *   CLASSE_TERAPEUTICA; EMPRESA_DETENTORA_REGISTRO; SITUACAO_REGISTRO; PRINCIPIO_ATIVO
 */

export const SCHEMA_SQL = `
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS medicamentos (
  rowid              INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_produto       TEXT,
  nome_produto       TEXT NOT NULL,
  data_finalizacao   TEXT,
  categoria_regulatoria TEXT,
  numero_registro    TEXT,
  data_vencimento    TEXT,
  numero_processo    TEXT,
  classe_terapeutica TEXT,
  empresa            TEXT,
  situacao_registro  TEXT,
  principio_ativo    TEXT
);

CREATE INDEX IF NOT EXISTS idx_nome          ON medicamentos(nome_produto COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_principio     ON medicamentos(principio_ativo COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_classe        ON medicamentos(classe_terapeutica COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_empresa       ON medicamentos(empresa COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_num_processo  ON medicamentos(numero_processo);
CREATE INDEX IF NOT EXISTS idx_situacao      ON medicamentos(situacao_registro);

CREATE VIRTUAL TABLE IF NOT EXISTS medicamentos_fts USING fts5(
  nome_produto,
  principio_ativo,
  classe_terapeutica,
  content='medicamentos',
  content_rowid='rowid'
);

CREATE TABLE IF NOT EXISTS dataset_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const SCHEMA_VERSION = "2";
