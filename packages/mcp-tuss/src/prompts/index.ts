import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TussRepository } from "../repositories/tuss.repository.js";
import {
  analisarCompatibilidadeCodigosHandler,
  mapearCategoriaProcedimentosHandler,
  verificarCodigoTussHandler,
} from "./handlers.js";
import {
  AnalisarCompatibilidadeCodigosArgs,
  MapearCategoriaProcedimentosArgs,
  VerificarCodigoTussArgs,
} from "./schemas.js";

export function registerPrompts(server: McpServer, repo: TussRepository): void {
  server.prompt(
    "verificar_codigo_tuss",
    "Verifica um código TUSS específico e retorna descrição, vigência e tabela de origem.",
    VerificarCodigoTussArgs,
    (args) => verificarCodigoTussHandler(args, repo)
  );

  server.prompt(
    "mapear_categoria_procedimentos",
    "Busca procedimentos/medicamentos/diárias por termo livre, agrupados por tabela TUSS.",
    MapearCategoriaProcedimentosArgs,
    (args) => mapearCategoriaProcedimentosHandler(args, repo)
  );

  server.prompt(
    "analisar_compatibilidade_codigos",
    "Valida uma lista de códigos TUSS e identifica em qual tabela cada um pertence.",
    AnalisarCompatibilidadeCodigosArgs,
    (args) => analisarCompatibilidadeCodigosHandler(args, repo)
  );
}
