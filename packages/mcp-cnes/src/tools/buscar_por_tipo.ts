import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import { CNES_ANNOTATIONS } from "./annotations.js";
import { BuscarPorTipoInput } from "./schemas.js";

export function registerBuscarPorTipo(server: McpServer, repo: ICnesRepository): void {
  server.registerTool(
    "buscar_por_tipo",
    {
      title: "Buscar Estabelecimentos por Tipo",
      description:
        "Lista estabelecimentos de saúde por tipo: hospital, UBS, UPA, clinica, laboratorio, " +
        "farmacia, SAMU, consultorio, apoio_saude, atencao_especifica, domiciliar, outro. " +
        "Filtra opcionalmente por UF ou código IBGE do município. " +
        "Requer dataset local sincronizado. " +
        "AVISO: dados do mês de referência da última sincronização.",
      inputSchema: BuscarPorTipoInput,
      annotations: CNES_ANNOTATIONS,
    },
    async (params) => {
      const { data, _meta } = await repo.buscarPorTipo(params);
      return {
        content: [{ type: "text", text: JSON.stringify({ data, _meta }) }],
        structuredContent: { data, _meta },
      };
    }
  );
}
