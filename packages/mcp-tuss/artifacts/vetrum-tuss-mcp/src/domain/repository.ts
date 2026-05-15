import type {
  ResponseWithMultiMeta,
  CombinedRecord,
  TerminologiaMeta,
} from "./types.js";
import type { ITussSubRepository } from "./tuss-repository.js";
import type { IRolAnsSubRepository } from "./rol-repository.js";
import type { ICbhpmSubRepository } from "./cbhpm-repository.js";
import { FHIR_SYSTEM } from "../constants.js";

export type { ITussSubRepository } from "./tuss-repository.js";
export type { IRolAnsSubRepository } from "./rol-repository.js";
export type { ICbhpmSubRepository } from "./cbhpm-repository.js";

export interface SyncMetaAll {
  tuss: TerminologiaMeta;
  rolAns: TerminologiaMeta;
  cbhpm: TerminologiaMeta;
}

export interface ITerminologiaRepository {
  tuss: ITussSubRepository;
  rolAns: IRolAnsSubRepository;
  cbhpm: ICbhpmSubRepository;
  buscarPorCodigo(codigo: string): ResponseWithMultiMeta<CombinedRecord>;
  getSyncMeta(): SyncMetaAll;
}

export class TerminologiaRepository implements ITerminologiaRepository {
  constructor(
    readonly tuss: ITussSubRepository,
    readonly rolAns: IRolAnsSubRepository,
    readonly cbhpm: ICbhpmSubRepository
  ) {}

  getSyncMeta(): SyncMetaAll {
    return {
      tuss: this.tuss.getMeta(),
      rolAns: this.rolAns.getMeta(),
      cbhpm: this.cbhpm.getMeta(),
    };
  }

  buscarPorCodigo(codigo: string): ResponseWithMultiMeta<CombinedRecord> {
    const tussResult = this.tuss.findByCodigo(codigo);
    const rolResult = this.rolAns.getCobertura(codigo);

    const record = tussResult.data.record;
    const isTab22 = record?.tabela_origem === "22";

    const cbhpmResult = isTab22 ? this.cbhpm.getHierarquia(codigo) : null;

    const meta: TerminologiaMeta[] = [tussResult._meta, rolResult._meta];
    if (cbhpmResult) meta.push(cbhpmResult._meta);

    return {
      data: {
        codigo,
        found: record !== null,
        descricao_tuss: record?.descricao ?? null,
        tabela_origem: record?.tabela_origem ?? null,
        tipo: record?.tipo ?? null,
        ativo: record?.ativo ?? false,
        sistema_fhir: FHIR_SYSTEM,
        coberturas: rolResult.data.coberturas,
        hierarquia_cbhpm: cbhpmResult?.data.hierarquia ?? tussResult.data.hierarquia,
      },
      _meta: meta,
    };
  }
}
