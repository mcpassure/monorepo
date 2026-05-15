import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "../domain/repository.js";
import { FiltrarPorTarjaInputSchema, MedicamentoListaOutputSchema } from "../schemas/tools.js";
import { TOOL_ANNOTATIONS, toErrorResult, toListResult } from "./shared.js";

export function registerFiltrarPorTarja(server: McpServer, repository: IBularioRepository): void {
  server.registerTool(
    "filtrar_por_tarja",
    {
      title: "Filtrar Medicamentos por Tarja",
      description:
        "Lista medicamentos filtrados pelo tipo de tarja. " +
        "LIVRE: venda sem receita. " +
        "VERMELHA: requer receita médica simples (retenção). " +
        "PRETA: controle especial (psicotrópicos, entorpecentes). " +
        "Nota: a API da ANVISA não expõe filtro direto por tarja na listagem; " +
        "use consultar_bula para confirmar a tarja de um medicamento específico.",
      inputSchema: FiltrarPorTarjaInputSchema,
      outputSchema: MedicamentoListaOutputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { tarja, pagina = 1, count = 10 } = args;
      try {
        const result = await repository.searchByTarja({ tarja, pagina, count });
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
