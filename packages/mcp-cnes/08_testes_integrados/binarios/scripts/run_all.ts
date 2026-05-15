// Executa a suíte de testes integrados do MCP CNES e gera relatório em
// 08_testes_integrados/resultados/run_<TIMESTAMP>/relatorio.md
//
// Uso: npx tsx 08_testes_integrados/binarios/scripts/run_all.ts
//
// Requisitos: node_modules instalados (npm install)
// Sem dependências de rede, FTP ou blast CLI.

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RESULTS_BASE = join(ROOT, "08_testes_integrados", "resultados");

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function runSuite(): { output: string; exitCode: number; durationMs: number } {
  const t0 = Date.now();
  try {
    const output = execSync("npm run test:integration", {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { output, exitCode: 0, durationMs: Date.now() - t0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      output: (e.stdout ?? "") + (e.stderr ?? ""),
      exitCode: e.status ?? 1,
      durationMs: Date.now() - t0,
    };
  }
}

function parseResults(output: string): {
  pass: number;
  fail: number;
  skip: number;
  total: number;
  durationStr: string;
} {
  const m = output.match(/(\d+) passaram.*?(\d+) falharam.*?(\d+) pulados.*?(\d+)\).*?—\s*(\d+ms)/);
  if (m) {
    return {
      pass: Number(m[1]),
      fail: Number(m[2]),
      skip: Number(m[3]),
      total: Number(m[4]),
      durationStr: m[5],
    };
  }
  return { pass: 0, fail: 0, skip: 0, total: 0, durationStr: "?" };
}

function generateReport(
  runDir: string,
  output: string,
  stats: ReturnType<typeof parseResults>,
  exitCode: number,
  durationMs: number
): void {
  const date = new Date().toISOString().replace("T", " ").slice(0, 19);
  const status = exitCode === 0 && stats.fail === 0 ? "✅ TODOS PASSARAM" : "❌ FALHAS DETECTADAS";

  const report = `# Relatório de Testes Integrados — MCP CNES

**Data:** ${date}
**Run:** ${runDir.split("/").pop() ?? runDir.split("\\").pop()}
**Duração total:** ${durationMs}ms

---

## Resultado: ${status}

| Métrica | Valor |
|---|---|
| Total | ${stats.total} |
| PASS | ${stats.pass} |
| FAIL | ${stats.fail} |
| SKIP | ${stats.skip} |
| Duração (suíte) | ${stats.durationStr} |
| Duração (run_all) | ${durationMs}ms |

---

## Ambiente

| Item | Valor |
|---|---|
| MCPASSURE_FTP_MOCK | ${process.env.MCPASSURE_FTP_MOCK ?? process.env.VETRUM_FTP_MOCK ?? "não definido (auto-detectado pela suíte)"} |
| FTP real | detectado automaticamente pela suíte t04 |
| blast CLI | fake blast criado automaticamente pela suíte t04 |
| API TCU | mock HTTP local criado automaticamente pela suíte t03 |
| SQLite | in-memory (seed 6 hospitais) |

---

## Saída completa da suíte

\`\`\`
${output.slice(-8000)}
\`\`\`

---

## Links

- Plano: [08_testes_integrados/plano.md](../../plano.md)
- Fixtures: [08_testes_integrados/binarios/fixtures/](../fixtures/)
- Script: [08_testes_integrados/binarios/scripts/run_all.ts](run_all.ts)
`;

  mkdirSync(join(runDir, "logs"), { recursive: true });
  writeFileSync(join(runDir, "relatorio.md"), report, "utf-8");
  writeFileSync(join(runDir, "logs", "suite_output.log"), output, "utf-8");
  console.log(`\n📊 Relatório gerado em: ${runDir}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const ts = timestamp();
const runDir = join(RESULTS_BASE, `run_${ts}`);
mkdirSync(runDir, { recursive: true });

console.log("🧪 MCP CNES — Testes Integrados (Etapa 8)");
console.log(`📁 Run: ${runDir}\n`);

const { output, exitCode, durationMs } = runSuite();
const stats = parseResults(output);

process.stdout.write(output);

generateReport(runDir, output, stats, exitCode, durationMs);

// Copiar para "latest"
const latestDir = join(RESULTS_BASE, "latest");
mkdirSync(latestDir, { recursive: true });
try {
  const report = readFileSync(join(runDir, "relatorio.md"), "utf-8");
  writeFileSync(join(latestDir, "relatorio.md"), report, "utf-8");
} catch { /* ok */ }

console.log(`\n${exitCode === 0 && stats.fail === 0 ? "✅" : "❌"} ${stats.pass}/${stats.total} passaram — ${stats.fail} falhas — ${stats.skip} pulados`);

process.exit(exitCode);
