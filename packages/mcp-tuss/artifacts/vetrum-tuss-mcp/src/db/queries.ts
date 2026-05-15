import type { Database } from "better-sqlite3";
import type {
  TussRecord,
  CoberturaRol,
  HierarquiaCbhpm,
  SyncMetadata,
  SyncStatus,
  Segmento,
  Categoria,
  PaginatedResult,
} from "../types.js";
import { CBHPM_EDICAO } from "../constants.js";

interface RawTuss {
  codigo: string;
  descricao: string;
  ativo: number;
  tipo?: string;
}

interface RawRol {
  id: number;
  codigo_tuss: string;
  procedimento_rol: string | null;
  correlacao: string | null;
  rn_origem: string | null;
  vigencia: string | null;
  od: number | null;
  amb: number | null;
  hco: number | null;
  hso: number | null;
  pac: number | null;
  tem_dut: number | null;
}

interface RawHierarquia {
  codigo_tuss: string;
  subgrupo: string | null;
  grupo: string | null;
  capitulo: string | null;
}

interface RawSync {
  tabela: string;
  versao: string | null;
  data_sincronizacao: string | null;
  rn_referencia: string | null;
  url_fonte: string | null;
}

function toBool(v: number | null): boolean {
  return v === 1;
}

function mapRolRow(row: RawRol, segmento: Segmento): CoberturaRol {
  const segMap: Record<Segmento, number | null> = {
    OD: row.od,
    AMB: row.amb,
    HCO: row.hco,
    HSO: row.hso,
    PAC: row.pac,
  };
  return {
    segmento,
    coberto: toBool(segMap[segmento]),
    rn_origem: row.rn_origem,
    vigencia: row.vigencia,
    tem_dut: toBool(row.tem_dut),
    procedimento_rol: row.procedimento_rol,
  };
}

function allSegmentos(row: RawRol): CoberturaRol[] {
  const segs: Segmento[] = ["OD", "AMB", "HCO", "HSO", "PAC"];
  return segs.map((s) => mapRolRow(row, s));
}

export function getSyncMetadata(db: Database): SyncMetadata {
  const rows = db
    .prepare("SELECT * FROM sincronizacao_versoes")
    .all() as RawSync[];
  const find = (t: string) => rows.find((r) => r.tabela === t);
  return {
    tuss_22_versao: find("tuss_22")?.versao ?? null,
    tuss_19_versao: find("tuss_19")?.versao ?? null,
    tuss_20_versao: find("tuss_20")?.versao ?? null,
    tuss_18_versao: find("tuss_18")?.versao ?? null,
    rol_rn: find("rol_correlacao")?.rn_referencia ?? null,
    sincronizado_em: find("tuss_22")?.data_sincronizacao ?? null,
    cbhpm_edicao: CBHPM_EDICAO,
  };
}

export function findByCode(
  db: Database,
  codigo: string
): {
  record: TussRecord | null;
  coberturas: CoberturaRol[];
  hierarquia: HierarquiaCbhpm | null;
} {
  const tables: Array<{ table: string; tabela_origem: "18" | "19" | "20" | "22" }> = [
    { table: "tuss_procedimentos", tabela_origem: "22" },
    { table: "tuss_materiais", tabela_origem: "19" },
    { table: "tuss_medicamentos", tabela_origem: "20" },
    { table: "tuss_taxas_diarias", tabela_origem: "18" },
  ];

  let record: TussRecord | null = null;
  for (const { table, tabela_origem } of tables) {
    const row = db
      .prepare(`SELECT * FROM ${table} WHERE codigo = ?`)
      .get(codigo) as RawTuss | undefined;
    if (row) {
      record = {
        codigo: row.codigo,
        descricao: row.descricao,
        tabela_origem,
        tipo: row.tipo,
        ativo: toBool(row.ativo),
      };
      break;
    }
  }

  const rolRows = db
    .prepare("SELECT * FROM rol_cobertura WHERE codigo_tuss = ?")
    .all(codigo) as RawRol[];

  const coberturas: CoberturaRol[] = rolRows.flatMap((r) => allSegmentos(r));

  const hierRaw = db
    .prepare("SELECT * FROM cbhpm_hierarquia WHERE codigo_tuss = ?")
    .get(codigo) as RawHierarquia | undefined;
  const hierarquia: HierarquiaCbhpm | null = hierRaw
    ? {
        subgrupo: hierRaw.subgrupo,
        grupo: hierRaw.grupo,
        capitulo: hierRaw.capitulo,
      }
    : null;

  return { record, coberturas, hierarquia };
}

