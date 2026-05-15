import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "../domain/repository.js";
import {
  BuscarPorPrincipioAtivoInputSchema,
  MedicamentoListaOutputSchema,
} from "../schemas/tools.js";
import { TOOL_ANNOTATIONS, toErrorResult, toListResult } from "./shared.js";

export function registerBuscarPorPrincipioAtivo(
  server: McpServer,
  repository: IBularioRepository
): void {
  server.registerTool(
    "buscar_por_principio_ativo",
    {
      title: "Buscar Medicamento por Princípio Ativo",
      description:
        "Busca medicamentos no Bulário Eletrônico da ANVISA pelo princípio ativo (DCB/DCI). " +
        "Retorna lista paginada de medicamentos que contêm o princípio ativo especificado.",
      inputSchema: BuscarPorPrincipioAtivoInputSchema,
      outputSchema: MedicamentoListaOutputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { principioAtivo, pagina = 1, count = 10 } = args;
      try {
        const result = await repository.searchByPrincipalAtivo({ principioAtivo, pagina, count });
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
