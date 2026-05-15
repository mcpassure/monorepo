import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import { handleCategoriasServicos, handleScope, handleTiposEstabelecimento } from "./handlers.js";

export function registerResources(server: McpServer, _repo: ICnesRepository): void {
  server.registerResource(
    "tipos_estabelecimento",
    "cnes://tipos_estabelecimento",
    {
      description: "Taxonomia oficial de tipos de estabelecimento CNES com código e descrição.",
      mimeType: "application/json",
    },
    (uri) => handleTiposEstabelecimento(uri)
  );

  server.registerResource(
    "categorias_servicos",
    "cnes://categorias_servicos",
    {
      description:
        "Categorias de serviços especializados CNES (ambulatorial, internação, urgência, diagnóstico, etc.).",
      mimeType: "application/json",
    },
    (uri) => handleCategoriasServicos(uri)
  );

  server.registerResource(
    "scope",
    "cnes://scope",
    {
      description:
        "Escopo do MCP (PT/EN): o que faz, o que não faz, disclaimer. Bilíngue PT-BR + EN.",
      mimeType: "text/markdown",
    },
    (uri) => handleScope(uri)
  );
}
