import { HttpClient, type HttpGet } from "../utils/http.js";
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
  Tarja,
} from "./types.js";

// ── Schema da LISTAGEM (endpoint /api/consulta/bulario) ────────────────────
// Mantém o schema legado: nomeProduto, razaoSocial, idBulaPacienteProtegido, etc.

type AnvisaListaItem = {
  numProcesso?: string;
  nomeProduto?: string;
  razaoSocial?: string;
  cnpj?: string;
  expediente?: string;
  idBulaPacienteProtegido?: string;
  idBulaProfissionalProtegido?: string;
  dataAtualizacao?: string;
};

type AnvisaListaResponse = {
  content?: AnvisaListaItem[];
  totalElements?: number;
  number?: number;
};

// ── Schema dos DETALHES (endpoint /api/consulta/medicamento/produtos/{id}) ─
// SCHEMA NOVO (atualizado em 2026): campos foram renomeados pela ANVISA.

type AnvisaDetalhesEmpresa = {
  razaoSocial?: string;
  cnpj?: string;
  nomeFantasia?: string;
};

type AnvisaDetalhesProcesso = {
  numero?: string;
  numProcesso?: string;
};

type AnvisaDetalhesApresentacao = {
  descricao?: string;
  embalagem?: string;
  nomeApresentacao?: string;
};

type AnvisaDetalhesResponse = {
  codigoProduto?: number;
  nomeComercial?: string;
  numeroRegistro?: string;
  principioAtivo?: string;
  classesTerapeuticas?: string[] | Array<{ descricao?: string }>;
  classeTerapeutica?: string | { descricao?: string };
  atcs?: string[] | Array<{ codigo?: string; descricao?: string }>;
  atc?: string | { codigo?: string; descricao?: string };
  codigoBulaPaciente?: string;
  codigoBulaProfissional?: string;
  empresa?: AnvisaDetalhesEmpresa | string;
  processo?: AnvisaDetalhesProcesso | string;
  apresentacoes?: AnvisaDetalhesApresentacao[];
  categoriaRegulatoria?: string | { descricao?: string };
  tipoProduto?: number;
  dataProduto?: string;
  dataVencimento?: string;
  // Campos legados (caso ainda apareçam em alguns endpoints):
  tarja?: string;
  nomeProduto?: string;
  numProcesso?: string;
  razaoSocial?: string;
  idBulaPacienteProtegido?: string;
  idBulaProfissionalProtegido?: string;
};

const TARJA_MAP: Record<string, Tarja> = {
  LIVRE: "LIVRE",
  "SEM TARJA": "LIVRE",
  "TARJA VERMELHA": "VERMELHA",
  VERMELHA: "VERMELHA",
  "TARJA PRETA": "PRETA",
  PRETA: "PRETA",
};

function normalizeTarja(raw?: string): Tarja | undefined {
  if (!raw) return undefined;
  return TARJA_MAP[raw.toUpperCase().trim()];
}

function mapListaItem(item: AnvisaListaItem): MedicamentoResumo {
  return {
    numProcesso: item.numProcesso ?? "",
    nomeProduto: item.nomeProduto ?? "",
    empresa: item.razaoSocial ?? "",
    cnpj: item.cnpj,
    expediente: item.expediente,
    idBulaPacienteProtegido: item.idBulaPacienteProtegido,
    idBulaProfissionalProtegido: item.idBulaProfissionalProtegido,
    dataAtualizacao: item.dataAtualizacao,
  };
}

/** Extrai razão social da empresa (string ou objeto). */
function extractRazaoSocial(empresa?: AnvisaDetalhesEmpresa | string): string {
  if (!empresa) return "";
  if (typeof empresa === "string") return empresa;
  return empresa.razaoSocial ?? empresa.nomeFantasia ?? "";
}

/** Extrai CNPJ da empresa (objeto). */
function extractCnpj(empresa?: AnvisaDetalhesEmpresa | string): string | undefined {
  if (!empresa || typeof empresa === "string") return undefined;
  return empresa.cnpj;
}

/** Extrai numProcesso (que pode vir como string em "processo" ou objeto {numero}). */
function extractNumProcesso(detalhes: AnvisaDetalhesResponse, fallback: string): string {
  if (detalhes.numProcesso) return detalhes.numProcesso;
  if (typeof detalhes.processo === "string") return detalhes.processo;
  if (detalhes.processo?.numProcesso) return detalhes.processo.numProcesso;
  if (detalhes.processo?.numero) return detalhes.processo.numero;
  return fallback;
}

/** Normaliza classesTerapeuticas — pode vir como array de strings ou objetos. */
function extractClassesTerapeuticas(raw: AnvisaDetalhesResponse["classesTerapeuticas"]): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((c) => (typeof c === "string" ? c : ((c as { descricao?: string }).descricao ?? "")))
    .filter((s): s is string => Boolean(s));
}

export class AnvisaApiSource implements BularioSource {
  readonly name = "anvisa_api";
  private readonly client: HttpGet;

