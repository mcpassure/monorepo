import { z } from "zod";
import type { ITerminologiaRepository } from "../domain/repository.js";
import { FHIR_SYSTEM, DISCLAIMER } from "../constants.js";

export const inputSchema = z.object({
  codigo: z.string().regex(/^\d{8}$/, "Código TUSS deve ter exatamente 8 dígitos numéricos"),
});

export type Input = z.infer<typeof inputSchema>;

export function handler(input: Input, repo: ITerminologiaRepository) {
  const result = repo.buscarPorCodigo(input.codigo);

  if (!result.data.found) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Código TUSS ${input.codigo} não encontrado.`,
        },
      ],
      structuredContent: {
        error: "CODIGO_NAO_ENCONTRADO",
        codigo: input.codigo,
        _meta: result._meta,
        disclaimer: DISCLAIMER,
      },
    };
  }

  const coberturas = result.data.coberturas;
  const segmentosCobertos = coberturas.filter((c) => c.coberto).map((c) => c.segmento);

  return {
    content: [
      {
        type: "text" as const,
        text: `${result.data.codigo} — ${result.data.descricao_tuss}\nTabela: ${result.data.tabela_origem} | Cobertura: ${segmentosCobertos.join(", ") || "Nenhuma identificada"}`,
      },
    ],
    structuredContent: {
      data: {
        codigo: result.data.codigo,
        descricao_tuss: result.data.descricao_tuss,
        tabela_origem: result.data.tabela_origem,
        tipo: result.data.tipo ?? null,
        ativo: result.data.ativo,
        sistema_fhir: FHIR_SYSTEM,
        coberturas: result.data.coberturas,
        hierarquia_cbhpm: result.data.hierarquia_cbhpm,
      },
      _meta: result._meta,
      disclaimer: DISCLAIMER,
    },
  };
}
