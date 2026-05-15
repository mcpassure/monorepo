import { z } from "zod";

export const PerfilEstabelecimentoInput = z.object({
  codigo_cnes: z.string().regex(/^\d{7}$/, "Código CNES deve ter 7 dígitos numéricos"),
  incluir_profissionais: z.coerce.boolean().default(true),
  incluir_leitos: z.coerce.boolean().default(true),
  incluir_equipamentos: z.coerce.boolean().default(true),
  incluir_servicos: z.coerce.boolean().default(true),
});
export type PerfilEstabelecimentoInputType = z.infer<typeof PerfilEstabelecimentoInput>;

export const MapearRedeMunicipioInput = z.object({
  municipio: z.string().min(2, "Nome ou código IBGE do município"),
  uf: z.string().length(2).optional().describe("UF (2 letras) — necessária se houver homônimos"),
  tipo_estabelecimento: z
    .string()
    .optional()
    .describe("Filtra por tipo (ex: Hospital Geral, UBS, UPA)"),
  limite: z.coerce.number().int().min(1).max(200).default(50),
});
export type MapearRedeMunicipioInputType = z.infer<typeof MapearRedeMunicipioInput>;

export const AnalisarCoberturaUfInput = z.object({
  uf: z.string().length(2),
  agrupar_por: z.enum(["tipo", "natureza", "esfera_administrativa"]).default("tipo"),
});
export type AnalisarCoberturaUfInputType = z.infer<typeof AnalisarCoberturaUfInput>;
