#!/usr/bin/env tsx
/**
 * 01b-ingest-local.ts
 *
 * Ingesta o arquivo XLSX da correlação TUSS-ROL a partir de um arquivo local
 * já baixado (por ex. via PowerShell quando Node.js fetch falha por TLS no Windows).
 *
 * Uso:
 *   tsx bin/01b-ingest-local.ts <caminho-do-xlsx>
 *   tsx bin/01b-ingest-local.ts   (busca automaticamente em results/)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openIntegrationDb, INTEGRATION_DB_PATH, dbStats, srcImport } from "./lib/db.js";
import { RESULTS_DIR } from "./lib/reporter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  INGESTÃO LOCAL — vetrum-tuss-mcp                    ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  // Localizar arquivo XLSX
  let xlsxPath = process.argv[2];

  if (!xlsxPath) {
    // Buscar automaticamente em results/
    const arquivos = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith(".xlsx"));
    if (arquivos.length === 0) {
      console.error(`\n❌ Nenhum arquivo .xlsx encontrado em ${RESULTS_DIR}`);
      console.error("\nBaixe manualmente com PowerShell:");
      console.error('  Invoke-WebRequest -Uri "<URL_ANS>" -OutFile "results\\CorrelaoTUSS.xlsx"');
      process.exit(1);
    }
    // Usar o mais recente
    arquivos.sort();
    xlsxPath = path.join(RESULTS_DIR, arquivos[arquivos.length - 1]);
  }

  if (!fs.existsSync(xlsxPath)) {
    console.error(`\n❌ Arquivo não encontrado: ${xlsxPath}`);
    process.exit(1);
  }

  const tamanho = (fs.statSync(xlsxPath).size / 1024 / 1024).toFixed(2);
  console.log(`\nArquivo: ${xlsxPath}`);
  console.log(`Tamanho: ${tamanho} MB`);
  console.log(`Banco destino: ${INTEGRATION_DB_PATH}`);

  // Carregar módulos source
  const { applySchema, rebuildFts } = await srcImport("db", "schema.js");
  const { getSyncStatus } = await srcImport("db", "queries.js");
  const { parseCorrelacaoTussRol } = await srcImport("sync", "parser.js");

  const db = openIntegrationDb();
  (applySchema as (db: unknown) => void)(db);

  // Ler buffer do arquivo local
  console.log("\nLendo arquivo XLSX...");
  const buffer = fs.readFileSync(xlsxPath);

  // Parsear
  console.log("Parseando correlação TUSS-ROL...");
  const inicio = Date.now();
  const rows = await (parseCorrelacaoTussRol as (buf: Buffer) => Promise<unknown[]>)(buffer);
  console.log(`  → ${rows.length} linhas válidas encontradas`);

  if (rows.length === 0) {
    console.error("\n❌ Nenhuma linha válida no arquivo. Verifique se é o arquivo correto.");
    db.close();
    process.exit(1);
  }

  // Ingestão atômica
  console.log("\nIniciando ingestão atômica...");

  // Extrair versão do nome do arquivo
  const nomeArq = path.basename(xlsxPath);
  const versaoMatch = nomeArq.match(/TUSS(\d+)/i);
  const rnMatch = nomeArq.match(/RN(\d+)/i);
  const versao = versaoMatch ? versaoMatch[1] : new Date().toISOString().slice(0, 7).replace("-", "");
  const rnRef = rnMatch ? `RN ${rnMatch[1]}` : null;

  console.log(`  Versão detectada: ${versao}`);
  console.log(`  RN detectada: ${rnRef ?? "N/A"}`);

  // Inserções manuais (replicando a lógica do ingestor sem o download)
  const stmtProc = db.prepare(
    `INSERT OR IGNORE INTO tuss_procedimentos (codigo, descricao, tabela_versao) VALUES (?, ?, 'correlacao')`
  );
  const stmtRol = db.prepare(
    `INSERT INTO rol_cobertura
     (codigo_tuss, procedimento_rol, correlacao, rn_origem, vigencia, od, amb, hco, hso, pac, tem_dut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const stmtHier = db.prepare(
    `INSERT OR REPLACE INTO cbhpm_hierarquia (codigo_tuss, subgrupo, grupo, capitulo) VALUES (?, ?, ?, ?)`
  );
  const stmtSync = db.prepare(
    `INSERT OR REPLACE INTO sincronizacao_versoes
     (tabela, versao, data_sincronizacao, rn_referencia, url_fonte)
     VALUES (?, ?, datetime('now'), ?, ?)`
  );

  const ingestTx = db.transaction((batch: unknown[]) => {
    db.exec("DELETE FROM rol_cobertura; DELETE FROM cbhpm_hierarquia; DELETE FROM tuss_procedimentos;");

    for (const r of batch as Array<Record<string, unknown>>) {
      stmtProc.run(r.codigo, r.descricao_tuss ?? "");
      stmtRol.run(
        r.codigo, r.procedimento_rol, r.correlacao, r.rn_origem, r.vigencia,
        r.od ? 1 : 0, r.amb ? 1 : 0, r.hco ? 1 : 0, r.hso ? 1 : 0, r.pac ? 1 : 0,
        r.tem_dut ? 1 : 0
      );
      if (r.subgrupo || r.grupo || r.capitulo) {
        stmtHier.run(r.codigo, r.subgrupo, r.grupo, r.capitulo);
      }
    }

    stmtSync.run("tuss_22", versao, rnRef, xlsxPath);
    stmtSync.run("rol_correlacao", versao, rnRef, xlsxPath);
    for (const t of ["tuss_18", "tuss_19", "tuss_20"]) {
      const existing = db.prepare("SELECT versao FROM sincronizacao_versoes WHERE tabela = ?").get(t);
      if (!existing) stmtSync.run(t, "pendente", null, null);
    }
  });

  ingestTx(rows);
  console.log("  → Transação concluída.");

  // Rebuild FTS
  console.log("Reconstruindo índices FTS5...");
  (rebuildFts as (db: unknown) => void)(db);

  const duracao = Date.now() - inicio;
  const stats = dbStats(db);

  console.log(`\n✅ Ingestão concluída em ${(duracao / 1000).toFixed(1)}s\n`);
  console.log("Registros carregados:");
  for (const [tabela, cnt] of Object.entries(stats)) {
    console.log(`  ${tabela.padEnd(30)} ${cnt.toLocaleString()} registros`);
  }

  // Salvar manifesto
  const manifesto = {
    gerado_em: new Date().toISOString(),
    banco: INTEGRATION_DB_PATH,
    fonte_local: xlsxPath,
    duracao_ingestao_ms: duracao,
    versao,
    rn_referencia: rnRef,
    registros: stats,
    sincronizacao: (getSyncStatus as (db: unknown) => unknown[])(db),
  };
  fs.writeFileSync(
    path.join(RESULTS_DIR, "manifesto-download.json"),
    JSON.stringify(manifesto, null, 2),
    "utf-8"
  );
  console.log(`\nManifesto salvo: ${path.join(RESULTS_DIR, "manifesto-download.json")}`);

  db.close();
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
