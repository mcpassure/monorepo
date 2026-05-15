import type { IBularioRepository } from "../domain/repository.js";
import type { MedicamentoResumo } from "../sources/types.js";
import type {
  AnalisarApresentacoesInputType,
  CompararTarjasPorClasseInputType,
  VerificarMedicamentoCompletoInputType,
} from "./schemas.js";

const DISCLAIMER =
  "\n\n⚠️ **Aviso ANVISA:** Informações de consulta oficial. Decisões clínicas ou regulatórias " +
  "devem ser baseadas na fonte ANVISA atualizada. Medicamentos sob Tarja Preta estão sujeitos " +
  "à Portaria 344/98 — controle especial obrigatório.";

export async function handleVerificarMedicamentoCompleto(
  input: VerificarMedicamentoCompletoInputType,
  repository: IBularioRepository
): Promise<Array<{ role: "user" | "assistant"; content: { type: "text"; text: string } }>> {
  const { termo, incluir_apresentacoes, incluir_bula } = input;

  let medicamentos: MedicamentoResumo[] = [];
  let fonteUsada = "";

  try {
    const result = await repository.searchByName({ nome: termo, count: 5 });
    medicamentos = result.data;
    fonteUsada = "buscar_por_nome";
  } catch {
    try {
      const result = await repository.searchByPrincipalAtivo({ principioAtivo: termo, count: 5 });
      medicamentos = result.data;
      fonteUsada = "buscar_por_principio_ativo";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Não foi possível localizar medicamentos para o termo "${termo}": ${message}${DISCLAIMER}`,
          },
        },
      ];
    }
  }

  if (medicamentos.length === 0) {
    return [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Nenhum medicamento encontrado para o termo "${termo}" no Bulário ANVISA.${DISCLAIMER}`,
        },
      },
    ];
  }

  const sections: string[] = [
    `## Medicamentos encontrados para "${termo}" (via ${fonteUsada})`,
    `Total de resultados: ${medicamentos.length}`,
  ];

  for (const med of medicamentos) {
    const linhas = [
      `\n### ${med.nomeProduto}`,
      `- **Empresa:** ${med.empresa}`,
      `- **Nº Processo ANVISA:** ${med.numProcesso}`,
    ];
    if (med.dataAtualizacao) linhas.push(`- **Última atualização:** ${med.dataAtualizacao}`);

    if (incluir_apresentacoes && med.numProcesso) {
      try {
        const ap = await repository.getApresentacoes(med.numProcesso);
        if (ap.data.length > 0) {
          linhas.push(`- **Apresentações (${ap.data.length}):**`);
          for (const a of ap.data.slice(0, 5)) {
            linhas.push(`  - ${a.descricao}`);
          }
          if (ap.data.length > 5) linhas.push(`  - ... (+${ap.data.length - 5} apresentações)`);
        }
      } catch {
        linhas.push(`- **Apresentações:** não disponível`);
      }
    }

    if (incluir_bula && med.idBulaPacienteProtegido) {
      try {
        const bula = await repository.getBulaLink(med.idBulaPacienteProtegido);
        if (bula.data.urlPdf) {
          linhas.push(`- **Bula (paciente):** ${bula.data.urlPdf}`);
        }
      } catch {
        linhas.push(`- **Bula:** não disponível`);
      }
    }

    sections.push(linhas.join("\n"));
  }

  sections.push(DISCLAIMER);

  return [
    {
      role: "user",
      content: { type: "text", text: `Verificar medicamento: ${termo}` },
    },
    {
      role: "assistant",
      content: { type: "text", text: sections.join("\n") },
    },
  ];
}

