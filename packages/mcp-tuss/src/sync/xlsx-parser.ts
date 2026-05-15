import { inflateRawSync } from "node:zlib";
import type { TussRow } from "../domain/types.js";

function excelSerialToIso(serial: number): string {
  const ms = (serial - 25569) * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function isNumericStr(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s.trim());
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

type ParsedRow = Record<string, string>;

type ColumnMap = {
  codigo: string;
  termo: string;
  data_inicio: string | null;
  data_fim: string | null;
};

const DEFAULT_COLUMNS: ColumnMap = {
  codigo: "A",
  termo: "B",
  data_inicio: "C",
  data_fim: "E",
};

export function parseXlsxBuffer(buffer: Buffer): TussRow[] {
  const files = extractZipFiles(buffer, [
    "xl/sharedStrings.xml",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/sheet2.xml",
  ]);

  const workbookXml = files.get("xl/workbook.xml") ?? "";
  const relsXml = files.get("xl/_rels/workbook.xml.rels") ?? "";
  const ssXml = files.get("xl/sharedStrings.xml") ?? "";
  const sheetPath = findDataSheetPath(workbookXml, relsXml, files);
  const sheetXml = files.get(sheetPath);

  if (!sheetXml) {
    throw new Error(
      `Data sheet not found (tried: ${sheetPath}). Available: ${[...files.keys()].join(", ")}`
    );
  }

  const ss = parseSharedStrings(ssXml);
  return parseSheet(sheetXml, ss);
}

function findDataSheetPath(
  workbookXml: string,
  relsXml: string,
  files: Map<string, string>
): string {
  const sheetMatches = [
    ...workbookXml.matchAll(/<sheet\b[^>]+name="([^"]*)"[^>]+r:id="([^"]+)"/g),
    ...workbookXml.matchAll(/<sheet\b[^>]+r:id="([^"]+)"[^>]+name="([^"]*)"/g),
  ];

  for (const m of sheetMatches) {
    const [, nameOrId, idOrName] = m;
    const name = nameOrId.includes("Tab") ? nameOrId : idOrName;
    const rId = nameOrId.includes("Tab") ? idOrName : nameOrId;

    if (name?.toUpperCase().includes("CAPA")) continue;

    const relMatch = new RegExp(`Id="${rId}"[^>]+Target="([^"]+)"`).exec(relsXml);
    if (relMatch) {
      const target = relMatch[1];
      const path = target.startsWith("worksheets/") ? `xl/${target}` : target;
      if (files.has(path)) return path;
    }
  }

  return files.has("xl/worksheets/sheet2.xml")
    ? "xl/worksheets/sheet2.xml"
    : "xl/worksheets/sheet1.xml";
}

function parseSharedStrings(xml: string): string[] {
  const results: string[] = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let text = "";
    for (const t of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) {
      text += t[1];
    }
    results.push(unescapeXml(text));
  }
  return results;
}

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#xA;/g, "\n")
    .replace(/&#10;/g, "\n");
}

function readRowCells(rowXml: string, ss: string[]): ParsedRow {
  const cells: ParsedRow = {};
  for (const cellMatch of rowXml.matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
    const col = cellMatch[1];
    const attrs = cellMatch[2];
    const content = cellMatch[3];
    const vMatch = content.match(/<v>([\s\S]*?)<\/v>/);
    if (!vMatch) continue;
    const raw = vMatch[1].trim();
    cells[col] = attrs.includes('t="s"') ? (ss[Number.parseInt(raw, 10)] ?? "") : raw;
  }
  return cells;
}

/**
 * Procura a linha de header REAL na planilha.
 *
 * Critério: linha cujo conteúdo da coluna A é um nome de header conhecido
 * ("Código do Termo", "Código TUSS", "Código", etc — normalizado).
 *
 * Sai diferente entre tabelas:
 *  - TUSS 22: row 8 (FilterDatabase aponta certo)
 *  - TUSS 20: row > 8 (row 8 tem o título "Tabela 20...")
 *  - TUSS 18: row < 8 (row 8 já é dado)
 *
 * Procura até maxRows linhas. Retorna null se não achar.
 */
