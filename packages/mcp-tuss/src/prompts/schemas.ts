import { z } from "zod";

// MCP prompt args must be strings — coercion happens in handlers

export const VerificarCodigoTussArgs = {
  codigo: z.string().describe("Código TUSS numérico a verificar (ex: 30602165)"),
  tabela: z
    .string()
    .optional()
    .describe(
      "Tabela TUSS: 18 (diárias/taxas), 20 (medicamentos), 22 (procedimentos). Se omitida, busca em todas."
    ),
};

export const MapearCategoriaProcedimentosArgs = {
  termo: z.string().describe("Termo de busca (mínimo 3 caracteres)"),
  limite: z.string().optional().describe("Limite de resultados por tabela (1-50, padrão 20)"),
};

export const AnalisarCompatibilidadeCodigosArgs = {
  codigos: z
    .string()
    .describe("Códigos TUSS separados por vírgula, sem espaços (ex: 30602165,90010012,04010010)"),
};
