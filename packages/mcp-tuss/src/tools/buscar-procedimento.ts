import { z } from "zod";
import { DISCLAIMER } from "../constants.js";
import type { TussRepository } from "../repositories/tuss.repository.js";

export const BuscarProcedimentoInput = z.object({
  codigo: z.string().optional().describe("Código TUSS de 8 dígitos (ex: 10101012)"),
  query: z.string().optional().describe("Termo livre para busca por nome do procedimento"),
  limit: z.number().int().min(1).max(100).default(20),
});
export type BuscarProcedimentoInput = z.infer<typeof BuscarProcedimentoInput>;

export function buscarProcedimentoHandler(input: BuscarProcedimentoInput, repo: TussRepository) {
  const meta = repo.getMeta("22");

  if (repo.isDatasetEmpty()) {
    return {
      data: [],
      _meta: meta,
      disclaimer: DISCLAIMER,
    };
  }

  if (input.codigo) {
    const item = repo.buscarProcedimentoPorCodigo(input.codigo.trim());
    return {
      data: item ? [item] : [],
      _meta: meta,
      disclaimer: DISCLAIMER,
    };
  }

  if (input.query) {
    const items = repo.buscarProcedimentos(input.query.trim(), input.limit);
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
