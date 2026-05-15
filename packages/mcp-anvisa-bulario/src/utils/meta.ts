import type { Meta } from "../domain/repository.js";

export function buildMeta(params: {
  dataBase: string;
  fonte: string;
  modo: "cache_local" | "online";
  degradedThresholdDays?: number;
}): Meta {
  const threshold = params.degradedThresholdDays ?? 30;
  const parsed = Date.parse(params.dataBase);
  const defasagem_dias = Number.isNaN(parsed) ? 0 : Math.floor((Date.now() - parsed) / 86_400_000);
  return {
    data_da_base: params.dataBase,
    fonte: params.fonte,
    defasagem_dias,
    modo: params.modo,
    status: defasagem_dias > threshold ? "stale" : "ok",
  };
}
