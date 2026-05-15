import { z } from "zod";
import type { ITerminologiaRepository } from "../domain/repository.js";
import { DISCLAIMER } from "../constants.js";

export const inputSchema = z.object({
  texto: z.string().min(3, "Texto deve ter no mínimo 3 caracteres"),
  tabelas: z
    .array(z.enum(["18", "19", "20", "22"]))
    .optional()
    .default(["22"]),
  pagina: z.number().int().min(1).optional().default(1),
  por_pagina: z.number().int().min(1).max(100).optional().default(20),
});

export type Input = z.infer<typeof inputSchema>;

export function handler(input: Input, repo: ITerminologiaRepository) {
  const { texto, tabelas, pagina, por_pagina } = input;

  const result = repo.tuss.searchByText({
    texto,
    tabelas,
    pagina,
    porPagina: por_pagina,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `${result.data.total} resultado(s) para "${texto}". Exibindo ${result.data.resultados.length} (página ${pagina}).`,
      },
    ],
    structuredContent: {
      data: result.data,
      _meta: [result._meta],
      disclaimer: DISCLAIMER,
    },
  };
}
