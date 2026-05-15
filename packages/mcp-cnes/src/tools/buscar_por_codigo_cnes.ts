import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import { CNES_ANNOTATIONS } from "./annotations.js";
import { BuscarPorCodigoCnesInput } from "./schemas.js";

export function registerBuscarPorCodigoCnes(server: McpServer, repo: ICnesRepository): void {
  server.registerTool(
    "buscar_por_codigo_cnes",
    {
      title: "Buscar Estabelecimento por Código CNES",
      description:
        "Busca um estabelecimento de saúde pelo seu código CNES (7 dígitos). " +
        "Retorna dados cadastrais: nome, tipo, endereço, município, UF, coordenadas e vínculo SUS. " +
        "AVISO: dados do mês de referência da última sincronização, podem não refletir a situação operacional atual.",
      inputSchema: BuscarPorCodigoCnesInput,
      annotations: CNES_ANNOTATIONS,
    },
    async ({ codigoCnes }) => {
      const { data, _meta } = await repo.buscarPorCodigoCnes(codigoCnes);
      return {
        content: [{ type: "text", text: JSON.stringify({ data, _meta }) }],
        structuredContent: { data, _meta },
      };
    }
  );
}
