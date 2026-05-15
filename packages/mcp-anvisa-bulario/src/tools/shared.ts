import type { ApresentacoesOutput, BulaOutput, MedicamentoListaOutput } from "../schemas/tools.js";

export const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  idempotentHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

export const DISCLAIMER =
  "Dados informativos. Não substitui consulta oficial ANVISA ou avaliação por profissional de saúde habilitado.";

function buildMeta(data_da_base: string) {
  return {
    terminologia: "Bulário ANVISA",
    versao: "20260515",
    data_da_base,
    fonte: "ANVISA / dados.anvisa.gov.br",
    defasagem_dias: 0,
    modo: "cache_local",
    status: "ok",
  };
}

export function toListResult(output: MedicamentoListaOutput) {
  const meta = buildMeta(output._meta.data_da_base);
  const structuredContent = {
    data: output.data,
    _meta: {
      ...meta,
      defasagem_dias: output._meta.defasagem_dias,
      status: output._meta.status ?? "ok",
    },
    disclaimer: DISCLAIMER,
  };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
  };
}

export function toBulaResult(output: BulaOutput) {
  const meta = buildMeta(output._meta.data_da_base);
  const structuredContent = {
    data: output.data,
    _meta: {
      ...meta,
      defasagem_dias: output._meta.defasagem_dias,
      status: output._meta.status ?? "ok",
    },
    disclaimer: DISCLAIMER,
  };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
  };
}

export function toApresentacoesResult(output: ApresentacoesOutput) {
  const meta = buildMeta(output._meta.data_da_base);
  const structuredContent = {
    data: output.data,
    _meta: {
      ...meta,
      defasagem_dias: output._meta.defasagem_dias,
      status: output._meta.status ?? "ok",
    },
    disclaimer: DISCLAIMER,
  };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
  };
}

export function toErrorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: `Erro ao consultar base ANVISA: ${message}` }],
    isError: true as const,
  };
}
