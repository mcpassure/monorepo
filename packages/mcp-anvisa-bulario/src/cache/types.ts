export interface CacheStore {
  get<T>(key: string): { value: T; data_da_base: string } | null;
  set<T>(key: string, value: T, ttlSeconds: number, data_da_base?: string): void;
  invalidate(key: string): void;
  close(): void;
}

export const DEFAULT_TTLS = {
  searchResults: 3_600,
  medicamentoDetalhes: 86_400,
  categorias: 604_800,
  bulaLink: 86_400,
} as const;

export type TtlConfig = typeof DEFAULT_TTLS;
