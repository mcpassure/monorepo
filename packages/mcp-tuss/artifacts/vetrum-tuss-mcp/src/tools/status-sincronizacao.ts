import { z } from "zod";
import type { ITerminologiaRepository } from "../domain/repository.js";
import { CBHPM_EDICAO, DISCLAIMER } from "../constants.js";

export const inputSchema = z.object({});

export type Input = z.infer<typeof inputSchema>;

export function handler(_input: Input, repo: ITerminologiaRepository) {
  const meta = repo.getSyncMeta();

  const ultimaSync = [
    meta.tuss.data_da_base,
    meta.rolAns.data_da_base,
  ]
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  return {
    content: [
      {
        type: "text" as const,
        text: `Banco TUSS sincronizado em: ${ultimaSync ?? "nunca"}.`,
      },
    ],
    structuredContent: {
      data: {
        cbhpm_edicao: CBHPM_EDICAO,
        tuss_versao: meta.tuss.versao,
        rol_versao: meta.rolAns.versao,
        ultima_sincronizacao: ultimaSync,
      },
      _meta: [meta.tuss, meta.rolAns, meta.cbhpm],
      disclaimer: DISCLAIMER,
    },
  };
}
