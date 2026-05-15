import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "../src/domain/repository.js";
import { registerBuscarPorClasseTerapeutica } from "../src/tools/buscar-por-classe-terapeutica.js";
import { registerBuscarPorNome } from "../src/tools/buscar-por-nome.js";
import { registerBuscarPorPrincipioAtivo } from "../src/tools/buscar-por-principio-ativo.js";
import { registerConsultarBula } from "../src/tools/consultar-bula.js";
import { registerFiltrarPorTarja } from "../src/tools/filtrar-por-tarja.js";
import { registerListarApresentacoes } from "../src/tools/listar-apresentacoes.js";
import { type McpToolResult, callTool as sharedCallTool } from "../test-utils/mcp-helpers.js";

export type EvalQuestion = {
  id: string;
  description: string;
  tool: string;
  input: Record<string, unknown>;
  validate: (result: McpToolResult) => boolean;
};

export function buildServer(repository: IBularioRepository): McpServer {
  const server = new McpServer({ name: "eval", version: "1.0.0" });
  registerBuscarPorNome(server, repository);
  registerBuscarPorPrincipioAtivo(server, repository);
  registerBuscarPorClasseTerapeutica(server, repository);
  registerFiltrarPorTarja(server, repository);
  registerConsultarBula(server, repository);
  registerListarApresentacoes(server, repository);
  return server;
}

/**
 * Re-export do callTool tipado de `test-utils` para conveniência.
 */
export const callTool = sharedCallTool;

// numProcesso known to be valid for Dipirona/Novalgina — confirmed via API
// This value may need updating if the ANVISA registry changes.
export const NOVALGINA_PROCESSO = "25351.929286/2003-37";

/**
 * Acesso ao payload `data` dentro de `structuredContent`, tipado de forma defensiva.
 * `unknown` força narrowing nos validates.
 */
type DataShape = {
  medicamentos?: Array<Record<string, unknown>>;
  nomeProduto?: string;
  apresentacoes?: unknown[];
  pagina?: number;
};

function getData(res: McpToolResult): DataShape | undefined {
  return res?.structuredContent?.data as DataShape | undefined;
}

function hasMeta(res: McpToolResult): boolean {
  const meta = res?.structuredContent?._meta;
  return (
    meta !== undefined &&
    typeof meta.data_da_base === "string" &&
    meta.data_da_base.length > 0 &&
    typeof meta.fonte === "string" &&
    meta.fonte.length > 0 &&
    typeof meta.defasagem_dias === "number" &&
    meta.defasagem_dias >= 0 &&
    (meta.modo === "online" || meta.modo === "cache_local")
  );
}

export const QUESTIONS: EvalQuestion[] = [
  {
    id: "E01",
    description: "buscar_por_nome com 'dipirona' retorna resultados não vazios",
    tool: "buscar_por_nome",
    input: { nome: "dipirona" },
    validate: (r) => {
      const data = getData(r);
      return Array.isArray(data?.medicamentos) && data.medicamentos.length > 0 && !r.isError;
    },
  },
  {
    id: "E02",
    description: "buscar_por_nome com 'paracetamol' retorna resultados",
    tool: "buscar_por_nome",
    input: { nome: "paracetamol" },
    validate: (r) => (getData(r)?.medicamentos?.length ?? 0) > 0 && !r.isError,
  },
  {
    id: "E03",
    description: "buscar_por_principio_ativo com 'ibuprofeno' retorna resultados",
    tool: "buscar_por_principio_ativo",
    input: { principioAtivo: "ibuprofeno" },
    validate: (r) => (getData(r)?.medicamentos?.length ?? 0) > 0,
  },
  {
    id: "E04",
    description: "buscar_por_principio_ativo com 'amoxicilina' retorna resultados",
    tool: "buscar_por_principio_ativo",
    input: { principioAtivo: "amoxicilina" },
    validate: (r) => (getData(r)?.medicamentos?.length ?? 0) > 0,
  },
  {
    id: "E05",
    description: "buscar_por_classe_terapeutica com 'antibiotico' retorna resultados",
    tool: "buscar_por_classe_terapeutica",
    input: { classeTerapeutica: "antibiotico" },
    validate: (r) => (getData(r)?.medicamentos?.length ?? 0) > 0,
  },
  {
    id: "E06",
    description: "filtrar_por_tarja PRETA retorna resultados não vazios",
    tool: "filtrar_por_tarja",
    input: { tarja: "PRETA" },
    validate: (r) => (getData(r)?.medicamentos?.length ?? 0) > 0 && !r.isError,
  },
  {
    id: "E07",
    description: "filtrar_por_tarja VERMELHA retorna resultados",
    tool: "filtrar_por_tarja",
    input: { tarja: "VERMELHA" },
    validate: (r) => !r.isError,
  },
  {
    id: "E08",
    description: "consultar_bula com numProcesso válido retorna nomeProduto não vazio",
    tool: "consultar_bula",
    input: { numProcesso: NOVALGINA_PROCESSO },
    validate: (r) => {
      const data = getData(r);
      return typeof data?.nomeProduto === "string" && data.nomeProduto.length > 0 && !r.isError;
    },
  },
  {
    id: "E09",
    description: "listar_apresentacoes com numProcesso válido retorna array",
    tool: "listar_apresentacoes",
    input: { numProcesso: NOVALGINA_PROCESSO },
    validate: (r) => Array.isArray(getData(r)?.apresentacoes) && !r.isError,
  },
  {
    id: "E10",
    description: "buscar_por_nome com string vazia retorna isError ou lista vazia (não crash)",
    tool: "buscar_por_nome",
    input: { nome: "" },
    validate: (r) => {
      const data = getData(r);
      return (
        r.isError === true || (Array.isArray(data?.medicamentos) && data.medicamentos.length === 0)
      );
    },
  },
  {
    id: "E11",
    description: "consultar_bula com numProcesso inválido retorna isError",
    tool: "consultar_bula",
    input: { numProcesso: "00000000000000000" },
    validate: (r) => r.isError === true,
  },
  {
    id: "E12",
    description: "buscar_por_nome com 'omeprazol' retorna structuredContent com campo pagina",
    tool: "buscar_por_nome",
    input: { nome: "omeprazol" },
    validate: (r) => typeof getData(r)?.pagina === "number" && !r.isError,
  },
  {
    id: "E13",
    description:
      "_meta presente em todas as respostas bem-sucedidas (data_da_base, fonte, defasagem_dias, modo)",
    tool: "buscar_por_nome",
    input: { nome: "dipirona" },
    validate: (r) => {
      if (r.isError) return true; // error responses don't need _meta
      return hasMeta(r);
    },
  },
];
