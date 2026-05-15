import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const RESULTS_DIR = path.resolve(__dirname, "..", "..", "results");

export interface CasoTeste {
  id: string;
  descricao: string;
  input: unknown;
  output: unknown;
  resultado: "PASS" | "FAIL" | "SKIP" | "ERROR";
  erro?: string;
  duracao_ms: number;
}

export interface SuiteResult {
  suite: string;
  descricao: string;
  executado_em: string;
  total: number;
  passou: number;
  falhou: number;
  skiped: number;
  duracao_total_ms: number;
  casos: CasoTeste[];
}

export function criarSuite(nome: string, descricao: string): SuiteResult {
  return {
    suite: nome,
    descricao,
    executado_em: new Date().toISOString(),
    total: 0,
    passou: 0,
    falhou: 0,
    skiped: 0,
    duracao_total_ms: 0,
    casos: [],
  };
}

export function adicionarCaso(suite: SuiteResult, caso: CasoTeste): void {
  suite.casos.push(caso);
  suite.total++;
  suite.duracao_total_ms += caso.duracao_ms;
  if (caso.resultado === "PASS") suite.passou++;
  else if (caso.resultado === "SKIP") suite.skiped++;
  else suite.falhou++;
}

export async function executarCaso(
  suite: SuiteResult,
  id: string,
  descricao: string,
  input: unknown,
  fn: () => unknown | Promise<unknown>
): Promise<void> {
  const inicio = Date.now();
  let output: unknown = null;
  let resultado: CasoTeste["resultado"] = "PASS";
  let erro: string | undefined;

  try {
    output = await fn();
  } catch (err) {
    resultado = "ERROR";
    erro = err instanceof Error ? err.message : String(err);
    output = null;
  }

  adicionarCaso(suite, {
    id,
    descricao,
    input,
    output,
    resultado,
    erro,
    duracao_ms: Date.now() - inicio,
  });
}

export function falhar(
  suite: SuiteResult,
  id: string,
  descricao: string,
  input: unknown,
  motivo: string,
  duracao_ms = 0
): void {
  adicionarCaso(suite, {
    id,
    descricao,
    input,
    output: null,
    resultado: "FAIL",
    erro: motivo,
    duracao_ms,
  });
}

export function assert(
  condicao: boolean,
  mensagem: string
): void {
  if (!condicao) throw new Error(`Assertion falhou: ${mensagem}`);
}

export function assertIgual<T>(real: T, esperado: T, campo: string): void {
  if (real !== esperado) {
    throw new Error(`${campo}: esperado ${JSON.stringify(esperado)}, recebido ${JSON.stringify(real)}`);
  }
}

export function salvarSuite(suite: SuiteResult): string {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const arquivo = path.join(RESULTS_DIR, `${suite.suite}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(suite, null, 2), "utf-8");
  return arquivo;
}

export function imprimirResumo(suite: SuiteResult): void {
  const status = suite.falhou === 0 ? "✅ PASSOU" : "❌ FALHOU";
  console.log(`\n${"─".repeat(60)}`);
  console.log(`${status}  ${suite.suite} — ${suite.descricao}`);
  console.log(`  Total: ${suite.total} | Passou: ${suite.passou} | Falhou: ${suite.falhou} | Pulou: ${suite.skiped}`);
  console.log(`  Duração: ${suite.duracao_total_ms}ms`);

  const falhas = suite.casos.filter((c) => c.resultado !== "PASS" && c.resultado !== "SKIP");
  if (falhas.length > 0) {
    console.log("  Falhas:");
    for (const f of falhas) {
      console.log(`    [${f.id}] ${f.descricao}`);
      if (f.erro) console.log(`      → ${f.erro}`);
    }
  }
}

export function gerarRelatorioFinal(suites: SuiteResult[]): void {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const totalGlobal = suites.reduce((s, r) => s + r.total, 0);
  const passouGlobal = suites.reduce((s, r) => s + r.passou, 0);
  const falhouGlobal = suites.reduce((s, r) => s + r.falhou, 0);
  const duracaoGlobal = suites.reduce((s, r) => s + r.duracao_total_ms, 0);

  const relatorio = {
    gerado_em: new Date().toISOString(),
    resumo: {
      total: totalGlobal,
      passou: passouGlobal,
      falhou: falhouGlobal,
      taxa_sucesso: totalGlobal > 0 ? `${((passouGlobal / totalGlobal) * 100).toFixed(1)}%` : "N/A",
      duracao_total_ms: duracaoGlobal,
    },
    suites: suites.map((s) => ({
      suite: s.suite,
      descricao: s.descricao,
      total: s.total,
      passou: s.passou,
      falhou: s.falhou,
      duracao_ms: s.duracao_total_ms,
      status: s.falhou === 0 ? "PASS" : "FAIL",
    })),
  };

  // JSON
  fs.writeFileSync(
    path.join(RESULTS_DIR, "relatorio-final.json"),
    JSON.stringify(relatorio, null, 2),
    "utf-8"
  );

  // Texto legível
  const linhas: string[] = [
    "═══════════════════════════════════════════════════════════",
    "  RELATÓRIO DE TESTES INTEGRADOS — vetrum-tuss-mcp",
    `  Gerado em: ${relatorio.gerado_em}`,
    "═══════════════════════════════════════════════════════════",
    "",
    `  RESUMO GLOBAL`,
    `  ─────────────`,
    `  Total de casos : ${totalGlobal}`,
    `  Passou         : ${passouGlobal}`,
    `  Falhou         : ${falhouGlobal}`,
    `  Taxa de sucesso: ${relatorio.resumo.taxa_sucesso}`,
    `  Duração total  : ${duracaoGlobal}ms`,
    "",
    "  SUITES",
    "  ──────",
  ];

  for (const s of relatorio.suites) {
    const icone = s.status === "PASS" ? "✅" : "❌";
    linhas.push(`  ${icone} ${s.suite.padEnd(35)} ${s.passou}/${s.total} (${s.duracao_ms}ms)`);
  }

  linhas.push("");
  linhas.push("═══════════════════════════════════════════════════════════");

  const textoFinal = linhas.join("\n");
  fs.writeFileSync(path.join(RESULTS_DIR, "relatorio-final.txt"), textoFinal, "utf-8");

  console.log("\n" + textoFinal);
  console.log(`\nArquivos gerados em: ${RESULTS_DIR}`);
}
