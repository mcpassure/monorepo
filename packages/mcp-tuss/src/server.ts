import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TOOL_ANNOTATIONS } from "./constants.js";
import { registerPrompts } from "./prompts/index.js";
import type { TussRepository } from "./repositories/tuss.repository.js";
import { registerResources } from "./resources/index.js";
import { BuscarDiariaInput, buscarDiariaHandler } from "./tools/buscar-diaria.js";
import { BuscarMedicamentoInput, buscarMedicamentoHandler } from "./tools/buscar-medicamento.js";
import { BuscarProcedimentoInput, buscarProcedimentoHandler } from "./tools/buscar-procedimento.js";
import { statusSyncHandler } from "./tools/status-sync.js";

export function createServer(repo: TussRepository): McpServer {
  const server = new McpServer({
    name: "@mcpassure/mcp-tuss",
    version: "0.1.0",
  });

  server.tool(
    "buscar_procedimento_tuss",
    "Busca procedimentos médicos na Tabela 22 do TUSS (ANS). Aceita código TUSS ou termo livre.",
    BuscarProcedimentoInput.shape,
    TOOL_ANNOTATIONS,
    async (input) => {
      const parsed = BuscarProcedimentoInput.parse(input);
      const result = buscarProcedimentoHandler(parsed, repo);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  server.tool(
    "buscar_medicamento_tuss",
    "Busca medicamentos na Tabela 20 do TUSS (ANS). Aceita código TUSS ou termo livre.",
    BuscarMedicamentoInput.shape,
    TOOL_ANNOTATIONS,
    async (input) => {
      const parsed = BuscarMedicamentoInput.parse(input);
      const result = buscarMedicamentoHandler(parsed, repo);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  server.tool(
    "buscar_diaria_taxa_tuss",
    "Busca diárias e taxas hospitalares na Tabela 18 do TUSS (ANS). Aceita código ou termo livre.",
    BuscarDiariaInput.shape,
    TOOL_ANNOTATIONS,
    async (input) => {
      const parsed = BuscarDiariaInput.parse(input);
      const result = buscarDiariaHandler(parsed, repo);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  server.tool(
    "status_sincronizacao_tuss",
    "Retorna o status do cache local TUSS: versão sincronizada, total de registros e data da última sincronização.",
    {},
    TOOL_ANNOTATIONS,
    async () => {
      const result = statusSyncHandler({}, repo);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  registerPrompts(server, repo);
  registerResources(server, repo);

  return server;
}
