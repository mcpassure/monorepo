export type Meta = {
  data_da_base: string;
  competencia: string;
  fonte: string;
  defasagem_dias: number;
  modo: "cache_local" | "cache_vazio";
  status?: "ok" | "stale" | "empty";
};

export type ResponseWithMeta<T> = {
  data: T;
  _meta: Meta;
};

export type TussCode = {
  codigo: string;
  termo: string;
  data_inicio: string | null;
  data_fim: string | null;
  tabela: "22";
};

export type TussMedicamento = {
  codigo: string;
  termo: string;
  data_inicio: string | null;
  data_fim: string | null;
  tabela: "20";
};

export type TussDiaria = {
  codigo: string;
  termo: string;
  data_inicio: string | null;
  data_fim: string | null;
  tabela: "18";
};

export type TussRow = {
  codigo: string;
  termo: string;
  data_inicio: string | null;
  data_fim: string | null;
  extra_json: string;
};

export type SyncLogRow = {
  tabela: string;
  versao: string;
  rows_upserted: number;
  status: "ok" | "error";
  error_msg: string | null;
  synced_at: string;
};
