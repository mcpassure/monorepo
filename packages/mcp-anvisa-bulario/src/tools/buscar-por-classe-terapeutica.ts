import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "../domain/repository.js";
import {
  BuscarPorClasseTerapeuticaInputSchema,
  MedicamentoListaOutputSchema,
} from "../schemas/tools.js";
import { TOOL_ANNOTATIONS, toErrorResult, toListResult } from "./shared.js";

export function registerBuscarPorClasseTerapeutica(
  server: McpServer,
  repository: IBularioRepository
): void {
  server.registerTool(
    "buscar_por_classe_terapeutica",
    {
      title: "Buscar Medicamento por Classe Terapêutica",
      description:
        "Busca medicamentos no Bulário Eletrônico da ANVISA pela classe terapêutica " +
        "(ex: antibiótico, analgésico, anti-hipertensivo). " +
        "Retorna lista paginada de medicamentos da classe especificada.",
      inputSchema: BuscarPorClasseTerapeuticaInputSchema,
      outputSchema: MedicamentoListaOutputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { classeTerapeutica, pagina = 1, count = 10 } = args;
      try {
        const result = await repository.searchByClasseTerapeutica({
          classeTerapeutica,
          pagina,
          count,
        });
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
