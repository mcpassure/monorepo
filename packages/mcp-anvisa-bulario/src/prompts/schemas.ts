import { z } from "zod";

export const VerificarMedicamentoCompletoInput = z.object({
  termo: z.string().min(2, "Nome comercial, princípio ativo ou parte"),
  incluir_apresentacoes: z.boolean().default(true),
  incluir_bula: z.boolean().default(false).describe("Se true, inclui resumo da bula (mais caro)"),
});
export type VerificarMedicamentoCompletoInputType = z.infer<
  typeof VerificarMedicamentoCompletoInput
>;

export const CompararTarjasPorClasseInput = z.object({
  classe_terapeutica: z.string().min(3),
  limite: z.number().int().min(1).max(100).default(50),
});
export type CompararTarjasPorClasseInputType = z.infer<typeof CompararTarjasPorClasseInput>;

export const AnalisarApresentacoesInput = z.object({
  nome_medicamento: z.string().min(2),
  agrupar_por: z.enum(["concentracao", "forma_farmaceutica", "fabricante"]).default("concentracao"),
});
export type AnalisarApresentacoesInputType = z.infer<typeof AnalisarApresentacoesInput>;
