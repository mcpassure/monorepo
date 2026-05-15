import { z } from "zod";

// ── Inputs ──────────────────────────────────────────────────────────────────

export const BuscarPorNomeInputSchema = z.object({
  nome: z.string().min(1).describe("Nome comercial do medicamento"),
  pagina: z.number().int().min(1).optional().describe("Número da página (padrão: 1)"),
  count: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Resultados por página (padrão: 10, máx: 100)"),
});

export const BuscarPorPrincipioAtivoInputSchema = z.object({
  principioAtivo: z
    .string()
    .min(1)
    .describe("DCB ou DCI do princípio ativo (ex: dipirona, ibuprofeno)"),
  pagina: z.number().int().min(1).optional(),
  count: z.number().int().min(1).max(100).optional(),
});

export const BuscarPorClasseTerapeuticaInputSchema = z.object({
  classeTerapeutica: z
    .string()
    .min(1)
    .describe("Classe terapêutica do medicamento (ex: antibiótico, analgésico)"),
  pagina: z.number().int().min(1).optional(),
  count: z.number().int().min(1).max(100).optional(),
});

export const FiltrarPorTarjaInputSchema = z.object({
  tarja: z
    .enum(["LIVRE", "VERMELHA", "PRETA"])
    .describe(
      "Tipo de tarja: LIVRE (venda livre), VERMELHA (retenção de receita), PRETA (controle especial)"
    ),
  pagina: z.number().int().min(1).optional(),
  count: z.number().int().min(1).max(100).optional(),
});

export const ConsultarBulaInputSchema = z.object({
  numProcesso: z
    .string()
    .min(1)
    .describe("Número de processo do medicamento na ANVISA (obtido via busca de medicamentos)"),
});

export const ListarApresentacoesInputSchema = z.object({
  numProcesso: z.string().min(1).describe("Número de processo do medicamento na ANVISA"),
});

// ── Meta ─────────────────────────────────────────────────────────────────────

export const MetaSchema = z.object({
  data_da_base: z.string().describe("ISO 8601 da última atualização da base consultada"),
  fonte: z.string().describe("Identificação da fonte que respondeu (ex: anvisa_api, cache_local)"),
  defasagem_dias: z.number().describe("Dias desde data_da_base"),
  modo: z.enum(["cache_local", "online"]),
  status: z.enum(["ok", "stale"]).optional().describe("'stale' quando defasagem > 30 dias"),
});

// ── Shared pieces ────────────────────────────────────────────────────────────

const MedicamentoResumoSchema = z.object({
  numProcesso: z.string(),
  nomeProduto: z.string(),
  empresa: z.string(),
  idBulaPacienteProtegido: z.string().optional(),
  idBulaProfissionalProtegido: z.string().optional(),
  dataAtualizacao: z.string().optional(),
});

// ── Outputs ──────────────────────────────────────────────────────────────────

export const MedicamentoListaOutputSchema = z.object({
  data: z.object({
    total: z.number().describe("Número de resultados retornados nesta página"),
    pagina: z.number(),
    medicamentos: z.array(MedicamentoResumoSchema),
  }),
  _meta: MetaSchema,
});

export const BulaOutputSchema = z.object({
  data: z.object({
    numProcesso: z.string(),
    nomeProduto: z.string(),
    empresa: z.string(),
    tarja: z.enum(["LIVRE", "VERMELHA", "PRETA"]).optional(),
    classesTerapeuticas: z.array(z.string()).optional(),
    principioAtivo: z.string().optional(),
    bulaPaciente: z
      .object({
        id: z.string(),
        urlPdf: z.string().optional(),
      })
      .optional(),
    bulaProfissional: z
      .object({
        id: z.string(),
        urlPdf: z.string().optional(),
      })
      .optional(),
  }),
  _meta: MetaSchema,
});

export const ApresentacoesOutputSchema = z.object({
  data: z.object({
    numProcesso: z.string(),
    nomeProduto: z.string(),
    empresa: z.string(),
    apresentacoes: z.array(
      z.object({
        descricao: z.string(),
      })
    ),
  }),
  _meta: MetaSchema,
});

// ── Inferred types ───────────────────────────────────────────────────────────

export type MedicamentoListaOutput = z.infer<typeof MedicamentoListaOutputSchema>;
export type BulaOutput = z.infer<typeof BulaOutputSchema>;
export type ApresentacoesOutput = z.infer<typeof ApresentacoesOutputSchema>;
export type Meta = z.infer<typeof MetaSchema>;