function findHeaderRow(
  sheetXml: string,
  ss: string[],
  maxRows = 30
): { row: number; cells: ParsedRow } | null {
  for (let i = 1; i <= maxRows; i++) {
    const regex = new RegExp(`<row r="${i}"[^>]*>([\\s\\S]*?)<\\/row>`);
    const match = sheetXml.match(regex);
    if (!match) continue;

    const cells = readRowCells(match[1], ss);
    const a = cells.A?.trim();
    if (!a) continue;

    // Pula linhas de título isoladas (uma célula só) ou linhas de dados (código numérico).
    if (Object.keys(cells).length < 3) continue;
    if (isNumericStr(a)) continue;

    const n = normalize(a);
    // Header válido: célula A começa com "codigo" ou variação
    if (n.startsWith("codigo") || n === "cod" || n === "cod." || n.startsWith("cod ")) {
      return { row: i, cells };
    }
  }
  return null;
}

/**
 * Detecta o mapeamento de colunas a partir do conteúdo da row de header.
 *
 * Estratégia em duas passadas:
 *   1. Identifica "codigo" (header contém "codigo" / "cod")
 *   2. Identifica datas (header contém "inicio"/"fim" + "vigencia"/"vig")
 *   3. Identifica "termo" com prioridade:
 *        a) header == "termo"
 *        b) header contém "principio ativo"
 *        c) header contém "descricao detalhada"
 *        d) header contém "descricao" / "medicamento"
 *   4. Se nenhum termo for achado, mantém coluna B (default)
 */
function detectColumns(headerCells: ParsedRow): ColumnMap {
  const result: ColumnMap = {
    codigo: DEFAULT_COLUMNS.codigo,
    termo: DEFAULT_COLUMNS.termo,
    data_inicio: null,
    data_fim: null,
  };

  // Passada 1: codigo e datas (categorias mutuamente exclusivas)
  for (const [col, value] of Object.entries(headerCells)) {
    if (!value) continue;
    const n = normalize(value);

    if (n.startsWith("codigo") || n === "cod") {
      result.codigo = col;
    } else if (
      (n.includes("inicio") || n.startsWith("ini")) &&
      (n.includes("vigencia") || n.includes("vig"))
    ) {
      result.data_inicio = col;
    } else if (
      (n.includes("fim") || n.includes("termino")) &&
      (n.includes("vigencia") || n.includes("vig"))
    ) {
      result.data_fim = col;
    }
  }

  // Passada 2: termo, com prioridade
  const termoPriorities: Array<(n: string) => boolean> = [
    (n) => n === "termo",
    (n) => n === "principio ativo" || n.startsWith("principio ativo "),
    (n) => n === "descricao detalhada" || n.startsWith("descricao detalhada"),
    (n) => n.startsWith("descricao") || n.includes("medicamento"),
  ];

  for (const matcher of termoPriorities) {
    let found: string | null = null;
    for (const [col, value] of Object.entries(headerCells)) {
      if (!value) continue;
      // Pula colunas que já são codigo/datas
      if (col === result.codigo || col === result.data_inicio || col === result.data_fim) continue;
      if (matcher(normalize(value))) {
        found = col;
        break;
      }
    }
    if (found) {
      result.termo = found;
      break;
    }
  }

  // Fallback final pros campos de data
  if (result.data_inicio === null) result.data_inicio = DEFAULT_COLUMNS.data_inicio;
  if (result.data_fim === null) result.data_fim = DEFAULT_COLUMNS.data_fim;

  return result;
}

function parseSheet(sheetXml: string, ss: string[]): TussRow[] {
  const rows: TussRow[] = [];

  let headerRow = 0;
  let columns: ColumnMap = DEFAULT_COLUMNS;

  const found = findHeaderRow(sheetXml, ss);
  if (found) {
    headerRow = found.row;
    process.stderr.write(
      `[xlsx-parser] Header row ${found.row} células: ${JSON.stringify(found.cells)}\n`
    );
    columns = detectColumns(found.cells);
    process.stderr.write(`[xlsx-parser] Mapeamento detectado: ${JSON.stringify(columns)}\n`);
  } else {
    // Fallback legacy: usa FilterDatabase ou row 8
    const filterMatch = sheetXml.match(/FilterDatabase[^$]*\$A\$(\d+):/);
    headerRow = filterMatch ? Number.parseInt(filterMatch[1], 10) : 8;
    process.stderr.write(
      `[xlsx-parser] Header não detectado — fallback pra row ${headerRow} + colunas default ${JSON.stringify(columns)}\n`
    );
  }

  for (const rowMatch of sheetXml.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = Number.parseInt(rowMatch[1], 10);
    if (rowNum <= headerRow) continue;

    const cells = readRowCells(rowMatch[2], ss);

    const codigo = cells[columns.codigo]?.trim();
    const termo = cells[columns.termo]?.trim();
    if (!codigo || !termo || !/^\d+$/.test(codigo)) continue;

    const rawInicio = columns.data_inicio ? (cells[columns.data_inicio]?.trim() ?? null) : null;
    const rawFim = columns.data_fim ? (cells[columns.data_fim]?.trim() ?? null) : null;

    const data_inicio =
      rawInicio !== null && rawInicio !== "" && isNumericStr(rawInicio)
        ? excelSerialToIso(Number(rawInicio))
        : (rawInicio ?? null);
    const data_fim =
      rawFim !== null && rawFim !== "" && isNumericStr(rawFim)
        ? excelSerialToIso(Number(rawFim))
        : (rawFim ?? null);

    rows.push({
      codigo,
      termo,
      data_inicio,
      data_fim,
      extra_json: JSON.stringify(cells),
    });
  }

  return deduplicateByCode(rows);
}