export function searchByText(
  db: Database,
  texto: string,
  tabelas: Array<"18" | "19" | "20" | "22">,
  pagina: number,
  porPagina: number
): PaginatedResult<TussRecord> {
  const tableMap: Record<string, { fts: string; base: string; origem: "18" | "19" | "20" | "22" }> = {
    "22": { fts: "tuss_procedimentos_fts", base: "tuss_procedimentos", origem: "22" },
    "19": { fts: "tuss_materiais_fts", base: "tuss_materiais", origem: "19" },
    "20": { fts: "tuss_medicamentos_fts", base: "tuss_medicamentos", origem: "20" },
    "18": { fts: "tuss_taxas_diarias_fts", base: "tuss_taxas_diarias", origem: "18" },
  };

  const termo = `${texto.replace(/[*"]/g, "")}*`;
  const resultados: TussRecord[] = [];
  let total = 0;
  const offset = (pagina - 1) * porPagina;

  for (const t of tabelas) {
    const { fts, base, origem } = tableMap[t];
    const countRow = db
      .prepare(`SELECT count(*) AS cnt FROM ${fts} WHERE ${fts} MATCH ?`)
      .get(termo) as { cnt: number };
    total += countRow.cnt;

    if (resultados.length < porPagina) {
      const needed = porPagina - resultados.length;
      const rows = db
        .prepare(
          `SELECT b.codigo, b.descricao, b.ativo, b.tipo
           FROM ${fts} f
           JOIN ${base} b ON b.rowid = f.rowid
           WHERE f.${fts} MATCH ?
           ORDER BY rank
           LIMIT ? OFFSET ?`
        )
        .all(termo, needed, offset) as RawTuss[];
      for (const row of rows) {
        resultados.push({
          codigo: row.codigo,
          descricao: row.descricao,
          tabela_origem: origem,
          tipo: row.tipo,
          ativo: toBool(row.ativo),
        });
      }
    }
  }

  return { total, pagina, por_pagina: porPagina, resultados };
}

export function listByCategory(
  db: Database,
  categoria: Categoria,
  pagina: number,
  porPagina: number
): PaginatedResult<TussRecord> {
  const offset = (pagina - 1) * porPagina;

  type QueryConfig = {
    table: string;
    origem: "18" | "19" | "20" | "22";
    where?: string;
  };

  const config: Record<Categoria, QueryConfig> = {
    procedimentos: { table: "tuss_procedimentos", origem: "22" },
    materiais: { table: "tuss_materiais", origem: "19", where: "tipo = 'material'" },
    medicamentos: { table: "tuss_medicamentos", origem: "20" },
    opme: { table: "tuss_materiais", origem: "19", where: "tipo = 'opme'" },
    taxas: { table: "tuss_taxas_diarias", origem: "18", where: "tipo = 'taxa'" },
    diarias: { table: "tuss_taxas_diarias", origem: "18", where: "tipo = 'diaria'" },
  };

  const { table, origem, where } = config[categoria];
  const whereClause = where ? `WHERE ${where}` : "";

  const countRow = db
    .prepare(`SELECT count(*) AS cnt FROM ${table} ${whereClause}`)
    .get() as { cnt: number };
  const total = countRow.cnt;

  const rows = db
    .prepare(
      `SELECT codigo, descricao, ativo, tipo FROM ${table} ${whereClause} ORDER BY codigo LIMIT ? OFFSET ?`
    )
    .all(porPagina, offset) as RawTuss[];

  const resultados: TussRecord[] = rows.map((r) => ({
    codigo: r.codigo,
    descricao: r.descricao,
    tabela_origem: origem,
    tipo: r.tipo,
    ativo: toBool(r.ativo),
  }));

  return { total, pagina, por_pagina: porPagina, resultados };
}

