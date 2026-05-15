import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ITerminologiaRepository } from "./domain/repository.js";
import * as buscarPorCodigo from "./tools/buscar-por-codigo.js";
import * as buscarPorDescricao from "./tools/buscar-por-descricao.js";
import * as listarPorCategoria from "./tools/listar-por-categoria.js";
import * as validarCoberturaRol from "./tools/validar-cobertura-rol.js";
import * as consultarHierarquiaCbhpm from "./tools/consultar-hierarquia-cbhpm.js";
import * as listarCoberturaObrigatoria from "./tools/listar-cobertura-obrigatoria.js";
import * as statusSincronizacao from "./tools/status-sincronizacao.js";

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  idempotentHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function createServer(repo: ITerminologiaRepository): McpServer {
  const server = new McpServer({
    name: "@mcpassure/mcp-tuss",
    version: "1.1.0",
  });

  server.tool(
    "buscar_tuss_por_codigo",
    "Busca um procedimento, material, medicamento ou taxa pelo código TUSS de 8 dígitos. Retorna descrição, tabela de origem, hierarquia CBHPM e cobertura no Rol ANS. O campo _meta inclui versão e defasagem por terminologia consultada.",
    buscarPorCodigo.inputSchema.shape,
    TOOL_ANNOTATIONS,
    (input) => buscarPorCodigo.handler(buscarPorCodigo.inputSchema.parse(input), repo)
  );

  server.tool(
    "buscar_tuss_por_descricao",
    "Busca procedimentos, materiais, medicamentos ou taxas TUSS por texto livre no nome/descrição. Suporta paginação e filtragem por tabela (18=taxas/diárias, 19=materiais/OPME, 20=medicamentos, 22=procedimentos).",
    buscarPorDescricao.inputSchema.shape,
    TOOL_ANNOTATIONS,
    (input) => buscarPorDescricao.handler(buscarPorDescricao.inputSchema.parse(input), repo)
  );

  server.tool(
    "listar_por_categoria",
    "Lista registros TUSS por categoria: procedimentos (Tab.22), materiais, opme (Tab.19), medicamentos (Tab.20), taxas ou diarias (Tab.18). Retorna lista paginada.",
    listarPorCategoria.inputSchema.shape,
    TOOL_ANNOTATIONS,
    (input) => listarPorCategoria.handler(listarPorCategoria.inputSchema.parse(input), repo)
  );

  server.tool(
    "validar_cobertura_rol",
    "Valida se um código TUSS está coberto pelo Rol de Procedimentos ANS vigente. Retorna cobertura por segmento de plano (OD=odontológico, AMB=ambulatorial, HCO=hospitalar c/ obstetrícia, HSO=hospitalar s/ obstetrícia, PAC=atenção continuada), RN de origem, vigência e indicação de Diretriz de Utilização (DUT).",
    validarCoberturaRol.inputSchema.shape,
    TOOL_ANNOTATIONS,
    (input) => validarCoberturaRol.handler(validarCoberturaRol.inputSchema.parse(input), repo)
  );

  server.tool(
    "consultar_hierarquia_cbhpm",
    "Consulta a hierarquia CBHPM (capítulo, grupo, subgrupo) de um procedimento da Tabela 22 TUSS. ATENÇÃO: porte anestésico e UCO não estão disponíveis publicamente (publicação paga AMB). Disponível apenas para Tab. 22 (procedimentos).",
    consultarHierarquiaCbhpm.inputSchema.shape,
    TOOL_ANNOTATIONS,
    (input) => consultarHierarquiaCbhpm.handler(consultarHierarquiaCbhpm.inputSchema.parse(input), repo)
  );

  server.tool(
    "listar_procedimentos_com_cobertura_obrigatoria",
    "Lista todos os procedimentos com cobertura obrigatória no Rol ANS vigente (correlação = SIM). Suporta filtro por segmento de plano e por presença de Diretriz de Utilização (DUT).",
    listarCoberturaObrigatoria.inputSchema.shape,
    TOOL_ANNOTATIONS,
    (input) => listarCoberturaObrigatoria.handler(listarCoberturaObrigatoria.inputSchema.parse(input), repo)
  );

  server.tool(
    "status_sincronizacao",
    "Retorna o status da sincronização do banco de dados: versão de cada terminologia (TUSS, Rol ANS, CBHPM), data da última sincronização e defasagem em dias por terminologia.",
    statusSincronizacao.inputSchema.shape,
    TOOL_ANNOTATIONS,
    (input) => statusSincronizacao.handler(statusSincronizacao.inputSchema.parse(input), repo)
  );

  return server;
}
