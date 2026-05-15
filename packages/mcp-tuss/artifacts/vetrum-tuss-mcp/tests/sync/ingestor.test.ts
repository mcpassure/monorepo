import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { applySchema } from "../../src/db/schema.js";
import { ingestTabelaSimples } from "../../src/sync/ingestor.js";
import ExcelJS from "exceljs";

// Mock de downloads para não acessar rede durante os testes
vi.mock("../../src/sync/downloader.js", () => ({
  downloadFile: vi.fn(),
  findCorrelacaoUrl: vi.fn().mockResolvedValue(null),
}));

async function buildTabelaBuffer(
  rows: Array<{ codigo: string; descricao: string }>
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Tabela");
  ws.getRow(1).values = ["", "Código", "Descrição"];
  rows.forEach((r, i) => {
    ws.getRow(2 + i).values = ["", r.codigo, r.descricao];
  });
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function createEmptyDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  applySchema(db);
  return db;
}

describe("ingestTabelaSimples", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createEmptyDb();
  });

  it("ingere tabela 20 (medicamentos) corretamente", async () => {
    const buffer = await buildTabelaBuffer([
      { codigo: "12345678", descricao: "Dipirona sódica 500mg/mL" },
      { codigo: "12345679", descricao: "Amoxicilina 500mg cápsula" },
    ]);

    await ingestTabelaSimples(db, buffer, "20", "202505", "https://test.url/tab20.xlsx");

    const rows = db
      .prepare("SELECT * FROM tuss_medicamentos ORDER BY codigo")
      .all() as Array<{ codigo: string; descricao: string }>;
    expect(rows).toHaveLength(2);
    expect(rows[0].codigo).toBe("12345678");
    expect(rows[1].descricao).toBe("Amoxicilina 500mg cápsula");
  });

  it("registra versão em sincronizacao_versoes após ingesta", async () => {
    const buffer = await buildTabelaBuffer([
      { codigo: "12345678", descricao: "Dipirona" },
    ]);

    await ingestTabelaSimples(db, buffer, "20", "202505", "https://test.url/tab20.xlsx");

    const versao = db
      .prepare("SELECT versao FROM sincronizacao_versoes WHERE tabela = 'tuss_20'")
      .get() as { versao: string };
    expect(versao.versao).toBe("202505");
  });

  it("ingere tabela 18 (taxas/diárias)", async () => {
    const buffer = await buildTabelaBuffer([
      { codigo: "20202143", descricao: "Diária UTI adulto" },
    ]);

    await ingestTabelaSimples(db, buffer, "18", "202501", "https://test.url/tab18.xlsx");

    const rows = db
      .prepare("SELECT * FROM tuss_taxas_diarias")
      .all() as Array<{ codigo: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].codigo).toBe("20202143");
  });

  it("ingere tabela 19 (materiais/OPME) com tipo=material", async () => {
    const buffer = await buildTabelaBuffer([
      { codigo: "98765432", descricao: "Parafuso de titânio" },
    ]);

    await ingestTabelaSimples(db, buffer, "19", "202505", "https://test.url/tab19.xlsx");

    const row = db
      .prepare("SELECT tipo FROM tuss_materiais WHERE codigo = '98765432'")
      .get() as { tipo: string };
    expect(row.tipo).toBe("material");
  });

  it("substitui dados anteriores na ingesta (DELETE+INSERT)", async () => {
    const buffer1 = await buildTabelaBuffer([
      { codigo: "12345678", descricao: "Dipirona antiga" },
    ]);
    await ingestTabelaSimples(db, buffer1, "20", "202501", "https://test.url/v1.xlsx");

    const buffer2 = await buildTabelaBuffer([
      { codigo: "12345679", descricao: "Amoxicilina nova" },
    ]);
    await ingestTabelaSimples(db, buffer2, "20", "202505", "https://test.url/v2.xlsx");

    const rows = db.prepare("SELECT * FROM tuss_medicamentos").all();
    expect(rows).toHaveLength(1);
  });

  it("ignora linhas com código inválido durante a ingesta", async () => {
    const buffer = await buildTabelaBuffer([
      { codigo: "INVALIDO", descricao: "Linha inválida" },
      { codigo: "12345678", descricao: "Dipirona" },
    ]);

    await ingestTabelaSimples(db, buffer, "20", "202505", "https://test.url/tab20.xlsx");

    const rows = db.prepare("SELECT * FROM tuss_medicamentos").all();
    expect(rows).toHaveLength(1);
  });
});
