import { z } from "zod";
import { DISCLAIMER } from "../constants.js";
import type { TussRepository } from "../repositories/tuss.repository.js";

export const BuscarDiariaInput = z.object({
  codigo: z.string().optional().describe("Código TUSS 18 (diária/taxa)"),
  query: z.string().optional().describe("Termo livre para busca por nome"),
  limit: z.number().int().min(1).max(100).default(20),
});
export type BuscarDiariaInput = z.infer<typeof BuscarDiariaInput>;

export function buscarDiariaHandler(input: BuscarDiariaInput, repo: TussRepository) {
  const meta = repo.getMeta("18");

  if (input.codigo) {
    const item = repo.buscarDiariaPorCodigo(input.codigo.trim());
    return {
      data: item ? [item] : [],
      _meta: meta,
      disclaimer: DISCLAIMER,
    };
  }

  if (input.query) {
    const items = repo.buscarDiarias(input.query.trim(), input.limit);
    return {
      data: items,
      total: items.length,
      _meta: meta,
      disclaimer: DISCLAIMER,
    };
  }

  return {
    data: [],
    _meta: meta,
    error: "Informe `codigo` ou `query`.",
    disclaimer: DISCLAIMER,
  };
}
