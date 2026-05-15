import ExcelJS from "exceljs";
import type { CorrelacaoRow, TussRow } from "../types.js";

function cellStr(cell: ExcelJS.Cell): string | null {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "S" : "N";
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "object" && "text" in v) return String((v as { text: unknown }).text).trim() || null;
  return String(v).trim() || null;
}

function toFlag(v: string | null): boolean {
  if (!v) return false;
  const s = v.trim();
  return s.length > 0 && s !== "---";
}

export async function parseCorrelacaoTussRol(
  buffer: Buffer
): Promise<CorrelacaoRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Planilha de correlação TUSS-ROL não encontrada no arquivo.");

  const rows: CorrelacaoRow[] = [];
  let dataStartRow = 9;

  // Detectar linha de cabeçalho (procurar "Código" nas primeiras 10 linhas)
  for (let r = 1; r <= 10; r++) {
    const cell = sheet.getRow(r).getCell(1);
    const val = cellStr(cell);
    if (val && val.toLowerCase().includes("código")) {
      dataStartRow = r + 1;
      break;
    }
  }

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < dataStartRow) return;

    const codigo = cellStr(row.getCell(1));
    if (!codigo || !/^\d{8}$/.test(codigo)) return;

    const descricao_tuss = cellStr(row.getCell(2)) ?? "";
    const correlacao = cellStr(row.getCell(3)) ?? "NÃO";
    const procedimento_rol = cellStr(row.getCell(4));
    const rn_origem = cellStr(row.getCell(5));
    const vigencia = cellStr(row.getCell(6));
    const od = toFlag(cellStr(row.getCell(7)));
    const amb = toFlag(cellStr(row.getCell(8)));
    const hco = toFlag(cellStr(row.getCell(9)));
    const hso = toFlag(cellStr(row.getCell(10)));
    const pac = toFlag(cellStr(row.getCell(11)));
    const tem_dut = toFlag(cellStr(row.getCell(12)));
    const subgrupo = cellStr(row.getCell(13));
    const grupo = cellStr(row.getCell(14));
    const capitulo = cellStr(row.getCell(15));

    rows.push({
      codigo,
      descricao_tuss,
      correlacao: correlacao.toUpperCase().includes("SIM") ? "SIM" : "NÃO",
      procedimento_rol,
      rn_origem,
      vigencia,
      od,
      amb,
      hco,
      hso,
      pac,
      tem_dut,
      subgrupo,
      grupo,
      capitulo,
    });
  });

  return rows;
}

export async function parseTabelaTuss(
  buffer: Buffer,
  _tabela: "18" | "19" | "20" | "22"
): Promise<TussRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Planilha TUSS não encontrada no arquivo.");

  // Detectar índices de colunas de código e descrição no cabeçalho
  let codigoCol = 1;
  let descricaoCol = 2;
  let dataStartRow = 2;

  for (let r = 1; r <= 5; r++) {
    const row = sheet.getRow(r);
    let foundCodigo = false;
    let foundDesc = false;
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const v = (cellStr(cell) ?? "").toLowerCase();
      if (v.includes("código") || v === "cd" || v === "code") {
        codigoCol = colNum;
        foundCodigo = true;
      }
      if (v.includes("descrição") || v.includes("descricao") || v.includes("terminologia")) {
        descricaoCol = colNum;
        foundDesc = true;
      }
    });
    if (foundCodigo || foundDesc) {
      dataStartRow = r + 1;
      break;
    }
  }

  const rows: TussRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < dataStartRow) return;
    const codigo = cellStr(row.getCell(codigoCol));
    const descricao = cellStr(row.getCell(descricaoCol));
    if (!codigo || !/^\d{8}$/.test(codigo)) return;
    if (!descricao) return;
    rows.push({ codigo, descricao });
  });

  return rows;
}
