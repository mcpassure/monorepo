import type { Database } from "better-sqlite3";
import type {
  TussRecord,
  CoberturaRol,
  HierarquiaCbhpm,
  PaginatedResult,
  TerminologiaMeta,
  ResponseWithMeta,
  SearchParams,
  ListParams,
} from "./types.js";
import {
  findByCode,
  searchByText as searchByTextQuery,
  listByCategory,
} from "../db/queries.js";
import { buildTussMeta } from "../utils/meta.js";

export interface ITussSubRepository {
  getMeta(): TerminologiaMeta;
  findByCodigo(codigo: string): ResponseWithMeta<{
    record: TussRecord | null;
    coberturas: CoberturaRol[];
    hierarquia: HierarquiaCbhpm | null;
  }>;
  searchByText(params: SearchParams): ResponseWithMeta<PaginatedResult<TussRecord>>;
  listByCategoria(params: ListParams): ResponseWithMeta<PaginatedResult<TussRecord>>;
}

export class TussRepository implements ITussSubRepository {
  constructor(private db: Database) {}

  getMeta(): TerminologiaMeta {
    return buildTussMeta(this.db);
  }

  findByCodigo(codigo: string): ResponseWithMeta<{
    record: TussRecord | null;
    coberturas: CoberturaRol[];
    hierarquia: HierarquiaCbhpm | null;
  }> {
    const data = findByCode(this.db, codigo);
    return { data, _meta: buildTussMeta(this.db) };
  }

  searchByText(params: SearchParams): ResponseWithMeta<PaginatedResult<TussRecord>> {
    const data = searchByTextQuery(
      this.db,
      params.texto,
      params.tabelas,
      params.pagina,
      params.porPagina
    );
    return { data, _meta: buildTussMeta(this.db) };
  }

  listByCategoria(params: ListParams): ResponseWithMeta<PaginatedResult<TussRecord>> {
    const data = listByCategory(this.db, params.categoria, params.pagina, params.porPagina);
    return { data, _meta: buildTussMeta(this.db) };
  }
}
