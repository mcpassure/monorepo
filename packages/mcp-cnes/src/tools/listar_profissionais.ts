import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import { CNES_ANNOTATIONS } from "./annotations.js";
import { PorCodigoCnesInput } from "./schemas.js";

const DISCLAIMER =
  "AVISO DE USO RESPONSÁVEL: Dados de profissionais são públicos no CNES/DATASUS. " +
  "Não devem ser usados para identificação de pacientes ou fins que violem a privacidade. " +
  "CPFs estão mascarados.";

export function registerListarProfissionais(server: McpServer, repo: ICnesRepository): void {
  server.registerTool(
    "listar_profissionais",
    {
      title: "Listar Profissionais por Estabelecimento (CNES)",
      description: `Lista os profissionais de saúde cadastrados em um estabelecimento pelo código CNES. Retorna nome, CBO (Classificação Brasileira de Ocupações) e tipo de vínculo. CPFs são sempre mascarados. ${DISCLAIMER}`,
      inputSchema: PorCodigoCnesInput,
      annotations: CNES_ANNOTATIONS,
    },
    async ({ codigoCnes }) => {
      const { data, _meta } = await repo.listarProfissionais(codigoCnes);
      return {
        content: [{ type: "text", text: JSON.stringify({ data, _meta }) }],
        structuredContent: { data, _meta },
      };
    }
  );
}
