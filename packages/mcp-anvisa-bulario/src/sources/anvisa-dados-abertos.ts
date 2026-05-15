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

// Stub — implementação prevista para v1.1 (sync offline via CSV da ANVISA Dados Abertos)
// https://dados.gov.br/dados/conjuntos-dados/medicamentos-registrados-no-brasil
export class AnvisaDadosAbertosSource implements BularioSource {
  readonly name = "anvisa_dados_abertos";

  searchByName(_params: SearchByNameParams): Promise<MedicamentoResumo[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaDadosAbertosSource — previsto para v1.1")
    );
  }

  searchByPrincipalAtivo(_params: SearchByPrincipalAtivoParams): Promise<MedicamentoResumo[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaDadosAbertosSource — previsto para v1.1")
    );
  }

  searchByClasseTerapeutica(
    _params: SearchByClasseTerapeuticaParams
  ): Promise<MedicamentoResumo[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaDadosAbertosSource — previsto para v1.1")
    );
  }

  searchByTarja(_params: SearchByTarjaParams): Promise<MedicamentoResumo[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaDadosAbertosSource — previsto para v1.1")
    );
  }

  getDetalhes(_numProcesso: string): Promise<MedicamentoDetalhes> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaDadosAbertosSource — previsto para v1.1")
    );
  }

  getApresentacoes(_numProcesso: string): Promise<Apresentacao[]> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaDadosAbertosSource — previsto para v1.1")
    );
  }

  getBulaLink(_idBulaProtegido: string): Promise<BulaLink> {
    return Promise.reject(
      new Error("NotImplemented: AnvisaDadosAbertosSource — previsto para v1.1")
    );
  }
}
