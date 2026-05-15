import Database from "better-sqlite3";
import { applySchema } from "../src/db/schema.js";
import { TussRepository } from "../src/domain/tuss-repository.js";
import { RolAnsRepository } from "../src/domain/rol-repository.js";
import { CbhpmRepository } from "../src/domain/cbhpm-repository.js";
import { TerminologiaRepository } from "../src/domain/repository.js";
import type { ITerminologiaRepository } from "../src/domain/repository.js";

export function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  applySchema(db);
  populateFixtures(db);
  return db;
}

export function createTestRepository(db?: Database.Database): ITerminologiaRepository {
  const testDb = db ?? createTestDb();
  const tuss = new TussRepository(testDb);
  const rol = new RolAnsRepository(testDb);
  const cbhpm = new CbhpmRepository(testDb);
  return new TerminologiaRepository(tuss, rol, cbhpm);
}

function populateFixtures(db: Database.Database): void {
  const now = new Date().toISOString();

  // Procedimentos (Tab. 22)
  db.prepare(
    "INSERT INTO tuss_procedimentos (codigo, descricao, ativo, tabela_versao) VALUES (?, ?, 1, '202501')"
  ).run("10101012", "Consulta em consultório (no horário normal ou preestabelecido)");

  db.prepare(
    "INSERT INTO tuss_procedimentos (codigo, descricao, ativo, tabela_versao) VALUES (?, ?, 1, '202501')"
  ).run("40301370", "Ressonância magnética de crânio e encéfalo");

  db.prepare(
    "INSERT INTO tuss_procedimentos (codigo, descricao, ativo, tabela_versao) VALUES (?, ?, 1, '202501')"
  ).run("40702014", "Transplante de córnea");

  db.prepare(
    "INSERT INTO tuss_procedimentos (codigo, descricao, ativo, tabela_versao) VALUES (?, ?, 1, '202501')"
  ).run("40101015", "Colonoscopia com biópsias múltiplas");

  db.prepare(
    "INSERT INTO tuss_procedimentos (codigo, descricao, ativo, tabela_versao) VALUES (?, ?, 1, '202501')"
  ).run("40101023", "Colonoscopia com mucosectomia");

  db.prepare(
    "INSERT INTO tuss_procedimentos (codigo, descricao, ativo, tabela_versao) VALUES (?, ?, 1, '202501')"
  ).run("40101031", "Colonoscopia diagnóstica");

  // Materiais (Tab. 19)
  db.prepare(
    "INSERT INTO tuss_materiais (codigo, descricao, tipo, ativo, tabela_versao) VALUES (?, ?, ?, 1, '202505')"
  ).run("98765432", "Parafuso de titânio para fixação óssea", "opme");

  db.prepare(
    "INSERT INTO tuss_materiais (codigo, descricao, tipo, ativo, tabela_versao) VALUES (?, ?, ?, 1, '202505')"
  ).run("98765433", "Placa de titânio para fixação", "material");

  // Medicamentos (Tab. 20)
  db.prepare(
    "INSERT INTO tuss_medicamentos (codigo, descricao, ativo, tabela_versao) VALUES (?, ?, 1, '202505')"
  ).run("12345678", "Dipirona sódica 500mg/mL solução injetável");

  // Taxas/Diárias (Tab. 18)
  db.prepare(
    "INSERT INTO tuss_taxas_diarias (codigo, descricao, tipo, ativo, tabela_versao) VALUES (?, ?, ?, 1, '202501')"
  ).run("20202143", "Diária em UTI adulto", "diaria");

  db.prepare(
    "INSERT INTO tuss_taxas_diarias (codigo, descricao, tipo, ativo, tabela_versao) VALUES (?, ?, ?, 1, '202501')"
  ).run("20202127", "Taxa de sala de cirurgia", "taxa");

  // Cobertura Rol ANS (para código 10101012)
  db.prepare(
    `INSERT INTO rol_cobertura
      (codigo_tuss, procedimento_rol, correlacao, rn_origem, vigencia, od, amb, hco, hso, pac, tem_dut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("10101012", "CONSULTA MÉDICA", "SIM", "RN 465/2021", "02/01/2022", 0, 1, 1, 1, 1, 0);

  // Cobertura Rol ANS (para ressonância magnética — com DUT)
  db.prepare(
    `INSERT INTO rol_cobertura
      (codigo_tuss, procedimento_rol, correlacao, rn_origem, vigencia, od, amb, hco, hso, pac, tem_dut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("40301370", "RESSONÂNCIA MAGNÉTICA DO ENCÉFALO", "SIM", "RN 465/2021", "02/01/2022", 0, 1, 1, 1, 0, 1);

  // Cobertura Rol ANS (para transplante de córnea — hospitalar)
  db.prepare(
    `INSERT INTO rol_cobertura
      (codigo_tuss, procedimento_rol, correlacao, rn_origem, vigencia, od, amb, hco, hso, pac, tem_dut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("40702014", "TRANSPLANTE DE CÓRNEA", "SIM", "RN 465/2021", "02/01/2022", 0, 0, 1, 1, 0, 0);

  // Hierarquia CBHPM
  db.prepare(
    "INSERT INTO cbhpm_hierarquia (codigo_tuss, subgrupo, grupo, capitulo) VALUES (?, ?, ?, ?)"
  ).run("10101012", "CONSULTAS, VISITAS HOSPITALARES OU ACOMPANHAMENTO DE PACIENTES", "PROCEDIMENTOS GERAIS", "PROCEDIMENTOS GERAIS");

  db.prepare(
    "INSERT INTO cbhpm_hierarquia (codigo_tuss, subgrupo, grupo, capitulo) VALUES (?, ?, ?, ?)"
  ).run("40702014", "TRANSPLANTES OCULARES", "PROCEDIMENTOS CIRÚRGICOS", "OFTALMOLOGIA");

  // FTS5 rebuild
  db.exec(`
    INSERT INTO tuss_procedimentos_fts(tuss_procedimentos_fts) VALUES('rebuild');
    INSERT INTO tuss_materiais_fts(tuss_materiais_fts) VALUES('rebuild');
    INSERT INTO tuss_medicamentos_fts(tuss_medicamentos_fts) VALUES('rebuild');
    INSERT INTO tuss_taxas_diarias_fts(tuss_taxas_diarias_fts) VALUES('rebuild');
  `);

  // Metadado de sincronização
  const stmt = db.prepare(
    "INSERT INTO sincronizacao_versoes (tabela, versao, data_sincronizacao, rn_referencia, url_fonte) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run("tuss_22", "202501", now, "RN 627/2025", "https://www.gov.br/ans/...");
  stmt.run("tuss_19", "202505", now, null, null);
  stmt.run("tuss_20", "202505", now, null, null);
  stmt.run("tuss_18", "202501", now, null, null);
  stmt.run("rol_correlacao", "202603", now, "RN 654/2025", "https://www.gov.br/ans/...");
}
