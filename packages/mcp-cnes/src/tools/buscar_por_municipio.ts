import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import { CNES_ANNOTATIONS } from "./annotations.js";
import { BuscarPorMunicipioInput } from "./schemas.js";

export function registerBuscarPorMunicipio(server: McpServer, repo: ICnesRepository): void {
  server.registerTool(
    "buscar_por_municipio",
    {
      title: "Buscar Estabelecimentos por Município (IBGE)",
      description:
        "Lista estabelecimentos de saúde de um município pelo código IBGE (6 ou 7 dígitos). " +
        "Filtra opcionalmente por tipo (hospital, UBS, UPA, etc.). " +
        "Requer dataset local sincronizado. " +
        "AVISO: dados do mês de referência da última sincronização.",
      inputSchema: BuscarPorMunicipioInput,
      annotations: CNES_ANNOTATIONS,
    },
    async (params) => {
      const { data, _meta } = await repo.buscarPorMunicipio(params);
      return {
        content: [{ type: "text", text: JSON.stringify({ data, _meta }) }],
        structuredContent: { data, _meta },
      };
    }
  );
}