/**
 * Deduplica rows pelo código, mantendo a versão mais vigente.
 *
 * Critério de "mais vigente" (em ordem):
 *   1. data_fim IS NULL  (sem fim de vigência conhecido)
 *   2. data_fim no futuro (vigente até alguma data à frente)
 *   3. data_inicio mais recente (tiebreaker)
 *
 * Resolve o problema da XLSX da ANS listar múltiplas versões históricas
 * do mesmo código. Antes do dedup, o ON CONFLICT DO UPDATE no upsert pegava
 * a última row listada, que em geral é a versão mais antiga.
 */
function deduplicateByCode(rows: TussRow[]): TussRow[] {
  const today = new Date().toISOString().slice(0, 10);

  const score = (row: TussRow): number => {
    if (row.data_fim === null) return 3;
    if (row.data_fim >= today) return 2;
    return 1;
  };

  const byCode = new Map<string, TussRow>();
  for (const row of rows) {
    const existing = byCode.get(row.codigo);
    if (!existing) {
      byCode.set(row.codigo, row);
      continue;
    }

    const sNew = score(row);
    const sOld = score(existing);
    if (sNew > sOld) {
      byCode.set(row.codigo, row);
      continue;
    }
    if (sNew < sOld) continue;

    // Empate em score: usa data_inicio mais recente
    if ((row.data_inicio ?? "") > (existing.data_inicio ?? "")) {
      byCode.set(row.codigo, row);
    }
  }

  return Array.from(byCode.values());
}

function extractZipFiles(buffer: Buffer, targets: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const targetSet = new Set(targets);

  // Find End of Central Directory
  const EOCD_SIG = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("XLSX ZIP: EOCD not found");

  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  const numEntries = buffer.readUInt16LE(eocdOffset + 10);

  const CD_SIG = 0x02014b50;
  let pos = cdOffset;

  for (let i = 0; i < numEntries; i++) {
    if (buffer.readUInt32LE(pos) !== CD_SIG) break;

    const compMethod = buffer.readUInt16LE(pos + 10);
    const compSize = buffer.readUInt32LE(pos + 20);
    const uncompSize = buffer.readUInt32LE(pos + 24);
    const fnLen = buffer.readUInt16LE(pos + 28);
    const extraLen = buffer.readUInt16LE(pos + 30);
    const commentLen = buffer.readUInt16LE(pos + 32);
    const localOffset = buffer.readUInt32LE(pos + 42);
    const fn = buffer.subarray(pos + 46, pos + 46 + fnLen).toString("utf-8");

    pos += 46 + fnLen + extraLen + commentLen;

    if (!targetSet.has(fn)) continue;

    // Read local file header to get actual data offset
    const LFH_SIG = 0x04034b50;
    if (buffer.readUInt32LE(localOffset) !== LFH_SIG) continue;
    const lfhFnLen = buffer.readUInt16LE(localOffset + 26);
    const lfhExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lfhFnLen + lfhExtraLen;

    let fileData: Buffer;
    if (compMethod === 0) {
      fileData = buffer.subarray(dataStart, dataStart + uncompSize);
    } else if (compMethod === 8) {
      fileData = inflateRawSync(buffer.subarray(dataStart, dataStart + compSize));
    } else {
      continue;
    }

    result.set(fn, fileData.toString("utf-8"));
  }

  return result;
}
