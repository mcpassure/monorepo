import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getDb } from "./db/connection.js";
import { CnesRepository } from "./domain/repository.js";
import { registerPrompts } from "./prompts/index.js";
import { registerResources } from "./resources/index.js";
import { registerBuscarPorCodigoCnes } from "./tools/buscar_por_codigo_cnes.js";
import { registerBuscarPorMunicipio } from "./tools/buscar_por_municipio.js";
import { registerBuscarPorNome } from "./tools/buscar_por_nome.js";
import { registerBuscarPorTipo } from "./tools/buscar_por_tipo.js";
import { registerListarEquipamentos } from "./tools/listar_equipamentos.js";
import { registerListarLeitos } from "./tools/listar_leitos.js";
import { registerListarProfissionais } from "./tools/listar_profissionais.js";
import { registerListarServicos } from "./tools/listar_servicos.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "mcpassure-cnes",
    version: "1.1.0",
  });

  const repo = new CnesRepository(getDb);

  registerBuscarPorCodigoCnes(server, repo);
  registerBuscarPorNome(server, repo);
  registerBuscarPorMunicipio(server, repo);
  registerBuscarPorTipo(server, repo);
  registerListarProfissionais(server, repo);
  registerListarLeitos(server, repo);
  registerListarEquipamentos(server, repo);
  registerListarServicos(server, repo);
  registerPrompts(server, repo);
  registerResources(server, repo);

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
