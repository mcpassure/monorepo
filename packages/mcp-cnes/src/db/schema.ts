import type Database from "better-sqlite3";

/**
 * Schema SQLite local do MCP CNES.
 *
 * Resiliência: cada tabela tem coluna `extra_json` (TEXT) que guarda o registro
 * DATASUS original como JSON. Quando o schema do dump mudar (drift), esse campo
 * preserva o dado bruto enquanto o mapper tipado é atualizado.
 */
export function applySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS estabelecimentos (
      co_cnes         TEXT PRIMARY KEY,
      no_fantasia     TEXT,
      no_razao_social TEXT,
      nu_cnpj         TEXT,
      tp_unidade      TEXT,
      co_natureza_jur TEXT,
      no_municipio    TEXT,
      sg_uf           TEXT,
      co_municipio    TEXT,
      no_logradouro   TEXT,
      nu_latitude     REAL,
      nu_longitude    REAL,
      nu_telefone     TEXT,
      vinculo_sus     INTEGER,
      tp_gestao       TEXT,
      competencia     TEXT,
      updated_at      TEXT,
      extra_json      TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_est_uf
      ON estabelecimentos(sg_uf);

    CREATE INDEX IF NOT EXISTS idx_est_municipio
      ON estabelecimentos(co_municipio);

    CREATE INDEX IF NOT EXISTS idx_est_tipo
      ON estabelecimentos(tp_unidade);

    CREATE INDEX IF NOT EXISTS idx_est_nome
      ON estabelecimentos(no_fantasia COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS leitos (
      co_cnes     TEXT NOT NULL,
      tp_leito    TEXT NOT NULL,
      co_leito    TEXT,
      qt_exist    INTEGER,
      qt_sus      INTEGER,
      qt_nsus     INTEGER,
      competencia TEXT,
      extra_json  TEXT,
      PRIMARY KEY (co_cnes, co_leito, competencia)
    );

    CREATE INDEX IF NOT EXISTS idx_lt_cnes ON leitos(co_cnes);

    CREATE TABLE IF NOT EXISTS equipamentos (
      co_cnes     TEXT NOT NULL,
      co_equip    TEXT NOT NULL,
      ds_equip    TEXT,
      qt_exist    INTEGER,
      qt_uso      INTEGER,
      competencia TEXT,
      extra_json  TEXT,
      PRIMARY KEY (co_cnes, co_equip, competencia)
    );

    CREATE INDEX IF NOT EXISTS idx_eq_cnes ON equipamentos(co_cnes);

    CREATE TABLE IF NOT EXISTS profissionais (
      co_cnes     TEXT NOT NULL,
      cpf_prof    TEXT,
      nm_prof     TEXT,
      co_cbo      TEXT,
      ds_cbo      TEXT,
      tp_vinculo  TEXT,
      competencia TEXT,
      extra_json  TEXT,
      PRIMARY KEY (co_cnes, cpf_prof, co_cbo, competencia)
    );

    CREATE INDEX IF NOT EXISTS idx_pf_cnes ON profissionais(co_cnes);

    CREATE TABLE IF NOT EXISTS servicos_especializados (
      co_cnes      TEXT NOT NULL,
      co_servico   TEXT NOT NULL,
      ds_servico   TEXT,
      co_class_sr  TEXT,
      ds_class_sr  TEXT,
      competencia  TEXT,
      extra_json   TEXT,
      PRIMARY KEY (co_cnes, co_servico, co_class_sr, competencia)
    );

    CREATE INDEX IF NOT EXISTS idx_sr_cnes ON servicos_especializados(co_cnes);

    CREATE TABLE IF NOT EXISTS sync_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo         TEXT NOT NULL,
      uf            TEXT NOT NULL,
      competencia   TEXT NOT NULL,
      rows_upserted INTEGER,
      status        TEXT,
      error_msg     TEXT,
      synced_at     TEXT
    );
  `);
}
