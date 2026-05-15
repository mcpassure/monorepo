import type { Database } from "better-sqlite3";
import type { TerminologiaMeta, ResponseWithMeta, CbhpmHierarquiaResult } from "./types.js";
import { getCbhpmHierarchy } from "../db/queries.js";
import { buildCbhpmMeta } from "../utils/meta.js";

export interface ICbhpmSubRepository {
  getMeta(): TerminologiaMeta;
  getHierarquia(codigo: string): ResponseWithMeta<CbhpmHierarquiaResult>;
}

export class CbhpmRepository implements ICbhpmSubRepository {
  constructor(private db: Database) {}

  getMeta(): TerminologiaMeta {
    return buildCbhpmMeta(this.db);
  }

  getHierarquia(codigo: string): ResponseWithMeta<CbhpmHierarquiaResult> {
    const data = getCbhpmHierarchy(this.db, codigo);
    return { data, _meta: buildCbhpmMeta(this.db) };
  }
}
