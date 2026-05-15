import { z } from "zod";

export const CodigoCnesSchema = z
  .string()
  .regex(/^\d{7}$/, "Código CNES deve ter exatamente 7 dígitos numéricos");

export const CodigoIbgeSchema = z
  .string()
  .regex(/^\d{6,7}$/, "Código IBGE deve ter 6 ou 7 dígitos");

export const TipoEstabelecimentoEnum = z.enum([
  "hospital",
  "UBS",
  "UPA",
  "clinica",
  "laboratorio",
  "farmacia",
  "SAMU",
  "consultorio",
  "apoio_saude",
  "atencao_especifica",
  "domiciliar",
  "outro",
]);

// Input schemas

export const BuscarPorCodigoCnesInput = z.object({
  codigoCnes: CodigoCnesSchema,
});

export const BuscarPorNomeInput = z.object({
  nome: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  uf: z.string().length(2, "UF deve ter 2 caracteres").optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const BuscarPorMunicipioInput = z.object({
  codigoIbge: CodigoIbgeSchema,
  tipo: TipoEstabelecimentoEnum.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const BuscarPorTipoInput = z.object({
  tipo: TipoEstabelecimentoEnum,
  uf: z.string().length(2).optional(),
  codigoIbge: CodigoIbgeSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const PorCodigoCnesInput = z.object({
  codigoCnes: CodigoCnesSchema,
});

// Output types

export type EstabelecimentoOutput = {
  codigoCnes: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string | null;
  tipo: string;
  naturezaJuridica: string;
  municipio: string;
  uf: string;
  codigoIbge: string;
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  telefone: string | null;
  vinculoSus: boolean;
  gestao: string;
  competencia: string;
  source: "local";
};

export type ProfissionalOutput = {
  codigoCnes: string;
  cpf: string | null;
  nome: string;
  cbo: string;
  descricaoCbo: string;
  tipoVinculo: string;
  competencia: string;
};

export type LeitoOutput = {
  codigoCnes: string;
  tipo: string;
  codigo: string;
  leitosExistentes: number;
  leitosSus: number;
  leitosNaoSus: number;
  competencia: string;
};

export type EquipamentoOutput = {
  codigoCnes: string;
  codigo: string;
  descricao: string;
  quantidadeExistente: number;
  quantidadeEmUso: number;
  competencia: string;
};

export type ServicoOutput = {
  codigoCnes: string;
  codigo: string;
  descricao: string;
  classificacao: string;
  competencia: string;
};

export type BuscarEstabelecimentosResult = {
  total: number;
  estabelecimentos: EstabelecimentoOutput[];
};

export type DatasetNaoSincronizado = {
  encontrado: false;
  mensagem: string;
};

export type NaoEncontrado = {
  encontrado: false;
  mensagem: string;
};
