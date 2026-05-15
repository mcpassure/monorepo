#!/usr/bin/env tsx
/**
 * 01-download-bases.ts
 *
 * Baixa as bases reais da ANS e popula o banco de integração.
 * Usa o ingestor do projeto source — nenhuma lógica duplicada.
 *
 * Uso:
 *   npm run download            → baixa só se o banco estiver vazio
 *   npm run download -- --force → reprocessa mesmo que já exista dado
 */
import fs from "fs";
import { openIntegrationDb, INTEGRATION_DB_PATH, dbStats, srcImport } from "./lib/db.js";
import { RESULTS_DIR } from "./lib/reporter.js";

async function main() {
  const force = process.argv.includes("--force");

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  DOWNLOAD DE BASES REAIS — vetrum-tuss-mcp           ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nBanco de destino: ${INTEGRATION_DB_PATH}`);
  console.log(`Diretório de resultados: ${RESULTS_DIR}`);

  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const { applySchema } = await srcImport("db/schema.js");
  const { isBankEmpty } = await srcImport("db/queries.js");
  const { ingestAll } = await srcImport("sync/ingestor.js");

  const db = openIntegrationDb();
  (applySchema as (db: unknown) => void)(db);

  const estaVazio = (isBankEmpty as (db: unknown) => boolean)(db);

  if (!estaVazio && !force) {
    console.log("\n✅ Banco já contém dados. Use --force para reprocessar.\n");
    const stats = dbStats(db);
    console.log("Estatísticas atuais:");
    for (const [tabela, cnt] of Object.entries(stats)) {
      console.log(`  ${tabela.padEnd(30)} ${cnt.toLocaleString()} registros`);
    }
    salvarManifesto(db, stats);
    db.close();
    return;
  }

  if (force) {
    console.log("\n⚠️  Modo --force: reprocessando banco completo...");
  } else {
    console.log("\n📥 Banco vazio. Iniciando download das bases ANS...");
  }

  console.log("\nFontes:");
  console.log("  • Correlação TUSS-ROL: portal.gov.br/ans (URL detectada automaticamente)");
  console.log("  • Fallback: URL hardcoded em ingestor.ts\n");

  const inicio = Date.now();

  try {
    await (ingestAll as (db: unknown) => Promise<void>)(db);
    const duracao = Date.now() - inicio;
    const stats = dbStats(db);

    console.log(`\n✅ Download e ingestão concluídos em ${(duracao / 1000).toFixed(1)}s\n`);
    console.log("Registros carregados:");
    for (const [tabela, cnt] of Object.entries(stats)) {
      console.log(`  ${tabela.padEnd(30)} ${cnt.toLocaleString()} registros`);
    }

    salvarManifesto(db, stats, duracao);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Erro na ingestão: ${msg}`);
    console.error("\nVerifique:");
    console.error("  1. Conectividade com portal.gov.br");
    console.error("  2. Se a URL da correlação TUSS-ROL mudou");
    db.close();
    process.exit(1);
  }

  db.close();
}

function salvarManifesto(
  db: import("better-sqlite3").Database,
  stats: Record<string, number>,
  duracao_ms?: number
): void {
  import("path").then(({ default: path }) => {
    import("fs").then(({ default: fs }) => {
      const sync = db
        .prepare("SELECT * FROM sincronizacao_versoes ORDER BY tabela")
        .all() as Array<{ tabela: string; versao: string; data_sincronizacao: string; rn_referencia: string | null }>;

      const manifesto = {
        gerado_em: new Date().toISOString(),
        banco: INTEGRATION_DB_PATH,
        duracao_download_ms: duracao_ms ?? null,
        registros: stats,
        sincronizacao: sync,
      };

      const arquivo = path.join(RESULTS_DIR, "manifesto-download.json");
      fs.writeFileSync(arquivo, JSON.stringify(manifesto, null, 2), "utf-8");
      console.log(`\nManifesto salvo: ${arquivo}`);
    });
  });
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
