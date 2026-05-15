import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "../domain/repository.js";
import { BuscarPorNomeInputSchema, MedicamentoListaOutputSchema } from "../schemas/tools.js";
import { TOOL_ANNOTATIONS, toErrorResult, toListResult } from "./shared.js";

export function registerBuscarPorNome(server: McpServer, repository: IBularioRepository): void {
  server.registerTool(
    "buscar_por_nome",
    {
      title: "Buscar Medicamento por Nome Comercial",
      description:
        "Busca medicamentos no Bulário Eletrônico da ANVISA pelo nome comercial. " +
        "Retorna lista paginada com número de processo, empresa e links de bula.",
      inputSchema: BuscarPorNomeInputSchema,
      outputSchema: MedicamentoListaOutputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { nome, pagina = 1, count = 10 } = args;
      try {
        const result = await repository.searchByName({ nome, pagina, count });
        return toListResult({
          data: { total: result.data.length, pagina, medicamentos: result.data },
          _meta: result._meta,
        });
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );
}
