import { z } from "zod";
import type { ITerminologiaRepository } from "../domain/repository.js";
import { CBHPM_EDICAO, DISCLAIMER } from "../constants.js";

export const inputSchema = z.object({
  codigo: z.string().regex(/^\d{8}$/, "Código TUSS deve ter exatamente 8 dígitos numéricos"),
});

export type Input = z.infer<typeof inputSchema>;

export const NOTA_LIMITACAO =
  "Porte anestésico e UCO não disponíveis publicamente. " +
  "Estes dados fazem parte da CBHPM completa (publicação paga da AMB). " +
  "Disponível apenas hierarquia (capítulo/grupo/subgrupo) conforme correlação TUSS-ROL publicada pela ANS.";

export function handler(input: Input, repo: ITerminologiaRepository) {
  const tussResult = repo.tuss.findByCodigo(input.codigo);
  const cbhpmResult = repo.cbhpm.getHierarquia(input.codigo);

  const { hierarquia, descricaoTuss } = cbhpmResult.data;

  return {
    content: [
      {
        type: "text" as const,
        text: hierarquia
          ? `${input.codigo}: Capítulo "${hierarquia.capitulo}" > Grupo "${hierarquia.grupo}" > Subgrupo "${hierarquia.subgrupo}".`
          : `${input.codigo}: hierarquia CBHPM não encontrada (disponível apenas para Tab. 22).`,
      },
    ],
    structuredContent: {
      data: {
        codigo: input.codigo,
        descricao_tuss: descricaoTuss,
        capitulo: hierarquia?.capitulo ?? null,
        grupo: hierarquia?.grupo ?? null,
        subgrupo: hierarquia?.subgrupo ?? null,
        nota_limitacao: NOTA_LIMITACAO,
        cbhpm_edicao: CBHPM_EDICAO,
      },
      _meta: [tussResult._meta, cbhpmResult._meta],
      disclaimer: DISCLAIMER,
    },
  };
}
