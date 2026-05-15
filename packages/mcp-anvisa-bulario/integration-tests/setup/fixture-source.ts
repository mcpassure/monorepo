import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
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
} from "../../src/sources/types.js";

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "api"
);

function loadFixture<T>(name: string): T {
  const filePath = path.join(FIXTURES_DIR, `${name}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

type RawBularioItem = {
  numProcesso?: string;
  nomeProduto?: string;
  razaoSocial?: string;
  cnpj?: string;
  expediente?: string;
  idBulaPacienteProtegido?: string;
  idBulaProfissionalProtegido?: string;
  dataAtualizacao?: string;
};

type RawSearchResponse = {
  content: RawBularioItem[];
  totalElements: number;
  number: number;
};

type RawDetailsResponse = RawBularioItem & {
  tarja?: string;
  classesTerapeuticas?: Array<{ descricao?: string }>;
  principioAtivo?: string;
  apresentacoes?: Array<{ descricao?: string; embalagem?: string }>;
};

const TARJA_MAP: Record<string, Tarja> = {
  "TARJA VERMELHA": "VERMELHA",
  VERMELHA: "VERMELHA",
  "TARJA PRETA": "PRETA",
  PRETA: "PRETA",
  "ISENTO DE PRESCRICAO": "LIVRE",
  "SEM TARJA": "LIVRE",
  LIVRE: "LIVRE",
};

function mapItem(item: RawBularioItem): MedicamentoResumo {
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

// Maps search keywords to fixture files for deterministic test results
const SEARCH_MAP: Record<string, string> = {
  novalgina: "search-novalgina",
  tylenol: "search-tylenol",
  amoxil: "search-amoxil",
  rivotril: "search-rivotril",
  ritalina: "search-ritalina",
  advil: "search-advil",
  dipirona: "search-dipirona",
  amoxicilina: "search-amoxicilina",
  ibuprofeno: "search-ibuprofeno",
  omeprazol: "search-omeprazol",
  buscopan: "search-buscopan",
  paracetamol: "search-tylenol",
  anticonvulsivante: "search-rivotril",
  analgesico: "search-dipirona",
  penicilina: "search-amoxicilina",
  antibiotico: "search-amoxicilina",
  antinflamatorio: "search-ibuprofeno",
  antiespasmodico: "search-buscopan",
  psicoanelitico: "search-ritalina",
};

const DETAILS_MAP: Record<string, string> = {
  "25351617747202347": "details-novalgina",
  "25351304473202248": "details-novalgina",
  "25351464826202349": "details-tylenol",
  "25351464493202358": "details-tylenol",
  "2599202214972": "details-amoxil",
  "25351537388202183": "details-rivotril",
  "2599200126855": "details-ritalina",
  "25351400358202201": "details-advil",
  "25351400604202217": "details-advil",
  "253510307620181": "details-novalgina",
  "25351727581201990": "details-novalgina",
  "25351534966201115": "details-amoxil",
  "25351112705200613": "details-amoxil",
  "25351080692202315": "details-advil",
  "25351641146200816": "details-advil",
  "25351898921202008": "details-novalgina",
};

function searchFromFixture(keyword: string, pagina: number, count: number): MedicamentoResumo[] {
  const key = keyword.toLowerCase().trim();
  const fixtureName =
    Object.entries(SEARCH_MAP).find(([k]) => key.includes(k))?.[1] ?? "search-dipirona";
  const raw = loadFixture<RawSearchResponse>(fixtureName);
  const start = (pagina - 1) * count;
  return raw.content.slice(start, start + count).map(mapItem);
}

export class FixtureSource implements BularioSource {
  readonly name = "FixtureSource";
  readonly callLog: Array<{ method: string; args: unknown }> = [];

  searchByName(params: SearchByNameParams): Promise<MedicamentoResumo[]> {
    this.callLog.push({ method: "searchByName", args: params });
    return Promise.resolve(searchFromFixture(params.nome, params.pagina ?? 1, params.count ?? 10));
  }

  searchByPrincipalAtivo(params: SearchByPrincipalAtivoParams): Promise<MedicamentoResumo[]> {
    this.callLog.push({ method: "searchByPrincipalAtivo", args: params });
    return Promise.resolve(
      searchFromFixture(params.principioAtivo, params.pagina ?? 1, params.count ?? 10)
    );
  }

  searchByClasseTerapeutica(params: SearchByClasseTerapeuticaParams): Promise<MedicamentoResumo[]> {
    this.callLog.push({ method: "searchByClasseTerapeutica", args: params });
    return Promise.resolve(
      searchFromFixture(params.classeTerapeutica, params.pagina ?? 1, params.count ?? 10)
    );
  }

  searchByTarja(params: SearchByTarjaParams): Promise<MedicamentoResumo[]> {
    this.callLog.push({ method: "searchByTarja", args: params });
    const tarjaFixtures: Record<string, string> = {
      PRETA: "search-ritalina",
      VERMELHA: "search-novalgina",
      LIVRE: "search-tylenol",
    };
    const raw = loadFixture<RawSearchResponse>(tarjaFixtures[params.tarja] ?? "search-dipirona");
    return Promise.resolve(raw.content.map(mapItem));
  }

  getDetalhes(numProcesso: string): Promise<MedicamentoDetalhes> {
    this.callLog.push({ method: "getDetalhes", args: { numProcesso } });
    const fixtureName = DETAILS_MAP[numProcesso];
    if (!fixtureName) {
      return Promise.reject(new Error(`No fixture for numProcesso: ${numProcesso}`));
    }
    const raw = loadFixture<RawDetailsResponse>(fixtureName);
    const tarja = raw.tarja ? TARJA_MAP[raw.tarja.toUpperCase().trim()] : undefined;
    const classes = Array.isArray(raw.classesTerapeuticas)
      ? raw.classesTerapeuticas.map((c) => c.descricao ?? "").filter(Boolean)
      : [];
    return Promise.resolve({
      ...mapItem(raw),
      tarja,
      classesTerapeuticas: classes.length > 0 ? classes : undefined,
      principioAtivo: raw.principioAtivo ?? undefined,
    });
  }

  getApresentacoes(numProcesso: string): Promise<Apresentacao[]> {
    this.callLog.push({ method: "getApresentacoes", args: { numProcesso } });
    const fixtureName = DETAILS_MAP[numProcesso];
    if (!fixtureName) return Promise.resolve([]);
    const raw = loadFixture<RawDetailsResponse>(fixtureName);
    if (!Array.isArray(raw.apresentacoes)) return Promise.resolve([]);
    return Promise.resolve(
      raw.apresentacoes
        .map((a) => ({ descricao: a.descricao ?? a.embalagem ?? "" }))
        .filter((a) => a.descricao)
    );
  }

  getBulaLink(idBulaProtegido: string): Promise<BulaLink> {
    this.callLog.push({ method: "getBulaLink", args: { idBulaProtegido } });
    const url = `https://consultas.anvisa.gov.br/api/consulta/medicamentos/arquivo/bula/parecer/${idBulaProtegido}/?Authorization=Guest`;
    return Promise.resolve({ id: idBulaProtegido, urlPdf: url });
  }

  resetCallLog(): void {
    this.callLog.length = 0;
  }
}

export class FailingSource implements BularioSource {
  readonly name = "FailingSource";
  constructor(private readonly error: Error = new Error("API unavailable")) {}

  searchByName(): Promise<MedicamentoResumo[]> {
    return Promise.reject(this.error);
  }
  searchByPrincipalAtivo(): Promise<MedicamentoResumo[]> {
    return Promise.reject(this.error);
  }
  searchByClasseTerapeutica(): Promise<MedicamentoResumo[]> {
    return Promise.reject(this.error);
  }
  searchByTarja(): Promise<MedicamentoResumo[]> {
    return Promise.reject(this.error);
  }
  getDetalhes(): Promise<MedicamentoDetalhes> {
    return Promise.reject(this.error);
  }
  getApresentacoes(): Promise<Apresentacao[]> {
    return Promise.reject(this.error);
  }
  getBulaLink(): Promise<BulaLink> {
    return Promise.reject(this.error);
  }
}
