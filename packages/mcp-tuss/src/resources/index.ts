import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TussRepository } from "../repositories/tuss.repository.js";
import { categoriasHandler, scopeHandler, tabelasDisponiveisHandler } from "./handlers.js";

export function registerResources(server: McpServer, _repo: TussRepository): void {
  server.resource(
    "tabelas_disponiveis",
    "tuss://tabelas_disponiveis",
    {
      description: "Lista de tabelas TUSS cobertas e periodicidade de atualização.",
      mimeType: "application/json",
    },
    () => tabelasDisponiveisHandler()
  );

  server.resource(
    "categorias",
    "tuss://categorias",
    {
      description: "Categorias principais por tabela TUSS.",
      mimeType: "application/json",
    },
    () => categoriasHandler()
  );

  server.resource(
    "scope",
    "tuss://scope",
    {
      description: "Escopo do MCP (PT/EN), disclaimer e limitações.",
      mimeType: "text/markdown",
    },
    () => scopeHandler()
  );
}