export function getRolCoverage(
  db: Database,
  codigo: string,
  segmento?: Segmento
): { noRol: boolean; coberturas: CoberturaRol[]; descricaoTuss: string | null } {
  const rolRows = db
    .prepare("SELECT * FROM rol_cobertura WHERE codigo_tuss = ?")
    .all(codigo) as RawRol[];

  const noRol = rolRows.some((r) => r.correlacao?.toUpperCase() === "SIM");

  let coberturas: CoberturaRol[];
  if (segmento) {
    coberturas = rolRows.map((r) => mapRolRow(r, segmento));
  } else {
    coberturas = rolRows.flatMap((r) => allSegmentos(r));
  }

  const tussRow = db
    .prepare("SELECT descricao FROM tuss_procedimentos WHERE codigo = ?")
    .get(codigo) as { descricao: string } | undefined;

  return { noRol, coberturas, descricaoTuss: tussRow?.descricao ?? null };
}

export function getCbhpmHierarchy(
  db: Database,
  codigo: string
): { hierarquia: HierarquiaCbhpm | null; descricaoTuss: string | null } {
  const hierRaw = db
    .prepare("SELECT * FROM cbhpm_hierarquia WHERE codigo_tuss = ?")
    .get(codigo) as RawHierarquia | undefined;

  const tussRow = db
    .prepare("SELECT descricao FROM tuss_procedimentos WHERE codigo = ?")
    .get(codigo) as { descricao: string } | undefined;

  return {
    hierarquia: hierRaw
      ? { subgrupo: hierRaw.subgrupo, grupo: hierRaw.grupo, capitulo: hierRaw.capitulo }
      : null,
    descricaoTuss: tussRow?.descricao ?? null,
  };
}

export interface RolEntry {
  codigo_tuss: string;
  descricao_tuss: string | null;
  coberturas: CoberturaRol[];
  procedimento_rol: string | null;
}

export function listObrigatorio(
  db: Database,
  segmento: Segmento | undefined,
  comDut: boolean | undefined,
  pagina: number,
  porPagina: number
): PaginatedResult<RolEntry> {
  const offset = (pagina - 1) * porPagina;
  const conditions: string[] = ["correlacao = 'SIM'"];

  if (segmento) {
    const col = segmento.toLowerCase();
    conditions.push(`${col} = 1`);
  }
  if (comDut === true) {
    conditions.push("tem_dut = 1");
  } else if (comDut === false) {
    conditions.push("tem_dut = 0");
  }

  const where = conditions.join(" AND ");

  const countRow = db
    .prepare(`SELECT count(*) AS cnt FROM rol_cobertura WHERE ${where}`)
    .get() as { cnt: number };
  const total = countRow.cnt;

  const rows = db
    .prepare(
      `SELECT r.*, p.descricao AS desc_tuss
       FROM rol_cobertura r
       LEFT JOIN tuss_procedimentos p ON p.codigo = r.codigo_tuss
       WHERE ${where}
       ORDER BY r.codigo_tuss
       LIMIT ? OFFSET ?`
    )
    .all(porPagina, offset) as (RawRol & { desc_tuss: string | null })[];

  const resultados: RolEntry[] = rows.map((r) => ({
    codigo_tuss: r.codigo_tuss,
    descricao_tuss: r.desc_tuss,
    coberturas: allSegmentos(r),
    procedimento_rol: r.procedimento_rol,
  }));

  return { total, pagina, por_pagina: porPagina, resultados };
}

export function getSyncStatus(db: Database): SyncStatus[] {
  return db
    .prepare("SELECT * FROM sincronizacao_versoes ORDER BY tabela")
    .all() as SyncStatus[];
}

export function isBankEmpty(db: Database): boolean {
  const row = db
    .prepare("SELECT count(*) AS cnt FROM sincronizacao_versoes")
    .get() as { cnt: number };
  return row.cnt === 0;
}
