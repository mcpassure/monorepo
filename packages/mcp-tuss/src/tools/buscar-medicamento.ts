import { z } from "zod";
import { DISCLAIMER } from "../constants.js";
import type { TussRepository } from "../repositories/tuss.repository.js";

export const BuscarMedicamentoInput = z.object({
  codigo: z.string().optional().describe("Código TUSS 20 (ex: 90010012)"),
  query: z.string().optional().describe("Termo livre para busca por nome do medicamento"),
  limit: z.number().int().min(1).max(100).default(20),
});
export type BuscarMedicamentoInput = z.infer<typeof BuscarMedicamentoInput>;

export function buscarMedicamentoHandler(input: BuscarMedicamentoInput, repo: TussRepository) {
  const meta = repo.getMeta("20");

  if (input.codigo) {
    const item = repo.buscarMedicamentoPorCodigo(input.codigo.trim());
    return {
      data: item ? [item] : [],
      _meta: meta,
      disclaimer: DISCLAIMER,
    };
  }

  if (input.query) {
    const items = repo.buscarMedicamentos(input.query.trim(), input.limit);
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
