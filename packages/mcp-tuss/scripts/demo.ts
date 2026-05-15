import { getDb } from "../src/db/connection.js";
import { analisarCompatibilidadeCodigosHandler } from "../src/prompts/handlers.js";
import { TussRepository } from "../src/repositories/tuss.repository.js";
import { buscarMedicamentoHandler } from "../src/tools/buscar-medicamento.js";
import { buscarProcedimentoHandler } from "../src/tools/buscar-procedimento.js";
import { statusSyncHandler } from "../src/tools/status-sync.js";

// ANSI helpers (no extra dep)
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
};

function banner(title: string) {
  console.log(`\n${c.bold}${c.cyan}━━━ ${title} ━━━${c.reset}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`${c.bold}${c.green}@mcpassure/mcp-tuss — Demo${c.reset}`);
  console.log(
    `${c.gray}Consultando tabelas TUSS oficiais da ANS via cache local SQLite${c.reset}\n`
  );

  const db = getDb();
  const repo = new TussRepository(db);

  // 1. buscar_procedimento_tuss por código
  banner("buscar_procedimento_tuss — código 30602165");
  const r1 = buscarProcedimentoHandler({ codigo: "30602165", limit: 5 }, repo);
  console.log(JSON.stringify(r1, null, 2));
  await sleep(1500);

  // 2. buscar_medicamento_tuss por termo
  banner('buscar_medicamento_tuss — query "paracetamol"');
  const r2 = buscarMedicamentoHandler({ query: "paracetamol", limit: 5 }, repo);
  console.log(JSON.stringify(r2, null, 2));
  await sleep(1500);

  // 3. analisar_compatibilidade_codigos (prompt) — mix de válido e inválido
  banner("analisar_compatibilidade_codigos — 30602165,00000000,90010012");
  const r3 = analisarCompatibilidadeCodigosHandler({ codigos: "30602165,00000000,90010012" }, repo);
  const text3 = (r3.messages[0].content as { type: "text"; text: string }).text;
  console.log(text3);
  await sleep(1500);

  // 4. status_sincronizacao_tuss
  banner("status_sincronizacao_tuss");
  const r4 = statusSyncHandler({}, repo);
  console.log(JSON.stringify(r4, null, 2));

  console.log(`\n${c.bold}${c.green}✔ Demo concluído${c.reset}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
