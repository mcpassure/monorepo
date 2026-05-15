import type Database from "better-sqlite3";
import type { ServicoOutput } from "../../tools/schemas.js";

type ServicoRow = {
  co_cnes: string;
  co_servico: string | null;
  ds_servico: string | null;
  co_class_sr: string | null;
  ds_class_sr: string | null;
  competencia: string | null;
};

function rowToOutput(row: ServicoRow): ServicoOutput {
  return {
    codigoCnes: row.co_cnes,
    codigo: row.co_servico ?? "",
    descricao: row.ds_servico ?? "",
    classificacao: row.ds_class_sr ?? "",
    competencia: row.competencia ?? "",
  };
}

export function porCnes(db: Database.Database, codigoCnes: string): ServicoOutput[] {
  const rows = db
    .prepare("SELECT * FROM servicos_especializados WHERE co_cnes = ? ORDER BY co_servico")
    .all(codigoCnes) as ServicoRow[];
  return rows.map(rowToOutput);
}
