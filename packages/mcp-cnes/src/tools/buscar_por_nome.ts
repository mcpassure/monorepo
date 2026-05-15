import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import { CNES_ANNOTATIONS } from "./annotations.js";
import { BuscarPorNomeInput } from "./schemas.js";

export function registerBuscarPorNome(server: McpServer, repo: ICnesRepository): void {
  server.registerTool(
    "buscar_por_nome",
    {
      title: "Buscar Estabelecimento por Nome",
      description:
        "Busca estabelecimentos de saúde por nome fantasia ou razão social. " +
        "Suporta filtro por UF. Retorna até `limit` resultados (padrão: 10, máximo: 50). " +
        "AVISO: dados do mês de referência da última sincronização.",
      inputSchema: BuscarPorNomeInput,
      annotations: CNES_ANNOTATIONS,
    },
    async (params) => {
      const { data, _meta } = await repo.buscarPorNome(params);
      return {
        content: [{ type: "text", text: JSON.stringify({ data, _meta }) }],
        structuredContent: { data, _meta },
      };
    }
  );
}
