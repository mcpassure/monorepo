import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import { CNES_ANNOTATIONS } from "./annotations.js";
import { PorCodigoCnesInput } from "./schemas.js";

export function registerListarEquipamentos(server: McpServer, repo: ICnesRepository): void {
  server.registerTool(
    "listar_equipamentos",
    {
      title: "Listar Equipamentos por Estabelecimento (CNES)",
      description:
        "Lista os equipamentos cadastrados em um estabelecimento de saúde pelo código CNES. " +
        "Inclui: ressonância magnética, tomógrafo, mamógrafo, raio X, ultrassom, hemodiálise e outros. " +
        "Retorna quantidade existente e em uso por tipo de equipamento. " +
        "AVISO: dados do mês de referência da última sincronização.",
      inputSchema: PorCodigoCnesInput,
      annotations: CNES_ANNOTATIONS,
    },
    async ({ codigoCnes }) => {
      const { data, _meta } = await repo.listarEquipamentos(codigoCnes);
      return {
        content: [{ type: "text", text: JSON.stringify({ data, _meta }) }],
        structuredContent: { data, _meta },
      };
    }
  );
}
