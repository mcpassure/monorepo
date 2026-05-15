import type Database from "better-sqlite3";
import type { z } from "zod";
import { isDatasetEmpty } from "../db/connection.js";
import { porCnes as porCnesEq } from "../db/queries/equipamentos.js";
import { porCodigo, porMunicipio, porNome, porTipo } from "../db/queries/estabelecimentos.js";
import { porCnes as porCnesLt } from "../db/queries/leitos.js";
import { porCnes as porCnesPf } from "../db/queries/profissionais.js";
import { porCnes as porCnesSr } from "../db/queries/servicos.js";
import type {
  BuscarEstabelecimentosResult,
  BuscarPorMunicipioInput,
  BuscarPorNomeInput,
  BuscarPorTipoInput,
  EquipamentoOutput,
  EstabelecimentoOutput,
  LeitoOutput,
  ProfissionalOutput,
  ServicoOutput,
} from "../tools/schemas.js";
import { buildEmptyMeta, buildMeta } from "../utils/meta.js";
import type { Meta, ResponseWithMeta } from "./types.js";

type BuscarPorNomeParams = z.infer<typeof BuscarPorNomeInput>;
type BuscarPorMunicipioParams = z.infer<typeof BuscarPorMunicipioInput>;
type BuscarPorTipoParams = z.infer<typeof BuscarPorTipoInput>;

const DISCLAIMER =
  "AVISO DE USO RESPONSÁVEL: Dados de profissionais são públicos no CNES/DATASUS. " +
  "Não devem ser usados para identificação de pacientes ou fins que violem a privacidade. " +
  "CPFs estão mascarados.";

const MSG_CACHE_VAZIO_ST =
  "Cache local vazio. Execute primeiro: npx -y @mcpassure/mcp-cnes sync --uf <UF> --grupos ST";
const MSG_CACHE_VAZIO_LT =
  "Cache local vazio para leitos. Execute primeiro: npx -y @mcpassure/mcp-cnes sync --uf <UF> --grupos LT";
const MSG_CACHE_VAZIO_EQ =
  "Cache local vazio para equipamentos. Execute primeiro: npx -y @mcpassure/mcp-cnes sync --uf <UF> --grupos EQ";
const MSG_CACHE_VAZIO_PF =
  "Cache local vazio para profissionais. Execute primeiro: npx -y @mcpassure/mcp-cnes sync --uf <UF> --grupos PF";
const MSG_CACHE_VAZIO_SR =
  "Cache local vazio para serviços. Execute primeiro: npx -y @mcpassure/mcp-cnes sync --uf <UF> --grupos SR";

export interface ICnesRepository {
  buscarPorCodigoCnes(codigo: string): Promise<
    ResponseWithMeta<{
      encontrado: boolean;
      estabelecimento?: EstabelecimentoOutput;
      mensagem?: string;
    }>
  >;

  buscarPorNome(
    params: BuscarPorNomeParams
  ): Promise<ResponseWithMeta<BuscarEstabelecimentosResult & { aviso?: string }>>;

  buscarPorMunicipio(
    params: BuscarPorMunicipioParams
  ): Promise<ResponseWithMeta<BuscarEstabelecimentosResult & { aviso?: string }>>;

  buscarPorTipo(
    params: BuscarPorTipoParams
  ): Promise<ResponseWithMeta<BuscarEstabelecimentosResult & { aviso?: string }>>;

  listarProfissionais(codigoCnes: string): Promise<
    ResponseWithMeta<{
      total: number;
      profissionais: ProfissionalOutput[];
      disclaimer: string;
      aviso?: string;
    }>
  >;

  listarLeitos(
    codigoCnes: string
  ): Promise<ResponseWithMeta<{ total: number; leitos: LeitoOutput[]; aviso?: string }>>;

  listarEquipamentos(
    codigoCnes: string
  ): Promise<
    ResponseWithMeta<{ total: number; equipamentos: EquipamentoOutput[]; aviso?: string }>
  >;

  listarServicos(
    codigoCnes: string
  ): Promise<ResponseWithMeta<{ total: number; servicos: ServicoOutput[]; aviso?: string }>>;
}

export class CnesRepository implements ICnesRepository {
  constructor(private readonly getDb: () => Database.Database) {}

  private db(): Database.Database {
    return this.getDb();
  }

  private meta(): Meta {
    return buildMeta(this.db());
  }

  async buscarPorCodigoCnes(codigo: string): Promise<
    ResponseWithMeta<{
      encontrado: boolean;
      estabelecimento?: EstabelecimentoOutput;
      mensagem?: string;
    }>
  > {
    const db = this.db();

    if (isDatasetEmpty(db)) {
      return {
        data: { encontrado: false, mensagem: MSG_CACHE_VAZIO_ST },
        _meta: buildEmptyMeta(),
      };
    }

    const est = porCodigo(db, codigo);
    const _meta = this.meta();
    if (est) {
      return { data: { encontrado: true, estabelecimento: est }, _meta };
    }
    return {
      data: {
        encontrado: false,
        mensagem: `Estabelecimento CNES ${codigo} não encontrado no dataset local.`,
      },
      _meta,
    };
  }

