import { z } from "zod";
import type { ITerminologiaRepository } from "../domain/repository.js";
import { DISCLAIMER } from "../constants.js";

export const inputSchema = z.object({
  codigo: z.string().regex(/^\d{8}$/, "Código TUSS deve ter exatamente 8 dígitos numéricos"),
  segmento: z.enum(["OD", "AMB", "HCO", "HSO", "PAC"]).optional(),
});

export type Input = z.infer<typeof inputSchema>;

export function handler(input: Input, repo: ITerminologiaRepository) {
  const tussResult = repo.tuss.findByCodigo(input.codigo);
  const rolResult = repo.rolAns.getCobertura(input.codigo, input.segmento);

  const { noRol, coberturas, descricaoTuss } = rolResult.data;
  const segmentosCobertos = coberturas.filter((c) => c.coberto).map((c) => c.segmento);

  return {
    content: [
      {
        type: "text" as const,
        text: noRol
          ? `${input.codigo} está no Rol ANS. Cobertura: ${segmentosCobertos.join(", ") || "sem segmento especificado coberto"}.`
          : `${input.codigo} NÃO está no Rol ANS vigente.`,
      },
    ],
    structuredContent: {
      data: {
        codigo: input.codigo,
        descricao_tuss: descricaoTuss,
        no_rol_ans: noRol,
        coberturas,
      },
      _meta: [tussResult._meta, rolResult._meta],
      disclaimer: DISCLAIMER,
    },
  };
}
