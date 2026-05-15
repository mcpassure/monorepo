import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import { CNES_ANNOTATIONS } from "./annotations.js";
import { PorCodigoCnesInput } from "./schemas.js";

export function registerListarLeitos(server: McpServer, repo: ICnesRepository): void {
  server.registerTool(
    "listar_leitos",
    {
      title: "Listar Leitos por Estabelecimento (CNES)",
      description:
        "Lista os leitos cadastrados em um estabelecimento de saúde pelo código CNES. " +
        "Inclui tipos: UTI adulto, UTI pediátrica, UTI neonatal, clínico, cirúrgico, obstétrico e outros. " +
        "Retorna quantidade existente, quantidade SUS e não-SUS por tipo de leito. " +
        "AVISO: dados do mês de referência da última sincronização.",
      inputSchema: PorCodigoCnesInput,
      annotations: CNES_ANNOTATIONS,
    },
    async ({ codigoCnes }) => {
      const { data, _meta } = await repo.listarLeitos(codigoCnes);
      return {
        content: [{ type: "text", text: JSON.stringify({ data, _meta }) }],
        structuredContent: { data, _meta },
      };
    }
  );
}
