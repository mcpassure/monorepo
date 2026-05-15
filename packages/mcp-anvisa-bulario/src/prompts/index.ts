import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "../domain/repository.js";
import {
  handleAnalisarApresentacoes,
  handleCompararTarjasPorClasse,
  handleVerificarMedicamentoCompleto,
} from "./handlers.js";
import {
  AnalisarApresentacoesInput,
  CompararTarjasPorClasseInput,
  VerificarMedicamentoCompletoInput,
} from "./schemas.js";

export function registerPrompts(server: McpServer, repository: IBularioRepository): void {
  server.registerPrompt(
    "verificar_medicamento_completo",
    {
      title: "Verificar Medicamento Completo",
      description:
        "Consolida nome, princípio ativo, classe terapêutica, tarja, apresentações e (opcional) bula " +
        "para um termo de busca. Tenta busca por nome e fallback por princípio ativo.",
      argsSchema: VerificarMedicamentoCompletoInput.shape,
    },
    async (args) => {
      const parsed = VerificarMedicamentoCompletoInput.parse(args);
      const messages = await handleVerificarMedicamentoCompleto(parsed, repository);
      return { messages };
    }
  );

  server.registerPrompt(
    "comparar_tarjas_por_classe",
    {
      title: "Comparar Tarjas por Classe Terapêutica",
      description:
        "Agrupa medicamentos de uma classe terapêutica por tarja regulatória. " +
        "Útil para entender o perfil de prescrição e controle de uma classe.",
      argsSchema: CompararTarjasPorClasseInput.shape,
    },
    async (args) => {
      const parsed = CompararTarjasPorClasseInput.parse(args);
      const messages = await handleCompararTarjasPorClasse(parsed, repository);
      return { messages };
    }
  );

  server.registerPrompt(
    "analisar_apresentacoes",
    {
      title: "Analisar Apresentações de Medicamento",
      description:
        "Agrupa as apresentações comerciais de um medicamento por concentração, " +
        "forma farmacêutica ou fabricante.",
      argsSchema: AnalisarApresentacoesInput.shape,
    },
    async (args) => {
      const parsed = AnalisarApresentacoesInput.parse(args);
      const messages = await handleAnalisarApresentacoes(parsed, repository);
      return { messages };
    }
  );
}
