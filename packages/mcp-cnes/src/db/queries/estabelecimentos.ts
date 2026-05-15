import type Database from "better-sqlite3";
import type { EstabelecimentoOutput } from "../../tools/schemas.js";
import { CODIGO_PARA_DESCRICAO, tipoParaCodigos } from "../tipos_unidade.js";

type EstabelecimentoRow = {
  co_cnes: string;
  no_fantasia: string | null;
  no_razao_social: string | null;
  nu_cnpj: string | null;
  tp_unidade: string | null;
  co_natureza_jur: string | null;
  no_municipio: string | null;
  sg_uf: string | null;
  co_municipio: string | null;
  no_logradouro: string | null;
  nu_latitude: number | null;
  nu_longitude: number | null;
  nu_telefone: string | null;
  vinculo_sus: number | null;
  tp_gestao: string | null;
  competencia: string | null;
};

function rowToOutput(row: EstabelecimentoRow): EstabelecimentoOutput {
  return {
    codigoCnes: row.co_cnes,
    nomeFantasia: row.no_fantasia ?? "",
    razaoSocial: row.no_razao_social ?? "",
    cnpj: row.nu_cnpj,
    tipo: row.tp_unidade ? (CODIGO_PARA_DESCRICAO[row.tp_unidade] ?? row.tp_unidade) : "",
    naturezaJuridica: row.co_natureza_jur ?? "",
    municipio: row.no_municipio ?? "",
    uf: row.sg_uf ?? "",
    codigoIbge: row.co_municipio ?? "",
    endereco: row.no_logradouro ?? "",
    latitude: row.nu_latitude,
    longitude: row.nu_longitude,
    telefone: row.nu_telefone,
    vinculoSus: row.vinculo_sus === 1,
    gestao: row.tp_gestao ?? "",
    competencia: row.competencia ?? "",
    source: "local",
  };
}

export function porCodigo(db: Database.Database, codigoCnes: string): EstabelecimentoOutput | null {
  const row = db.prepare("SELECT * FROM estabelecimentos WHERE co_cnes = ?").get(codigoCnes) as
    | EstabelecimentoRow
    | undefined;
  return row ? rowToOutput(row) : null;
}

export function porNome(
  db: Database.Database,
  nome: string,
  uf?: string,
  limit = 10
): EstabelecimentoOutput[] {
  const term = `%${nome}%`;
  let rows: EstabelecimentoRow[];
  if (uf) {
    rows = db
      .prepare(
        "SELECT * FROM estabelecimentos WHERE (no_fantasia LIKE ? OR no_razao_social LIKE ?) AND sg_uf = ? LIMIT ?"
      )
      .all(term, term, uf.toUpperCase(), limit) as EstabelecimentoRow[];
  } else {
    rows = db
      .prepare(
        "SELECT * FROM estabelecimentos WHERE no_fantasia LIKE ? OR no_razao_social LIKE ? LIMIT ?"
      )
      .all(term, term, limit) as EstabelecimentoRow[];
  }
  return rows.map(rowToOutput);
}

export function porMunicipio(
  db: Database.Database,
  codigoIbge: string,
  tipo?: string,
  limit = 20
): EstabelecimentoOutput[] {
  const ibge6 = codigoIbge.length === 7 ? codigoIbge.slice(0, 6) : codigoIbge;
  let rows: EstabelecimentoRow[];
  if (tipo) {
    const codigos = tipoParaCodigos(tipo);
    if (codigos.length === 0) {
      rows = db
        .prepare("SELECT * FROM estabelecimentos WHERE co_municipio = ? LIMIT ?")
        .all(ibge6, limit) as EstabelecimentoRow[];
    } else {
      const placeholders = codigos.map(() => "?").join(",");
      rows = db
        .prepare(
          `SELECT * FROM estabelecimentos WHERE co_municipio = ? AND tp_unidade IN (${placeholders}) LIMIT ?`
        )
        .all(ibge6, ...codigos, limit) as EstabelecimentoRow[];
    }
  } else {
    rows = db
      .prepare("SELECT * FROM estabelecimentos WHERE co_municipio = ? LIMIT ?")
      .all(ibge6, limit) as EstabelecimentoRow[];
  }
  return rows.map(rowToOutput);
}

export function porTipo(
  db: Database.Database,
  tipo: string,
  uf?: string,
  codigoIbge?: string,
  limit = 20
): EstabelecimentoOutput[] {
  const codigos = tipoParaCodigos(tipo);
  if (codigos.length === 0) return [];

  const placeholders = codigos.map(() => "?").join(",");
  const conditions: string[] = [`tp_unidade IN (${placeholders})`];
  const params: (string | number)[] = [...codigos];

  if (uf) {
    conditions.push("sg_uf = ?");
    params.push(uf.toUpperCase());
  }
  if (codigoIbge) {
    const ibge6 = codigoIbge.length === 7 ? codigoIbge.slice(0, 6) : codigoIbge;
    conditions.push("co_municipio = ?");
    params.push(ibge6);
  }
  params.push(limit);

  const sql = `SELECT * FROM estabelecimentos WHERE ${conditions.join(" AND ")} LIMIT ?`;
  const rows = db.prepare(sql).all(...params) as EstabelecimentoRow[];
  return rows.map(rowToOutput);
}
