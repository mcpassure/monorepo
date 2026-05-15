import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { DISCLAIMER } from "../constants.js";
import type { TussRepository } from "../repositories/tuss.repository.js";

function textMessage(text: string): GetPromptResult {
  return { messages: [{ role: "user", content: { type: "text", text } }] };
}

export function verificarCodigoTussHandler(
  args: { codigo: string; tabela?: string },
  repo: TussRepository
): GetPromptResult {
  const { codigo, tabela } = args;
  const syncStatus = repo.getSyncStatus();
  const lastSync =
    syncStatus.tuss22.synced_at ??
    syncStatus.tuss20.synced_at ??
    syncStatus.tuss18.synced_at ??
    "desconhecida";

  const results: string[] = [];

  const checkProcedimento = () => {
    const item = repo.buscarProcedimentoPorCodigo(codigo);
    if (item) {
      results.push(
        `Código ${item.codigo} (Tabela 22 — Procedimentos): ${item.termo}. Vigência: ${item.data_inicio ?? "—"} até ${item.data_fim ?? "atual"}.`
      );
    }
  };

  const checkMedicamento = () => {
    const item = repo.buscarMedicamentoPorCodigo(codigo);
    if (item) {
      results.push(
        `Código ${item.codigo} (Tabela 20 — Medicamentos): ${item.termo}. Vigência: ${item.data_inicio ?? "—"} até ${item.data_fim ?? "atual"}.`
      );
    }
  };

  const checkDiaria = () => {
    const item = repo.buscarDiariaPorCodigo(codigo);
    if (item) {
      results.push(
        `Código ${item.codigo} (Tabela 18 — Diárias/Taxas): ${item.termo}. Vigência: ${item.data_inicio ?? "—"} até ${item.data_fim ?? "atual"}.`
      );
    }
  };

  if (tabela === "22") {
    checkProcedimento();
  } else if (tabela === "20") {
    checkMedicamento();
  } else if (tabela === "18") {
    checkDiaria();
  } else {
    checkProcedimento();
    checkMedicamento();
    checkDiaria();
  }

  const text =
    results.length > 0
      ? `${results.join("\n")}\n\n${DISCLAIMER}`
      : `Código ${codigo} não localizado em nenhuma tabela TUSS sincronizada. Última atualização local: ${lastSync}.\n\n${DISCLAIMER}`;

  return textMessage(text);
}

export function mapearCategoriaProcedimentosHandler(
  args: { termo: string; limite?: string },
  repo: TussRepository
): GetPromptResult {
  const limite = Math.min(50, Math.max(1, parseInt(args.limite ?? "20", 10) || 20));
  const termo = args.termo.trim();

  const procedimentos = repo.buscarProcedimentos(termo, limite);
  const medicamentos = repo.buscarMedicamentos(termo, limite);
  const diarias = repo.buscarDiarias(termo, limite);

  const total = procedimentos.length + medicamentos.length + diarias.length;

  const formatList = (items: Array<{ codigo: string; termo: string }>) =>
    items.map((i) => `  • ${i.codigo} — ${i.termo}`).join("\n");

  const lines: string[] = [`Resultados para "${termo}" (total: ${total}):\n`];

  if (procedimentos.length > 0) {
    lines.push(`**Tabela 22 — Procedimentos (${procedimentos.length}):**`);
    lines.push(formatList(procedimentos));
  }
  if (medicamentos.length > 0) {
    lines.push(`**Tabela 20 — Medicamentos (${medicamentos.length}):**`);
    lines.push(formatList(medicamentos));
  }
  if (diarias.length > 0) {
    lines.push(`**Tabela 18 — Diárias/Taxas (${diarias.length}):**`);
    lines.push(formatList(diarias));
  }
  if (total === 0) {
    lines.push(`Nenhum resultado encontrado para "${termo}".`);
  }

  lines.push(`\n${DISCLAIMER}`);
  return textMessage(lines.join("\n"));
}

export function analisarCompatibilidadeCodigosHandler(
  args: { codigos: string },
  repo: TussRepository
): GetPromptResult {
  const lista = args.codigos
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .slice(0, 20);

  const linhas: string[] = [`Análise de compatibilidade — ${lista.length} código(s):\n`];

  const orfaos: string[] = [];

  for (const codigo of lista) {
    const found: string[] = [];

    const p = repo.buscarProcedimentoPorCodigo(codigo);
    if (p) found.push(`Tab. 22 (Procedimentos): ${p.termo}`);

    const m = repo.buscarMedicamentoPorCodigo(codigo);
    if (m) found.push(`Tab. 20 (Medicamentos): ${m.termo}`);

    const d = repo.buscarDiariaPorCodigo(codigo);
    if (d) found.push(`Tab. 18 (Diárias/Taxas): ${d.termo}`);

    if (found.length > 0) {
      linhas.push(`✅ ${codigo}:`);
      for (const f of found) linhas.push(`   ${f}`);
    } else {
      orfaos.push(codigo);
      linhas.push(`❌ ${codigo}: não localizado em nenhuma tabela TUSS sincronizada`);
    }
  }

  if (orfaos.length > 0) {
    linhas.push(`\nCódigos órfãos (${orfaos.length}): ${orfaos.join(", ")}`);
  }

  linhas.push(`\n${DISCLAIMER}`);
  return textMessage(linhas.join("\n"));
}
