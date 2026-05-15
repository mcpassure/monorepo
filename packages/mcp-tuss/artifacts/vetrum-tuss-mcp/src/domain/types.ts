import type { TussRecord, CoberturaRol, HierarquiaCbhpm, PaginatedResult, Segmento, Categoria } from "../types.js";

export type { TussRecord, CoberturaRol, HierarquiaCbhpm, PaginatedResult, Segmento, Categoria };

export type TerminologiaMeta = {
  terminologia: "TUSS" | "Rol ANS" | "CBHPM";
  versao: string;
  data_da_base: string;
  fonte: string;
  defasagem_dias: number;
  modo: "cache_local" | "online";
  status?: "ok" | "stale";
};

export type ResponseWithMeta<T> = {
  data: T;
  _meta: TerminologiaMeta;
};

export type ResponseWithMultiMeta<T> = {
  data: T;
  _meta: TerminologiaMeta[];
};

export type TabelaId = "18" | "19" | "20" | "22";

export interface CombinedRecord {
  codigo: string;
  found: boolean;
  descricao_tuss: string | null;
  tabela_origem: TabelaId | null;
  tipo: string | null | undefined;
  ativo: boolean;
  sistema_fhir: string;
  coberturas: CoberturaRol[];
  hierarquia_cbhpm: HierarquiaCbhpm | null;
}

export interface SearchParams {
  texto: string;
  tabelas: Array<"18" | "19" | "20" | "22">;
  pagina: number;
  porPagina: number;
}

export interface ListParams {
  categoria: Categoria;
  pagina: number;
  porPagina: number;
}

export interface ListObrigatoriosParams {
  segmento?: Segmento;
  comDut?: boolean;
  pagina: number;
  porPagina: number;
}

export interface RolCoberturaResult {
  noRol: boolean;
  coberturas: CoberturaRol[];
  descricaoTuss: string | null;
}

export interface CbhpmHierarquiaResult {
  hierarquia: HierarquiaCbhpm | null;
  descricaoTuss: string | null;
}
