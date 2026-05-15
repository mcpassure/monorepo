import type {
  Apresentacao,
  BulaLink,
  BularioSource,
  MedicamentoDetalhes,
  MedicamentoResumo,
  SearchByClasseTerapeuticaParams,
  SearchByNameParams,
  SearchByPrincipalAtivoParams,
  SearchByTarjaParams,
} from "../sources/types.js";
import { buildMeta } from "../utils/meta.js";

export type Meta = {
  data_da_base: string;
  fonte: string;
  defasagem_dias: number;
  modo: "cache_local" | "online";
  status?: "ok" | "stale";
};

export type ResponseWithMeta<T> = {
  data: T;
  _meta: Meta;
};

export class AllSourcesFailedError extends Error {
  readonly failures: Array<{ source: string; error: Error }>;

  constructor(failures: Array<{ source: string; error: Error }>) {
    const detail = failures.map((f) => `${f.source}: ${f.error.message}`).join("; ");
    super(`Todas as fontes falharam. ${detail}`);
    this.name = "AllSourcesFailedError";
    this.failures = failures;
  }
}

export interface IBularioRepository {
  searchByName(params: SearchByNameParams): Promise<ResponseWithMeta<MedicamentoResumo[]>>;
  searchByPrincipalAtivo(
    params: SearchByPrincipalAtivoParams
  ): Promise<ResponseWithMeta<MedicamentoResumo[]>>;
  searchByClasseTerapeutica(
    params: SearchByClasseTerapeuticaParams
  ): Promise<ResponseWithMeta<MedicamentoResumo[]>>;
  searchByTarja(params: SearchByTarjaParams): Promise<ResponseWithMeta<MedicamentoResumo[]>>;
  getDetalhes(numProcesso: string): Promise<ResponseWithMeta<MedicamentoDetalhes>>;
  getApresentacoes(numProcesso: string): Promise<ResponseWithMeta<Apresentacao[]>>;
  getBulaLink(idBulaProtegido: string): Promise<ResponseWithMeta<BulaLink>>;
}

/**
 * BularioRepository v2.0
 *
 * Accesses the ANVISA dataset directly via BularioDatasetSource (SQLite).
 * The old multi-source + cache pattern is replaced by a single SQLite source.
 * _meta.modo is always "cache_local" (data is pre-synced locally).
 */
export class BularioRepository implements IBularioRepository {
  private readonly dataBase: string;

  constructor(
    private readonly source: BularioSource,
    private readonly degradedThresholdDays = 7
  ) {
    // Use current date as data_da_base — will be replaced by dataset_meta in a future version
    this.dataBase = new Date().toISOString();
  }

  private buildResponse<T>(data: T): ResponseWithMeta<T> {
    return {
      data,
      _meta: buildMeta({
        dataBase: this.dataBase,
        fonte: this.source.name,
        modo: "cache_local",
        degradedThresholdDays: this.degradedThresholdDays,
      }),
    };
  }

  async searchByName(params: SearchByNameParams): Promise<ResponseWithMeta<MedicamentoResumo[]>> {
    const data = await this.source.searchByName(params);
    return this.buildResponse(data);
  }

  async searchByPrincipalAtivo(
    params: SearchByPrincipalAtivoParams
  ): Promise<ResponseWithMeta<MedicamentoResumo[]>> {
    const data = await this.source.searchByPrincipalAtivo(params);
    return this.buildResponse(data);
  }

  async searchByClasseTerapeutica(
    params: SearchByClasseTerapeuticaParams
  ): Promise<ResponseWithMeta<MedicamentoResumo[]>> {
    const data = await this.source.searchByClasseTerapeutica(params);
    return this.buildResponse(data);
  }

  async searchByTarja(params: SearchByTarjaParams): Promise<ResponseWithMeta<MedicamentoResumo[]>> {
    const data = await this.source.searchByTarja(params);
    return this.buildResponse(data);
  }

  async getDetalhes(numProcesso: string): Promise<ResponseWithMeta<MedicamentoDetalhes>> {
    const data = await this.source.getDetalhes(numProcesso);
    return this.buildResponse(data);
  }

  async getApresentacoes(numProcesso: string): Promise<ResponseWithMeta<Apresentacao[]>> {
    const data = await this.source.getApresentacoes(numProcesso);
    return this.buildResponse(data);
  }

  async getBulaLink(idBulaProtegido: string): Promise<ResponseWithMeta<BulaLink>> {
    const data = await this.source.getBulaLink(idBulaProtegido);
    return this.buildResponse(data);
  }
}
