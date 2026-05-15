import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "../domain/repository.js";
import { ConsultarBulaInputSchema } from "../schemas/tools.js";
import { TOOL_ANNOTATIONS, toErrorResult } from "./shared.js";

/**
 * consultar_bula — v2.0 limitation notice
 *
 * O texto completo de bula NÃO está disponível no CSV de dados abertos da ANVISA
 * (DADOS_ABERTOS_MEDICAMENTOS.csv). Este endpoint retorna os metadados disponíveis
 * do medicamento (classe terapêutica, princípio ativo, registro) e um aviso explicativo.
 *
 * O texto completo de bula está previsto para v2.1 via Worker Cloudflare que acessa
 * a API bulario.anvisa.gov.br diretamente.
 */
export function registerConsultarBula(server: McpServer, repository: IBularioRepository): void {
  server.registerTool(
    "consultar_bula",
    {
      title: "Consultar Bula de Medicamento",
      description:
        "Retorna metadados disponíveis de um medicamento (classe terapêutica, " +
        "princípio ativo, número de registro, situação). " +
        "NOTA v2.0: O texto completo da bula e links PDF não estão disponíveis " +
        "nesta versão (fonte CSV dados abertos ANVISA). " +
        "Previsto para v2.1 via integração direta com bulario.anvisa.gov.br. " +
        "Requer o numProcesso obtido via busca de medicamentos.",
      inputSchema: ConsultarBulaInputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { numProcesso } = args;
      try {
        const detalhesResult = await repository.getDetalhes(numProcesso);
        const det = detalhesResult.data;

        const output = {
          data: {
            numProcesso: det.numProcesso,
            nomeProduto: det.nomeProduto,
            empresa: det.empresa,
            tarja: det.tarja,
            classesTerapeuticas: det.classesTerapeuticas,
            principioAtivo: det.principioAtivo,
            numeroRegistro: det.numeroRegistro,
            bulaPaciente: null,
            bulaProfissional: null,
            aviso_v2:
              "Texto completo de bula não disponível nesta versão (v2.0). " +
              "Fonte: CSV dados.anvisa.gov.br não inclui bulas PDF. " +
              "Previsto: v2.1 via Worker com acesso ao bulario.anvisa.gov.br.",
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
