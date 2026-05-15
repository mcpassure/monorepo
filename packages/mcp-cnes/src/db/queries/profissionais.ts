import type Database from "better-sqlite3";
import type { ProfissionalOutput } from "../../tools/schemas.js";
import { maskCpf, shouldMask } from "../../utils/lgpd.js";

type ProfissionalRow = {
  co_cnes: string;
  cpf_prof: string | null;
  nm_prof: string | null;
  co_cbo: string | null;
  ds_cbo: string | null;
  tp_vinculo: string | null;
  competencia: string | null;
};

function applyCpfPolicy(cpf: string | null): string | null {
  if (!cpf) return null;
  if (shouldMask()) return maskCpf(cpf);
  return cpf;
}

function rowToOutput(row: ProfissionalRow): ProfissionalOutput {
  return {
    codigoCnes: row.co_cnes,
    cpf: applyCpfPolicy(row.cpf_prof),
    nome: row.nm_prof ?? "",
    cbo: row.co_cbo ?? "",
    descricaoCbo: row.ds_cbo ?? "",
    tipoVinculo: row.tp_vinculo ?? "",
    competencia: row.competencia ?? "",
  };
}

export function porCnes(db: Database.Database, codigoCnes: string): ProfissionalOutput[] {
  const rows = db
    .prepare("SELECT * FROM profissionais WHERE co_cnes = ? ORDER BY nm_prof")
    .all(codigoCnes) as ProfissionalRow[];
  return rows.map(rowToOutput);
}
