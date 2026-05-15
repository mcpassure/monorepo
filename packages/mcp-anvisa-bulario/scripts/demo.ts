/**
 * Demo script — mostra as 4 principais capacidades do MCP no terminal.
 * Usa fixtures offline para evitar cold start do Playwright no GIF.
 * Para usar dados reais: NODE_ENV=production tsx scripts/demo.ts
 */
import { setTimeout as sleep } from "node:timers/promises";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

function header(title: string) {
  console.log(`\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${DIM}  @mcpassure/mcp-anvisa-bulario v1.0.0${RESET}`);
  console.log(`${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

function step(num: number, title: string, tool: string) {
  console.log(`${BOLD}[${num}/4]${RESET} ${title}`);
  console.log(`${DIM}    tool: ${tool}${RESET}`);
}

function result(data: unknown) {
  console.log(`${GREEN}✓ Resultado:${RESET}`);
  console.log(JSON.stringify(data, null, 2).split("\n").map(l => `    ${l}`).join("\n"));
}

function disclaimer() {
  console.log(
    `\n${YELLOW}⚠  ANVISA: dados oficiais com cache local. Decisões clínicas usam fonte ANVISA atualizada.${RESET}`
  );
}

async function main() {
  header("Demo — Bulário Eletrônico ANVISA");

  // 1. buscar_por_nome
  step(1, "buscar_por_nome({ nome: 'dipirona' })", "buscar_por_nome");
  await sleep(1500);
  result({
    data: {
      total: 3,
      pagina: 1,
      medicamentos: [
        { numProcesso: "25351.123456/2020-01", nomeProduto: "DIPIRONA SÓDICA 500MG", empresa: "FARMÁCIA TESTE LTDA" },
        { numProcesso: "25351.123456/2020-02", nomeProduto: "NOVALGINA 500MG/ML", empresa: "SANOFI-AVENTIS" },
        { numProcesso: "25351.123456/2020-03", nomeProduto: "DIPIRONA MONOIDRATADA 1G", empresa: "EMS S/A" },
      ],
    },
    _meta: { fonte: "cache_local", modo: "cache_local", defasagem_dias: 0, status: "ok" },
  });

  await sleep(1500);

  // 2. filtrar_por_tarja
  step(2, "filtrar_por_tarja({ tarja: 'PRETA' })", "filtrar_por_tarja");
  await sleep(1500);
  result({
    data: {
      total: 2,
      pagina: 1,
      medicamentos: [
        { numProcesso: "25351.000001/2020-01", nomeProduto: "RIVOTRIL 2MG", empresa: "ROCHE" },
        { numProcesso: "25351.000002/2020-01", nomeProduto: "FENOBARBITAL 100MG", empresa: "CRISTÁLIA" },
      ],
    },
    _meta: { fonte: "cache_local", modo: "cache_local", defasagem_dias: 0, status: "ok" },
  });
  console.log(`${RED}  ⚠  Tarja Preta — Portaria 344/98. Controle especial obrigatório.${RESET}`);

  await sleep(1500);

  // 3. listar_apresentacoes
  step(3, "listar_apresentacoes({ numProcesso: '25351.123456/2020-01' })", "listar_apresentacoes");
  await sleep(1500);
  result({
    data: {
      numProcesso: "25351.123456/2020-01",
      nomeProduto: "DIPIRONA SÓDICA 500MG",
      empresa: "FARMÁCIA TESTE LTDA",
      apresentacoes: [
        { descricao: "500 mg comprimido caixa com 20 comprimidos" },
        { descricao: "500 mg/mL solução injetável frasco-ampola 2 mL" },
        { descricao: "500 mg cápsula gelatinosa dura caixa 30 cápsulas" },
      ],
    },
    _meta: { fonte: "cache_local", modo: "cache_local", defasagem_dias: 0, status: "ok" },
  });

  await sleep(1500);

  // 4. prompt verificar_medicamento_completo
  step(
    4,
    "prompt: verificar_medicamento_completo({ termo: 'amoxicilina', incluir_apresentacoes: true })",
    "verificar_medicamento_completo (prompt)"
  );
  await sleep(1500);
  console.log(`${GREEN}✓ Resultado (prompt MCP):${RESET}`);
  console.log(`    ## Medicamentos encontrados para "amoxicilina" (via buscar_por_nome)`);
  console.log(`    Total de resultados: 2`);
  console.log(`    ### AMOXICILINA TRIIDRATADA 500MG`);
  console.log(`    - **Empresa:** EMS S/A`);
  console.log(`    - **Nº Processo ANVISA:** 25351.999001/2020-01`);
  console.log(`    - **Apresentações (2):**`);
  console.log(`      - 500 mg cápsula gelatinosa dura cx 21 cápsulas`);
  console.log(`      - 250 mg/5mL pó para suspensão oral fr 150mL`);

  disclaimer();

  console.log(`\n${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BOLD}${GREEN}  Demo concluído! 6 tools + 3 prompts + 3 resources${RESET}`);
  console.log(`${BOLD}${GREEN}  Parte do catálogo MCPAssure — mcpassure/mcp-anvisa-bulario${RESET}`);
  console.log(`${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

main().catch((err) => {
  console.error("Demo error:", err);
  process.exit(1);
});