  async buscarPorNome(
    params: BuscarPorNomeParams
  ): Promise<ResponseWithMeta<BuscarEstabelecimentosResult & { aviso?: string }>> {
    const db = this.db();
    const { nome, uf, limit } = params;

    if (isDatasetEmpty(db)) {
      return {
        data: { total: 0, estabelecimentos: [], aviso: MSG_CACHE_VAZIO_ST },
        _meta: buildEmptyMeta(),
      };
    }

    const estabelecimentos = porNome(db, nome, uf, limit);
    return {
      data: { total: estabelecimentos.length, estabelecimentos },
      _meta: this.meta(),
    };
  }

  async buscarPorMunicipio(
    params: BuscarPorMunicipioParams
  ): Promise<ResponseWithMeta<BuscarEstabelecimentosResult & { aviso?: string }>> {
    const db = this.db();
    const { codigoIbge, tipo, limit } = params;

    if (isDatasetEmpty(db)) {
      return {
        data: { total: 0, estabelecimentos: [], aviso: MSG_CACHE_VAZIO_ST },
        _meta: buildEmptyMeta(),
      };
    }

    const estabelecimentos = porMunicipio(db, codigoIbge, tipo, limit);
    return {
      data: { total: estabelecimentos.length, estabelecimentos },
      _meta: this.meta(),
    };
  }

  async buscarPorTipo(
    params: BuscarPorTipoParams
  ): Promise<ResponseWithMeta<BuscarEstabelecimentosResult & { aviso?: string }>> {
    const db = this.db();
    const { tipo, uf, codigoIbge, limit } = params;

    if (isDatasetEmpty(db)) {
      return {
        data: { total: 0, estabelecimentos: [], aviso: MSG_CACHE_VAZIO_ST },
        _meta: buildEmptyMeta(),
      };
    }

    const estabelecimentos = porTipo(db, tipo, uf, codigoIbge, limit);
    return {
      data: { total: estabelecimentos.length, estabelecimentos },
      _meta: this.meta(),
    };
  }

  async listarProfissionais(codigoCnes: string): Promise<
    ResponseWithMeta<{
      total: number;
      profissionais: ProfissionalOutput[];
      disclaimer: string;
      aviso?: string;
    }>
  > {
    const db = this.db();

    if (isDatasetEmpty(db)) {
      return {
        data: { total: 0, profissionais: [], disclaimer: DISCLAIMER, aviso: MSG_CACHE_VAZIO_PF },
        _meta: buildEmptyMeta(),
      };
    }

    const pfCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM profissionais WHERE co_cnes = ?").get(codigoCnes) as {
        cnt: number;
      }
    ).cnt;

    if (pfCount === 0) {
      return {
        data: {
          total: 0,
          profissionais: [],
          disclaimer: DISCLAIMER,
          aviso: `Nenhum profissional encontrado para CNES ${codigoCnes} no dataset local.`,
        },
        _meta: this.meta(),
      };
    }

    const profissionais = porCnesPf(db, codigoCnes);
    return {
      data: { total: profissionais.length, profissionais, disclaimer: DISCLAIMER },
      _meta: this.meta(),
    };
  }

  async listarLeitos(
    codigoCnes: string
  ): Promise<ResponseWithMeta<{ total: number; leitos: LeitoOutput[]; aviso?: string }>> {
    const db = this.db();

    if (isDatasetEmpty(db)) {
      return {
        data: { total: 0, leitos: [], aviso: MSG_CACHE_VAZIO_LT },
        _meta: buildEmptyMeta(),
      };
    }

    const leitos = porCnesLt(db, codigoCnes);
    if (leitos.length === 0) {
      return {
        data: {
          total: 0,
          leitos: [],
          aviso: `Nenhum leito encontrado para CNES ${codigoCnes}. O estabelecimento pode não ter leitos cadastrados ou a UF não foi sincronizada.`,
        },
        _meta: this.meta(),
      };
    }

    return { data: { total: leitos.length, leitos }, _meta: this.meta() };
  }

  async listarEquipamentos(
    codigoCnes: string
  ): Promise<
    ResponseWithMeta<{ total: number; equipamentos: EquipamentoOutput[]; aviso?: string }>
  > {
    const db = this.db();

    if (isDatasetEmpty(db)) {
      return {
        data: { total: 0, equipamentos: [], aviso: MSG_CACHE_VAZIO_EQ },
        _meta: buildEmptyMeta(),
      };
    }

    const equipamentos = porCnesEq(db, codigoCnes);
    if (equipamentos.length === 0) {
      return {
        data: {
          total: 0,
          equipamentos: [],
          aviso: `Nenhum equipamento encontrado para CNES ${codigoCnes}.`,
        },
        _meta: this.meta(),
      };
    }

    return { data: { total: equipamentos.length, equipamentos }, _meta: this.meta() };
  }

  async listarServicos(
    codigoCnes: string
  ): Promise<ResponseWithMeta<{ total: number; servicos: ServicoOutput[]; aviso?: string }>> {
    const db = this.db();

    if (isDatasetEmpty(db)) {
      return {
        data: { total: 0, servicos: [], aviso: MSG_CACHE_VAZIO_SR },
        _meta: buildEmptyMeta(),
      };
    }

    const servicos = porCnesSr(db, codigoCnes);
    if (servicos.length === 0) {
      return {
        data: {
          total: 0,
          servicos: [],
          aviso: `Nenhum serviço especializado encontrado para CNES ${codigoCnes}.`,
        },
        _meta: this.meta(),
      };
    }

    return { data: { total: servicos.length, servicos }, _meta: this.meta() };
  }
}
