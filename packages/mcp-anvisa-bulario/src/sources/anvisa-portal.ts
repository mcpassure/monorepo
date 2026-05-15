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
} from "./types.js";

// Stub — implementação prevista para v1.2 (fallback HTML scrape do Portal Bulário)
// https://consultas.anvisa.gov.br/#/bulario/
export class AnvisaPortalBularioSource implements BularioSource {
  readonly name = "anvisa_portal_bulario";

  searchByName(_params: SearchByNameParams): Promise<MedicamentoResumo[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaPortalBularioSource — previsto para v1.2")
    );
  }

  searchByPrincipalAtivo(_params: SearchByPrincipalAtivoParams): Promise<MedicamentoResumo[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaPortalBularioSource — previsto para v1.2")
    );
  }

  searchByClasseTerapeutica(
    _params: SearchByClasseTerapeuticaParams
  ): Promise<MedicamentoResumo[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaPortalBularioSource — previsto para v1.2")
    );
  }

  searchByTarja(_params: SearchByTarjaParams): Promise<MedicamentoResumo[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaPortalBularioSource — previsto para v1.2")
    );
  }

  getDetalhes(_numProcesso: string): Promise<MedicamentoDetalhes> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaPortalBularioSource — previsto para v1.2")
    );
  }

  getApresentacoes(_numProcesso: string): Promise<Apresentacao[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaPortalBularioSource — previsto para v1.2")
    );
  }

  getBulaLink(_idBulaProtegido: string): Promise<BulaLink> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaPortalBularioSource — previsto para v1.2")
    );
  }
}
