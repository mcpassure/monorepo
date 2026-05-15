import { z } from "zod";
import type { ITerminologiaRepository } from "../domain/repository.js";
import { DISCLAIMER } from "../constants.js";

export const inputSchema = z.object({
  categoria: z.enum([
    "procedimentos",
    "materiais",
    "medicamentos",
    "opme",
    "taxas",
    "diarias",
  ]),
  pagina: z.number().int().min(1).optional().default(1),
  por_pagina: z.number().int().min(1).max(200).optional().default(50),
});

export type Input = z.infer<typeof inputSchema>;

export function handler(input: Input, repo: ITerminologiaRepository) {
  const { categoria, pagina, por_pagina } = input;

  const result = repo.tuss.listByCategoria({
    categoria,
    pagina,
    porPagina: por_pagina,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `Categoria "${categoria}": ${result.data.total} registro(s). Exibindo ${result.data.resultados.length} (página ${pagina}).`,
      },
    ],
    structuredContent: {
      data: result.data,
      _meta: [result._meta],
      disclaimer: DISCLAIMER,
    },
  };
}
