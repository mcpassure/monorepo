import type { Database } from "better-sqlite3";

export function applySchema(db: Database): void {
  db.exec(`
    -- Procedimentos (Tab. 22)
    CREATE TABLE IF NOT EXISTS tuss_procedimentos (
      codigo TEXT PRIMARY KEY,
      descricao TEXT NOT NULL,
      tipo TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      tabela_versao TEXT,
      criado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS tuss_procedimentos_fts
      USING fts5(codigo UNINDEXED, descricao, content='tuss_procedimentos', content_rowid='rowid', tokenize='unicode61');

    -- Materiais e OPME (Tab. 19)
    CREATE TABLE IF NOT EXISTS tuss_materiais (
      codigo TEXT PRIMARY KEY,
      descricao TEXT NOT NULL,
      tipo TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      tabela_versao TEXT
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS tuss_materiais_fts
      USING fts5(codigo UNINDEXED, descricao, content='tuss_materiais', content_rowid='rowid', tokenize='unicode61');

    -- Medicamentos (Tab. 20)
    CREATE TABLE IF NOT EXISTS tuss_medicamentos (
      codigo TEXT PRIMARY KEY,
      descricao TEXT NOT NULL,
      tipo TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      tabela_versao TEXT
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS tuss_medicamentos_fts
      USING fts5(codigo UNINDEXED, descricao, content='tuss_medicamentos', content_rowid='rowid', tokenize='unicode61');

    -- Diárias, Taxas e Gasoterapia (Tab. 18)
    CREATE TABLE IF NOT EXISTS tuss_taxas_diarias (
      codigo TEXT PRIMARY KEY,
      descricao TEXT NOT NULL,
      tipo TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      tabela_versao TEXT
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS tuss_taxas_diarias_fts
      USING fts5(codigo UNINDEXED, descricao, content='tuss_taxas_diarias', content_rowid='rowid', tokenize='unicode61');

    -- Cobertura Rol ANS (da correlação TUSS-ROL)
    CREATE TABLE IF NOT EXISTS rol_cobertura (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_tuss TEXT NOT NULL,
      procedimento_rol TEXT,
      correlacao TEXT,
      rn_origem TEXT,
      vigencia TEXT,
      od INTEGER,
      amb INTEGER,
      hco INTEGER,
      hso INTEGER,
      pac INTEGER,
      tem_dut INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_rol_codigo ON rol_cobertura(codigo_tuss);
    CREATE INDEX IF NOT EXISTS idx_rol_segmento ON rol_cobertura(correlacao, amb, hco, hso, od, pac);

    -- Hierarquia CBHPM (da correlação TUSS-ROL)
    CREATE TABLE IF NOT EXISTS cbhpm_hierarquia (
      codigo_tuss TEXT PRIMARY KEY,
      subgrupo TEXT,
      grupo TEXT,
      capitulo TEXT
    );

    -- Metadado de sincronização
    CREATE TABLE IF NOT EXISTS sincronizacao_versoes (
      tabela TEXT PRIMARY KEY,
      versao TEXT,
      data_sincronizacao TEXT,
      rn_referencia TEXT,
      url_fonte TEXT
    );
  `);
}

export function rebuildFts(db: Database): void {
  const tables = [
    "tuss_procedimentos",
    "tuss_materiais",
    "tuss_medicamentos",
    "tuss_taxas_diarias",
  ];
  for (const t of tables) {
    db.exec(
      `INSERT INTO ${t}_fts(${t}_fts) VALUES('rebuild')`
    );
  }
}
