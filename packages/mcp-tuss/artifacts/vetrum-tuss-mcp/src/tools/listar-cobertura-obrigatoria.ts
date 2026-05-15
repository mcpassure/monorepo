import { z } from "zod";
import type { ITerminologiaRepository } from "../domain/repository.js";
import { DISCLAIMER } from "../constants.js";

export const inputSchema = z.object({
  segmento: z.enum(["OD", "AMB", "HCO", "HSO", "PAC"]).optional(),
  com_dut: z.boolean().optional(),
  pagina: z.number().int().min(1).optional().default(1),
  por_pagina: z.number().int().min(1).max(200).optional().default(50),
});

export type Input = z.infer<typeof inputSchema>;

export function handler(input: Input, repo: ITerminologiaRepository) {
  const { segmento, com_dut, pagina, por_pagina } = input;

  const rolResult = repo.rolAns.listObrigatorios({
    segmento,
    comDut: com_dut,
    pagina,
    porPagina: por_pagina,
  });

  const meta = repo.getSyncMeta();

  return {
    content: [
      {
        type: "text" as const,
        text: `${rolResult.data.total} procedimento(s) com cobertura obrigatória no Rol ANS${segmento ? ` (${segmento})` : ""}. Exibindo ${rolResult.data.resultados.length} (página ${pagina}).`,
      },
    ],
    structuredContent: {
      data: rolResult.data,
      _meta: [meta.tuss, meta.rolAns],
      disclaimer: DISCLAIMER,
    },
  };
}
