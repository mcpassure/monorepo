export type Tarja = "LIVRE" | "VERMELHA" | "PRETA";

export type SearchParams = {
  pagina?: number;
  count?: number;
};

export type SearchByNameParams = SearchParams & { nome: string };
export type SearchByPrincipalAtivoParams = SearchParams & { principioAtivo: string };
export type SearchByClasseTerapeuticaParams = SearchParams & { classeTerapeutica: string };
export type SearchByTarjaParams = SearchParams & { tarja: Tarja };

export type MedicamentoResumo = {
  numProcesso: string;
  nomeProduto: string;
  empresa: string;
  cnpj?: string;
  expediente?: string;
  idBulaPacienteProtegido?: string;
  idBulaProfissionalProtegido?: string;
  dataAtualizacao?: string;
};

export type MedicamentoDetalhes = MedicamentoResumo & {
  tarja?: Tarja;
  classesTerapeuticas?: string[];
  principioAtivo?: string;
  numeroRegistro?: string;
};

export type Apresentacao = {
  descricao: string;
};

export type BulaLink = {
  id: string;
  urlPdf?: string;
};

export interface BularioSource {
  readonly name: string;
  searchByName(params: SearchByNameParams): Promise<MedicamentoResumo[]>;
  searchByPrincipalAtivo(params: SearchByPrincipalAtivoParams): Promise<MedicamentoResumo[]>;
  searchByClasseTerapeutica(params: SearchByClasseTerapeuticaParams): Promise<MedicamentoResumo[]>;
  searchByTarja(params: SearchByTarjaParams): Promise<MedicamentoResumo[]>;
  getDetalhes(numProcesso: string): Promise<MedicamentoDetalhes>;
  getApresentacoes(numProcesso: string): Promise<Apresentacao[]>;
  getBulaLink(idBulaProtegido: string): Promise<BulaLink>;
  /**
   * Opcional — fontes que precisam liberar recursos (ex: Playwright browser)
   * podem implementar. Chamado no SIGINT/SIGTERM do processo.
   */
  close?(): Promise<void>;
}
