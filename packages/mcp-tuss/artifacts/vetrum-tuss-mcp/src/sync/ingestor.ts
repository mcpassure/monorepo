import type { Database } from "better-sqlite3";
import { downloadFile, findCorrelacaoUrl } from "./downloader.js";
import { parseCorrelacaoTussRol, parseTabelaTuss } from "./parser.js";
import { rebuildFts } from "../db/schema.js";
import { ANS_URLS } from "../constants.js";
import type { CorrelacaoRow, TussRow } from "../types.js";

const BATCH_SIZE = 1000;

const TUSS_DIRECT_URLS: Record<"18" | "19" | "20" | "22", string[]> = {
  "22": [
    "https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos/CorrelaoTUSS.202409Rol.2021_TUSS202603_RN652.2025_RN654.2025.xlsx",
  ],
  "19": [],
  "20": [],
  "18": [],
};

function batchInsert<T>(
  db: Database,
  items: T[],
  insertFn: (batch: T[]) => void
): void {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    insertFn(batch);
  }
}

function upsertTussRows(
  db: Database,
  rows: TussRow[],
  table: string,
  versao: string,
  tipo?: string
): void {
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO ${table} (codigo, descricao, tipo, tabela_versao) VALUES (?, ?, ?, ?)`
  );
  const insertMany = db.transaction((batch: TussRow[]) => {
    for (const r of batch) {
      stmt.run(r.codigo, r.descricao, r.tipo ?? tipo ?? null, versao);
    }
  });
  batchInsert(db, rows, insertMany);
}

function upsertCorrelacao(db: Database, rows: CorrelacaoRow[]): void {
  const stmtRol = db.prepare(
    `INSERT INTO rol_cobertura
      (codigo_tuss, procedimento_rol, correlacao, rn_origem, vigencia, od, amb, hco, hso, pac, tem_dut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const stmtHier = db.prepare(
    `INSERT OR REPLACE INTO cbhpm_hierarquia (codigo_tuss, subgrupo, grupo, capitulo)
     VALUES (?, ?, ?, ?)`
  );
  const stmtProc = db.prepare(
    `INSERT OR IGNORE INTO tuss_procedimentos (codigo, descricao, tabela_versao)
     VALUES (?, ?, 'correlacao')`
  );

  const insertMany = db.transaction((batch: CorrelacaoRow[]) => {
    for (const r of batch) {
      stmtProc.run(r.codigo, r.descricao_tuss);
      stmtRol.run(
        r.codigo, r.procedimento_rol, r.correlacao, r.rn_origem, r.vigencia,
        r.od ? 1 : 0, r.amb ? 1 : 0, r.hco ? 1 : 0, r.hso ? 1 : 0, r.pac ? 1 : 0,
        r.tem_dut ? 1 : 0
      );
      if (r.subgrupo || r.grupo || r.capitulo) {
        stmtHier.run(r.codigo, r.subgrupo, r.grupo, r.capitulo);
      }
    }
  });

  batchInsert(db, rows, insertMany);
}

function updateSyncVersion(
  db: Database,
  tabela: string,
  versao: string,
  rnRef: string | null,
  urlFonte: string | null
): void {
  db.prepare(
    `INSERT OR REPLACE INTO sincronizacao_versoes (tabela, versao, data_sincronizacao, rn_referencia, url_fonte)
     VALUES (?, ?, datetime('now'), ?, ?)`
  ).run(tabela, versao, rnRef, urlFonte);
}

export async function ingestAll(db: Database): Promise<void> {
  console.log("[ingestor] Iniciando sincronização completa...");

  // 1. Descobrir URL da correlação TUSS-ROL
  let correlacaoUrl =
    TUSS_DIRECT_URLS["22"][0] ?? null;

  console.log("[ingestor] Buscando URL da correlação TUSS-ROL na página ANS...");
  const discovered = await findCorrelacaoUrl(ANS_URLS.PAGINA_ROL);
  if (discovered) {
    correlacaoUrl = discovered;
    console.log(`[ingestor] URL detectada: ${correlacaoUrl}`);
  } else {
    console.log(`[ingestor] Usando URL de fallback: ${correlacaoUrl}`);
  }

  if (!correlacaoUrl) {
    throw new Error("Não foi possível determinar a URL da correlação TUSS-ROL.");
  }

  // 2. Baixar e parsear correlação TUSS-ROL
  console.log("[ingestor] Baixando correlação TUSS-ROL...");
  const correlacaoBuffer = await downloadFile(correlacaoUrl);
  console.log("[ingestor] Parseando correlação TUSS-ROL...");
  const correlacaoRows = await parseCorrelacaoTussRol(correlacaoBuffer);
  console.log(`[ingestor] ${correlacaoRows.length} registros na correlação TUSS-ROL.`);

  // Extrair versão e RN do nome da URL
  const urlParts = correlacaoUrl.split("/").pop() ?? "";
  const versaoMatch = urlParts.match(/TUSS(\d+)/i);
  const rnMatch = urlParts.match(/RN(\d+)/i);
  const versao = versaoMatch ? versaoMatch[1] : new Date().toISOString().slice(0, 10);
  const rnRef = rnMatch ? `RN ${rnMatch[1]}` : null;

  // 3. Ingestão atômica
  console.log("[ingestor] Iniciando ingestão atômica...");
  const ingestTransaction = db.transaction(() => {
    // Limpar tabelas existentes
    db.exec(`
      DELETE FROM rol_cobertura;
      DELETE FROM cbhpm_hierarquia;
      DELETE FROM tuss_procedimentos;
    `);

    // Inserir dados da correlação (inclui procedimentos Tab. 22, Rol e hierarquia CBHPM)
    upsertCorrelacao(db, correlacaoRows);

    // Atualizar metadado
    updateSyncVersion(db, "tuss_22", versao, rnRef, correlacaoUrl);
    updateSyncVersion(db, "rol_correlacao", versao, rnRef, correlacaoUrl);
    // Tabelas 18, 19, 20 marcadas como "pendente" se não houver URL disponível
    for (const t of ["tuss_18", "tuss_19", "tuss_20"] as const) {
      const existing = db.prepare("SELECT versao FROM sincronizacao_versoes WHERE tabela = ?").get(t);
      if (!existing) {
        updateSyncVersion(db, t, "pendente", null, null);
      }
    }
  });

  ingestTransaction();
  console.log("[ingestor] Transação confirmada.");

  // 4. Rebuild FTS fora da transação
  console.log("[ingestor] Reconstruindo índices FTS5...");
  rebuildFts(db);

  console.log("[ingestor] Sincronização concluída.");
}

export async function ingestTabelaSimples(
  db: Database,
  buffer: Buffer,
  tabela: "18" | "19" | "20",
  versao: string,
  urlFonte: string
): Promise<void> {
  const tableMap: Record<"18" | "19" | "20", string> = {
    "18": "tuss_taxas_diarias",
    "19": "tuss_materiais",
    "20": "tuss_medicamentos",
  };
  const tipoMap: Record<"18" | "19" | "20", string | undefined> = {
    "18": undefined,
    "19": "material",
    "20": undefined,
  };

  console.log(`[ingestor] Parseando Tabela TUSS ${tabela}...`);
  const rows = await parseTabelaTuss(buffer, tabela);
  console.log(`[ingestor] ${rows.length} registros na Tabela ${tabela}.`);

  const table = tableMap[tabela];
  const tipo = tipoMap[tabela];

  const tx = db.transaction(() => {
    db.exec(`DELETE FROM ${table}`);
    upsertTussRows(db, rows, table, versao, tipo);
    updateSyncVersion(db, `tuss_${tabela}`, versao, null, urlFonte);
  });
  tx();

  db.exec(`INSERT INTO ${table}_fts(${table}_fts) VALUES('rebuild')`);
  console.log(`[ingestor] Tabela ${tabela} sincronizada.`);
}
