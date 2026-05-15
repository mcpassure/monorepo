// Testa o pipeline FTP DATASUS: listagem, download e conversão DBC→CSV.
// Se FTP real estiver acessível, usa ele. Caso contrário, ativa VETRUM_FTP_MOCK=1.
// Um fake blast.bat/blast é criado em dir temporário para que FTP07-09 também executem.
// Nenhum teste é pulado.

import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { execSync } from "node:child_process";
import type Database from "better-sqlite3";
import { getInMemoryDb } from "../../../src/db/connection.js";
import { downloadArquivo, listarArquivos } from "../../../src/sync/ftp.js";
import { converterDbcParaCsv } from "../../../src/sync/convert.js";
import { ingerirCsv } from "../../../src/sync/ingest.js";
import {
  assertGreater,
  assertMatch,
  assertNotNull,
  assertTrue,
} from "../helpers/assert.js";
import type { Reporter } from "../helpers/reporter.js";

const SUITE = "t04-ftp";

async function checkFtp(): Promise<boolean> {
  try {
    const arquivos = await listarArquivos("ST", "SP");
    return arquivos.length > 0;
  } catch {
    return false;
  }
}

function blastDisponivel(): boolean {
  try {
    execSync("blast --version", { stdio: "ignore" });
    return true;
  } catch {
    try {
      execSync("blast -v", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

// Cria um executável fake "blast" em blastDir que copia o input para output
function criarFakeBlast(blastDir: string): void {
  if (process.platform === "win32") {
    const bat = join(blastDir, "blast.bat");
    // Trata --version/-v (para blastDisponivel()) e copia dbc→csv
    const script = [
      "@echo off",
      'if "%~1"=="--version" ( echo fake blast 0.0.1 & exit /b 0 )',
      'if "%~1"=="-v" ( echo fake blast 0.0.1 & exit /b 0 )',
      'if "%~2"=="" ( echo fake blast 0.0.1 & exit /b 0 )',
      'copy /b "%~1" "%~2" >nul',
      "",
    ].join("\r\n");
    writeFileSync(bat, script, "utf-8");
  } else {
    const sh = join(blastDir, "blast");
    const script = [
      "#!/bin/sh",
      'if [ "$1" = "--version" ] || [ "$1" = "-v" ] || [ -z "$2" ]; then',
      '  echo "fake blast 0.0.1"; exit 0',
      "fi",
      'cp "$1" "$2"',
      "",
    ].join("\n");
    writeFileSync(sh, script, "utf-8");
    execSync(`chmod +x "${sh}"`);
  }
}

async function run(
  id: string,
  name: string,
  fn: () => Promise<void>,
  reporter: Reporter
): Promise<void> {
  const t = Date.now();
  try {
    await fn();
    reporter.pass(id, name, SUITE, Date.now() - t);
  } catch (err) {
    reporter.fail(id, name, SUITE, Date.now() - t, String(err));
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function runFtpTests(_db: Database.Database, reporter: Reporter): Promise<void> {
  // Banco isolado para ingestão — evita corromper dados do seed compartilhado
  const db = getInMemoryDb();
  console.log("\n📡 Suite: FTP DATASUS + Pipeline DBC");

  // Verifica FTP real
  const ftpReal = await checkFtp();
  const blastReal = blastDisponivel();

  let blastDir: string | null = null;
  const useMock = !ftpReal;

  if (ftpReal) {
    console.log("  ✓ FTP DATASUS acessível — usando FTP real");
  } else {
    console.log("  ℹ FTP inacessível — ativando MCPASSURE_FTP_MOCK=1 (sem pular testes)");
    process.env.MCPASSURE_FTP_MOCK = "1";
  }

  if (blastReal) {
    console.log("  ✓ blast encontrado — pipeline DBC completo será testado");
  } else {
    console.log("  ℹ blast não encontrado — criando fake blast para testes de pipeline");
    blastDir = join(tmpdir(), `vetrum-blast-mock-${Date.now()}`);
    mkdirSync(blastDir, { recursive: true });
    criarFakeBlast(blastDir);
    // Adiciona blastDir ao PATH da sessão
    process.env.PATH = `${blastDir}${delimiter}${process.env.PATH}`;
    console.log(`  ✓ Fake blast criado em ${blastDir}`);
  }

  // Fixture DBC pré-baixado: usado quando blast é real + FTP está mockado (ex: Docker).
  // MCPASSURE_DBC_FIXTURE aponta para um arquivo .dbc real, evitando que o blast real
  // tente descomprimir o conteúdo CSV do mock FTP.
  // VETRUM_DBC_FIXTURE ainda funciona como fallback (deprecated, removido em v0.2.0)
  const dbcFixturePath =
    process.env.MCPASSURE_DBC_FIXTURE ?? process.env.VETRUM_DBC_FIXTURE ?? null;
  const useDbcFixture = blastReal && useMock && dbcFixturePath !== null && existsSync(dbcFixturePath);
  if (useDbcFixture && dbcFixturePath) {
    console.log(`  ✓ DBC fixture disponível — FTP07 testará blast com DBC real`);
  } else if (blastReal && useMock) {
    console.log("  ⚠ blast real + FTP mock sem fixture — FTP07 testará blast com arquivo mock (pode falhar)");
  }

  // ── Listagem FTP ───────────────────────────────────────────────────────────

  await run("FTP01", "listarArquivos ST SP retorna lista não-vazia", async () => {
    const arquivos = await listarArquivos("ST", "SP");
    assertGreater(arquivos.length, 0, "FTP deve retornar arquivos ST/SP");
    for (const a of arquivos) {
      assertNotNull(a.nome, "arquivo deve ter nome");
      assertTrue(a.grupo === "ST", `grupo esperado ST, got "${a.grupo}"`);
      assertTrue(a.uf === "SP", `uf esperada SP, got "${a.uf}"`);
      assertMatch(a.competencia, /^\d{6}$/, `competencia deve ser AAAAMM, got "${a.competencia}"`);
    }
  }, reporter);

  await run("FTP02", "listarArquivos LT SC retorna arquivos", async () => {
    const arquivos = await listarArquivos("LT", "SC");
    assertGreater(arquivos.length, 0);
    assertTrue(arquivos[0].grupo === "LT");
  }, reporter);

  await run("FTP03", "listarArquivos ordena por competência mais recente primeiro", async () => {
    const arquivos = await listarArquivos("ST", "SP");
    assertGreater(arquivos.length, 1, "precisa de ao menos 2 arquivos para comparar ordem");
    const comp0 = arquivos[0].competencia;
    const comp1 = arquivos[1].competencia;
    assertTrue(comp0 >= comp1, `primeiro (${comp0}) deve ser ≥ segundo (${comp1})`);
  }, reporter);

  await run("FTP04", "listarArquivos nome segue padrão GRUPO+UF+AAAA+MM.dbc", async () => {
    const arquivos = await listarArquivos("EQ", "RJ");
    assertGreater(arquivos.length, 0);
    assertMatch(arquivos[0].nome, /^EQ[A-Z]{2}\d{6}\.dbc$/i, `nome "${arquivos[0].nome}" fora do padrão`);
  }, reporter);

  await run("FTP05", "listarArquivos PF SP tem competência recente (após 2024)", async () => {
    const arquivos = await listarArquivos("PF", "SP");
    assertGreater(arquivos.length, 0);
    const anoComp = Number.parseInt(arquivos[0].competencia.slice(0, 4), 10);
    assertTrue(anoComp >= 2024, `competência mais recente: ${arquivos[0].competencia}`);
  }, reporter);

  // ── Download DBC ──────────────────────────────────────────────────────────

  let dbcPath: string | null = null;
  const tempDir = join(tmpdir(), `vetrum-ftp-test-${Date.now()}`);

  await run("FTP06", "downloadArquivo ST SC baixa arquivo DBC", async () => {
    mkdirSync(tempDir, { recursive: true });

    if (useDbcFixture && dbcFixturePath) {
      // Docker: copiar DBC fixture real em vez de baixar o mock (CSV disfarcado de DBC)
      dbcPath = join(tempDir, "STSC202501.dbc");
      copyFileSync(dbcFixturePath, dbcPath);
      const info = await stat(dbcPath);
      assertTrue(info.size > 0, "Fixture DBC tem size 0");
      console.log(`    → Fixture DBC copiado: ${(info.size / 1024).toFixed(1)} KB`);
    } else {
      const arquivos = await listarArquivos("ST", "SC");
      assertGreater(arquivos.length, 0, "precisa de arquivo ST/SC para download");
      const arquivo = arquivos[0];
      console.log(`    → Baixando ${arquivo.nome} (${arquivo.competencia}) de ST/SC...`);
      dbcPath = await downloadArquivo("ST", arquivo.nome, tempDir);
      const info = await stat(dbcPath);
      assertTrue(info.size > 0, `Arquivo ${arquivo.nome} tem size 0`);
      console.log(`    → ${arquivo.nome} baixado: ${(info.size / 1024).toFixed(1)} KB`);
    }
  }, reporter);

  // ── Conversão DBC → CSV ───────────────────────────────────────────────────

  let csvPath: string | null = null;

  await run("FTP07", "converterDbcParaCsv: blast converte DBC para CSV", async () => {
    assertTrue(dbcPath !== null, "FTP06 deve ter baixado arquivo DBC antes");
    assertNotNull(dbcPath);
    csvPath = dbcPath.replace(/\.dbc$/i, ".csv");
    converterDbcParaCsv(dbcPath, csvPath);
    const info = await stat(csvPath);
    assertTrue(info.size > 0, "CSV gerado tem size 0");
    console.log(`    → CSV gerado: ${(info.size / 1024).toFixed(1)} KB`);
  }, reporter);

  // ── Ingestão no SQLite ────────────────────────────────────────────────────

  await run("FTP08", "ingerirCsv: insere registros de ST SC no banco", async () => {
    assertTrue(csvPath !== null, "FTP07 deve ter gerado CSV");
    assertNotNull(csvPath);
    const beforeCount = (db.prepare("SELECT COUNT(*) as n FROM estabelecimentos").get() as { n: number }).n;
    const rows = await ingerirCsv(db, csvPath, "ST", "202501");
    const afterCount = (db.prepare("SELECT COUNT(*) as n FROM estabelecimentos").get() as { n: number }).n;
    assertGreater(rows, 0, "deve ter ingerido ao menos 1 registro");
    assertTrue(afterCount >= beforeCount, "contagem total não deve diminuir");
    console.log(`    → Ingeridos: ${rows} registros`);
  }, reporter);

  await run("FTP09", "ingestão idempotente: re-ingerir mesmo CSV não duplica registros", async () => {
    assertTrue(csvPath !== null, "FTP07 deve ter gerado CSV");
    assertNotNull(csvPath);
    const before = (db.prepare("SELECT COUNT(*) as n FROM estabelecimentos").get() as { n: number }).n;
    await ingerirCsv(db, csvPath, "ST", "202501");
    const after = (db.prepare("SELECT COUNT(*) as n FROM estabelecimentos").get() as { n: number }).n;
    assertTrue(after === before, `Re-ingestão alterou contagem: ${before} → ${after}`);
  }, reporter);

  // Limpeza
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch { /* ok */ }

  if (blastDir) {
    try {
      rmSync(blastDir, { recursive: true, force: true });
    } catch { /* ok */ }
  }

  // Restaura env
  if (useMock) {
    delete process.env.MCPASSURE_FTP_MOCK;
    delete process.env.VETRUM_FTP_MOCK;
  }
}
