import type { Database } from "better-sqlite3";
import type {
  CoberturaRol,
  PaginatedResult,
  Segmento,
  TerminologiaMeta,
  ResponseWithMeta,
  ListObrigatoriosParams,
  RolCoberturaResult,
} from "./types.js";
import type { RolEntry } from "../db/queries.js";
import { getRolCoverage, listObrigatorio } from "../db/queries.js";
import { buildRolAnsMeta } from "../utils/meta.js";

export interface IRolAnsSubRepository {
  getMeta(): TerminologiaMeta;
  getCobertura(codigo: string, segmento?: Segmento): ResponseWithMeta<RolCoberturaResult>;
  listObrigatorios(params: ListObrigatoriosParams): ResponseWithMeta<PaginatedResult<RolEntry>>;
}

export class RolAnsRepository implements IRolAnsSubRepository {
  constructor(private db: Database) {}

  getMeta(): TerminologiaMeta {
    return buildRolAnsMeta(this.db);
  }

  getCobertura(codigo: string, segmento?: Segmento): ResponseWithMeta<RolCoberturaResult> {
    const data = getRolCoverage(this.db, codigo, segmento);
    return { data, _meta: buildRolAnsMeta(this.db) };
  }

  listObrigatorios(params: ListObrigatoriosParams): ResponseWithMeta<PaginatedResult<RolEntry>> {
    const data = listObrigatorio(
      this.db,
      params.segmento,
      params.comDut,
      params.pagina,
      params.porPagina
    );
    return { data, _meta: buildRolAnsMeta(this.db) };
  }
}