  /**
   * @param baseUrl URL base da API ANVISA (ex: https://consultas.anvisa.gov.br)
   * @param maxRetries Tentativas de retry em falhas transitórias
   * @param baseDelayMs Delay base do backoff exponencial
   * @param timeoutMs Timeout por request em ms
   * @param client Opcional — HttpClient pré-construído. Útil pra testes (mock)
   *               e pra compartilhar browser entre múltiplos sources.
   */
  constructor(
    baseUrl: string,
    maxRetries: number,
    baseDelayMs: number,
    timeoutMs: number,
    client?: HttpGet
  ) {
    this.client = client ?? new HttpClient(baseUrl, maxRetries, baseDelayMs, timeoutMs);
  }

  async close(): Promise<void> {
    if (this.client.close) {
      await this.client.close();
    }
  }

  async searchByName(params: SearchByNameParams): Promise<MedicamentoResumo[]> {
    return this._search({ "filter[nomeProduto]": params.nome }, params);
  }

  async searchByPrincipalAtivo(params: SearchByPrincipalAtivoParams): Promise<MedicamentoResumo[]> {
    return this._search({ "filter[nomeProduto]": params.principioAtivo }, params);
  }

  async searchByClasseTerapeutica(
    params: SearchByClasseTerapeuticaParams
  ): Promise<MedicamentoResumo[]> {
    return this._search({ "filter[nomeProduto]": params.classeTerapeutica }, params);
  }

  async searchByTarja(params: SearchByTarjaParams): Promise<MedicamentoResumo[]> {
    // A API de listagem ANVISA não expõe filtro direto por tarja.
    // Retorna página genérica; consumidores devem chamar consultar_bula
    // pra confirmar a tarja de cada resultado.
    return this._search({}, { pagina: params.pagina, count: params.count ?? 10 });
  }

  async getDetalhes(numProcesso: string): Promise<MedicamentoDetalhes> {
    const raw = (await this.client.get(
      `/api/consulta/medicamento/produtos/${encodeURIComponent(numProcesso)}`
    )) as AnvisaDetalhesResponse;

    const classes = extractClassesTerapeuticas(raw.classesTerapeuticas);
    const empresaRazaoSocial = extractRazaoSocial(raw.empresa) || raw.razaoSocial || "";
    const empresaCnpj = extractCnpj(raw.empresa);

    return {
      numProcesso: extractNumProcesso(raw, numProcesso),
      // Schema novo usa "nomeComercial"; fallback pra "nomeProduto" do schema legado
      nomeProduto: raw.nomeComercial ?? raw.nomeProduto ?? "",
      empresa: empresaRazaoSocial,
      cnpj: empresaCnpj,
      // Schema novo: codigoBulaPaciente / codigoBulaProfissional são JWTs com exp curta
      idBulaPacienteProtegido: raw.codigoBulaPaciente ?? raw.idBulaPacienteProtegido ?? undefined,
      idBulaProfissionalProtegido:
        raw.codigoBulaProfissional ?? raw.idBulaProfissionalProtegido ?? undefined,
      tarja: normalizeTarja(raw.tarja),
      classesTerapeuticas: classes.length > 0 ? classes : undefined,
      principioAtivo: raw.principioAtivo ?? undefined,
      numeroRegistro: raw.numeroRegistro ?? undefined,
    };
  }

  async getApresentacoes(numProcesso: string): Promise<Apresentacao[]> {
    const raw = (await this.client.get(
      `/api/consulta/medicamento/produtos/${encodeURIComponent(numProcesso)}`
    )) as AnvisaDetalhesResponse;

    if (!raw.apresentacoes || !Array.isArray(raw.apresentacoes)) return [];
    return raw.apresentacoes
      .map((a) => ({
        descricao: a.descricao ?? a.embalagem ?? a.nomeApresentacao ?? "",
      }))
      .filter((a) => a.descricao);
  }

  async getBulaLink(idBulaProtegido: string): Promise<BulaLink> {
    try {
      const result = (await this.client.get(
        `/api/consulta/medicamentos/arquivo/bula/parecer/${encodeURIComponent(idBulaProtegido)}/`
      )) as { link?: string; url?: string } | string;

      const urlPdf = typeof result === "string" ? result : (result?.link ?? result?.url);

      return { id: idBulaProtegido, urlPdf: urlPdf ?? undefined };
    } catch {
      // Se falhar, retorna só o ID; consumidor pode construir URL manualmente
      return { id: idBulaProtegido };
    }
  }

  private async _search(
    filters: Record<string, string>,
    params: { pagina?: number; count?: number }
  ): Promise<MedicamentoResumo[]> {
    // ANVISA mudou para paginação 1-indexed em 2026.
    // Antes: page=0 era a primeira página. Agora: page=1 é a primeira.
    // Page=0 dispara erro `setFirstResult(-10)` no Hibernate (cálculo (0-1)*count).
    const page = params.pagina ?? 1;
    const count = params.count ?? 10;

    const queryParams: Record<string, string> = {
      page: String(page),
      count: String(count),
      ...filters,
    };

    const raw = (await this.client.get(
      "/api/consulta/bulario",
      queryParams
    )) as AnvisaListaResponse;

    if (!raw?.content || !Array.isArray(raw.content)) return [];
    return raw.content.map(mapListaItem);
  }
}
