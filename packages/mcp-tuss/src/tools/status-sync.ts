import { z } from "zod";
import { DISCLAIMER } from "../constants.js";
import type { TussRepository } from "../repositories/tuss.repository.js";

export const StatusSyncInput = z.object({});
export type StatusSyncInput = z.infer<typeof StatusSyncInput>;

export function statusSyncHandler(_input: StatusSyncInput, repo: TussRepository) {
  const status = repo.getSyncStatus();
  const meta22 = repo.getMeta("22");
  const meta20 = repo.getMeta("20");
  const meta18 = repo.getMeta("18");

  const allMeta = [meta22, meta20, meta18];

  return {
    data: {
      tuss22: {
        versao: status.tuss22.versao,
        total_registros: status.tuss22.rows,
        ultima_sincronizacao: status.tuss22.synced_at,
      },
      tuss20: {
        versao: status.tuss20.versao,
        total_registros: status.tuss20.rows,
        ultima_sincronizacao: status.tuss20.synced_at,
      },
      tuss18: {
        versao: status.tuss18.versao,
        total_registros: status.tuss18.rows,
        ultima_sincronizacao: status.tuss18.synced_at,
      },
      cache_vazio: repo.isDatasetEmpty(),
    },
    _meta: allMeta,
    disclaimer: DISCLAIMER,
  };
}