export async function handleCompararTarjasPorClasse(
  input: CompararTarjasPorClasseInputType,
  repository: IBularioRepository
): Promise<Array<{ role: "user" | "assistant"; content: { type: "text"; text: string } }>> {
  const { classe_terapeutica, limite } = input;

  let medicamentos: MedicamentoResumo[] = [];

  try {
    const result = await repository.searchByClasseTerapeutica({
      classeTerapeutica: classe_terapeutica,
      count: limite,
    });
    medicamentos = result.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Erro ao buscar classe terapêutica "${classe_terapeutica}": ${message}${DISCLAIMER}`,
        },
      },
    ];
  }

  const grupos: Record<string, string[]> = {
    LIVRE: [],
    VERMELHA: [],
    PRETA: [],
    DESCONHECIDA: [],
  };

  for (const med of medicamentos) {
    if (med.numProcesso) {
      try {
        const det = await repository.getDetalhes(med.numProcesso);
        const tarja = (det.data as { tarja?: string }).tarja ?? "DESCONHECIDA";
        const grupo = tarja in grupos ? tarja : "DESCONHECIDA";
        grupos[grupo].push(med.nomeProduto);
      } catch {
        grupos.DESCONHECIDA.push(med.nomeProduto);
      }
    }
  }

  const total = medicamentos.length;
  const lines = [
    `## Classe Terapêutica: ${classe_terapeutica}`,
    `**Total analisado:** ${total} medicamento(s)`,
    "",
    `- **Sem Tarja (Venda Livre):** ${grupos.LIVRE.length}`,
    `- **Tarja Amarela (controle leve/antibióticos):** — *não categorizado pelo Bulário ANVISA*`,
    `- **Tarja Vermelha (prescrição obrigatória):** ${grupos.VERMELHA.length}`,
    `- **Tarja Preta (controle especial — Portaria 344/98):** ${grupos.PRETA.length}`,
    `- **Não categorizado:** ${grupos.DESCONHECIDA.length}`,
  ];

  if (grupos.PRETA.length > 0) {
    lines.push(
      "",
      `⚠️ **Tarja Preta identificados (${grupos.PRETA.length}):** ${grupos.PRETA.slice(0, 10).join(", ")}`
    );
  }

  lines.push(DISCLAIMER);

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Comparar tarjas para classe terapêutica: ${classe_terapeutica}`,
      },
    },
    {
      role: "assistant",
      content: { type: "text", text: lines.join("\n") },
    },
  ];
}

export async function handleAnalisarApresentacoes(
  input: AnalisarApresentacoesInputType,
  repository: IBularioRepository
): Promise<Array<{ role: "user" | "assistant"; content: { type: "text"; text: string } }>> {
  const { nome_medicamento, agrupar_por } = input;

  let medicamentos: MedicamentoResumo[] = [];

  try {
    const result = await repository.searchByName({ nome: nome_medicamento, count: 10 });
    medicamentos = result.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Erro ao buscar "${nome_medicamento}": ${message}${DISCLAIMER}`,
        },
      },
    ];
  }

  if (medicamentos.length === 0) {
    return [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Nenhum medicamento encontrado para "${nome_medicamento}".${DISCLAIMER}`,
        },
      },
    ];
  }

  const agrupado: Record<string, string[]> = {};

  for (const med of medicamentos.slice(0, 5)) {
    if (!med.numProcesso) continue;
    try {
      const apResult = await repository.getApresentacoes(med.numProcesso);
      for (const ap of apResult.data) {
        let chave = "Outros";
        const desc = ap.descricao ?? "";

        if (agrupar_por === "concentracao") {
          const match = desc.match(/\d+[\s,.]?\d*\s*(mg|mcg|g|ml|%|UI|mEq)/i);
          chave = match ? match[0].trim() : "Concentração não identificada";
        } else if (agrupar_por === "forma_farmaceutica") {
          const formas = [
            "comprimido",
            "cápsula",
            "xarope",
            "solução",
            "injetável",
            "pomada",
            "gel",
            "spray",
            "supositório",
            "adesivo",
          ];
          const forma = formas.find((f) => desc.toLowerCase().includes(f));
          chave = forma ? forma.charAt(0).toUpperCase() + forma.slice(1) : "Forma não identificada";
        } else if (agrupar_por === "fabricante") {
          chave = med.empresa ?? "Fabricante desconhecido";
        }

        if (!agrupado[chave]) agrupado[chave] = [];
        agrupado[chave].push(`${med.nomeProduto} — ${desc}`);
      }
    } catch {
      // ignora erros individuais de apresentações
    }
  }

  const totalApresentacoes = Object.values(agrupado).flat().length;
  const lines = [
    `## Apresentações de "${nome_medicamento}" agrupadas por ${agrupar_por}`,
    `**Total de apresentações analisadas:** ${totalApresentacoes}`,
    "",
  ];

  for (const [grupo, items] of Object.entries(agrupado).sort()) {
    lines.push(`### ${grupo} (${items.length})`);
    for (const item of items.slice(0, 5)) {
      lines.push(`- ${item}`);
    }
    if (items.length > 5) lines.push(`- ... (+${items.length - 5} itens)`);
    lines.push("");
  }

  lines.push(DISCLAIMER);

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Analisar apresentações de ${nome_medicamento} agrupando por ${agrupar_por}`,
      },
    },
    {
      role: "assistant",
      content: { type: "text", text: lines.join("\n") },
    },
  ];
}
