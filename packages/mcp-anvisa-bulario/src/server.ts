import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "./domain/repository.js";
import { registerPrompts } from "./prompts/index.js";
import { registerResources } from "./resources/index.js";
import { registerBuscarPorClasseTerapeutica } from "./tools/buscar-por-classe-terapeutica.js";
import { registerBuscarPorNome } from "./tools/buscar-por-nome.js";
import { registerBuscarPorPrincipioAtivo } from "./tools/buscar-por-principio-ativo.js";
import { registerConsultarBula } from "./tools/consultar-bula.js";
import { registerFiltrarPorTarja } from "./tools/filtrar-por-tarja.js";
import { registerListarApresentacoes } from "./tools/listar-apresentacoes.js";

export function createServer(repository: IBularioRepository): McpServer {
  const server = new McpServer({
    name: "mcpassure-anvisa-bulario",
    version: "2.0.0",
  });

  registerBuscarPorNome(server, repository);
  registerBuscarPorPrincipioAtivo(server, repository);
  registerBuscarPorClasseTerapeutica(server, repository);
  registerFiltrarPorTarja(server, repository);
  registerConsultarBula(server, repository);
  registerListarApresentacoes(server, repository);
  registerPrompts(server, repository);
  registerResources(server, repository);

  return server;
}
