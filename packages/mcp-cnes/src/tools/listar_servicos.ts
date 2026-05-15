import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import { CNES_ANNOTATIONS } from "./annotations.js";
import { PorCodigoCnesInput } from "./schemas.js";

export function registerListarServicos(server: McpServer, repo: ICnesRepository): void {
  server.registerTool(
    "listar_servicos",
    {
      title: "Listar Serviços Especializados por Estabelecimento (CNES)",
      description:
        "Lista os serviços especializados cadastrados em um estabelecimento de saúde pelo código CNES. " +
        "Retorna código, descrição e classificação de cada serviço. " +
        "AVISO: dados do mês de referência da última sincronização.",
      inputSchema: PorCodigoCnesInput,
      annotations: CNES_ANNOTATIONS,
    },
    async ({ codigoCnes }) => {
      const { data, _meta } = await repo.listarServicos(codigoCnes);
      return {
        content: [{ type: "text", text: JSON.stringify({ data, _meta }) }],
        structuredContent: { data, _meta },
      };
    }
  );
}
