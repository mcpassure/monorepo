import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "../domain/repository.js";
import { ListarApresentacoesInputSchema } from "../schemas/tools.js";
import { TOOL_ANNOTATIONS, toErrorResult } from "./shared.js";

/**
 * listar_apresentacoes — v2.0 limitation notice
 *
 * O CSV de dados abertos da ANVISA não contém campo de apresentações farmacêuticas
 * (concentração, forma farmacêutica, embalagem). Retorna informações de categoria,
 * situação e princípio ativo disponíveis no dataset.
 */
export function registerListarApresentacoes(
  server: McpServer,
  repository: IBularioRepository
): void {
  server.registerTool(
    "listar_apresentacoes",
    {
      title: "Listar Apresentações de Medicamento",
      description:
        "Retorna informações disponíveis sobre um medicamento no dataset ANVISA dados abertos. " +
        "NOTA v2.0: Apresentações farmacêuticas detalhadas (concentração, forma farmacêutica, " +
        "embalagem) não estão disponíveis no CSV dados.anvisa.gov.br. " +
        "Retorna categoria regulatória, situação de registro e princípio ativo. " +
        "Requer o numProcesso obtido via busca de medicamentos.",
      inputSchema: ListarApresentacoesInputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { numProcesso } = args;
      try {
        const [detalhesResult, apresentacoesResult] = await Promise.all([
          repository.getDetalhes(numProcesso),
          repository.getApresentacoes(numProcesso),
        ]);

        const output = {
          data: {
            numProcesso,
            nomeProduto: detalhesResult.data.nomeProduto,
            empresa: detalhesResult.data.empresa,
            apresentacoes: apresentacoesResult.data,
            aviso_v2:
              "Apresentações farmacêuticas detalhadas não disponíveis nesta versão (v2.0). " +
              "Fonte: CSV dados.anvisa.gov.br não inclui concentração/forma farmacêutica/embalagem.",
          },
          _meta: {
            ...detalhesResult._meta,
            terminologia: "Bulário ANVISA",
            fonte: "ANVISA / dados.anvisa.gov.br",
          },
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );
}
