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
