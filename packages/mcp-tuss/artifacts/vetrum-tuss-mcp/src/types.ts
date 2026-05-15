export type TabelaId = "18" | "19" | "20" | "22";
export type Segmento = "OD" | "AMB" | "HCO" | "HSO" | "PAC";
export type Categoria =
  | "procedimentos"
  | "materiais"
  | "medicamentos"
  | "opme"
  | "taxas"
  | "diarias";

export interface TussRecord {
  codigo: string;
  descricao: string;
  tabela_origem: TabelaId;
  tipo?: string;
  ativo: boolean;
}

export interface CoberturaRol {
  segmento: Segmento;
  coberto: boolean;
  rn_origem: string | null;
  vigencia: string | null;
  tem_dut: boolean;
  procedimento_rol: string | null;
}

export interface HierarquiaCbhpm {
  subgrupo: string | null;
  grupo: string | null;
  capitulo: string | null;
}

export interface SyncMetadata {
  tuss_22_versao: string | null;
  tuss_19_versao: string | null;
  tuss_20_versao: string | null;
  tuss_18_versao: string | null;
  rol_rn: string | null;
  sincronizado_em: string | null;
  cbhpm_edicao: typeof import("./constants.js").CBHPM_EDICAO;
}

export interface SyncStatus {
  tabela: string;
  versao: string | null;
  data_sincronizacao: string | null;
  rn_referencia: string | null;
  url_fonte: string | null;
}

export interface CorrelacaoRow {
  codigo: string;
  descricao_tuss: string;
  correlacao: string;
  procedimento_rol: string | null;
  rn_origem: string | null;
  vigencia: string | null;
  od: boolean;
  amb: boolean;
  hco: boolean;
  hso: boolean;
  pac: boolean;
  tem_dut: boolean;
  subgrupo: string | null;
  grupo: string | null;
  capitulo: string | null;
}

export interface TussRow {
  codigo: string;
  descricao: string;
  tipo?: string;
}

export interface PaginatedResult<T> {
  total: number;
  pagina: number;
  por_pagina: number;
  resultados: T[];
}
