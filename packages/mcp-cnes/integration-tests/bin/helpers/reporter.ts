import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type TestStatus = "pass" | "fail" | "skip" | "error";

export type TestResult = {
  id: string;
  name: string;
  suite: string;
  status: TestStatus;
  durationMs: number;
  error?: string;
  details?: unknown;
};

export class Reporter {
  readonly results: TestResult[] = [];
  private startTime = Date.now();

  pass(id: string, name: string, suite: string, durationMs: number, details?: unknown): void {
    this.results.push({ id, name, suite, status: "pass", durationMs, details });
    console.log(`  ✓ [${durationMs}ms] ${id}: ${name}`);
  }

  fail(
    id: string,
    name: string,
    suite: string,
    durationMs: number,
    error: string,
    details?: unknown
  ): void {
    this.results.push({ id, name, suite, status: "fail", durationMs, error, details });
    console.error(`  ✗ [${durationMs}ms] ${id}: ${name}`);
    console.error(`    → ${error}`);
  }

  skip(id: string, name: string, suite: string, reason: string): void {
    this.results.push({ id, name, suite, status: "skip", durationMs: 0, error: reason });
    console.log(`  ⊘ ${id}: ${name} — ${reason}`);
  }

  summary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.status === "pass").length;
    const failed = this.results.filter((r) => r.status === "fail").length;
    const skipped = this.results.filter((r) => r.status === "skip").length;
    const durationMs = Date.now() - this.startTime;
    return { total, passed, failed, skipped, durationMs };
  }

  write(dir: string): void {
    mkdirSync(dir, { recursive: true });
    const s = this.summary();

    writeFileSync(
      join(dir, "results.json"),
      JSON.stringify(
        { summary: s, timestamp: new Date().toISOString(), results: this.results },
        null,
        2
      )
    );

    const suites = [...new Set(this.results.map((r) => r.suite))];

    const lines: string[] = [
      "# Resultados dos Testes de Integração — MCP CNES",
      "",
      `**Data:** ${new Date().toLocaleString("pt-BR")}`,
      `**Duração total:** ${s.durationMs}ms`,
      "",
      "## Resumo",
      "",
      "| Total | Passaram | Falharam | Pulados |",
      "|-------|----------|----------|---------|",
      `| ${s.total} | ${s.passed} | ${s.failed} | ${s.skipped} |`,
      "",
      `**Resultado:** ${s.failed === 0 ? "✅ TODOS PASSARAM" : `❌ ${s.failed} FALHA(S)`}`,
      "",
      "## Detalhes por Suite",
      "",
    ];

    for (const suite of suites) {
      const sr = this.results.filter((r) => r.suite === suite);
      const sp = sr.filter((r) => r.status === "pass").length;
      const sf = sr.filter((r) => r.status === "fail").length;
      lines.push(`### ${suite} (${sp} passaram / ${sf} falharam / ${sr.length} total)`);
      lines.push("");
      lines.push("| ID | Nome | Status | Duração | Detalhe |");
      lines.push("|----|------|--------|---------|---------|");
      for (const r of sr) {
        const icon = r.status === "pass" ? "✓" : r.status === "skip" ? "⊘" : "✗";
        const errStr =
          r.status !== "pass" && r.error ? r.error.slice(0, 120).replace(/\n/g, " ") : "";
        lines.push(`| ${r.id} | ${r.name} | ${icon} ${r.status} | ${r.durationMs}ms | ${errStr} |`);
      }
      lines.push("");
    }

    writeFileSync(join(dir, "summary.md"), lines.join("\n"));
    console.log(`\n📊 Relatório salvo em: ${dir}`);
  }

  hasFailed(): boolean {
    return this.results.some((r) => r.status === "fail");
  }

  printSummary(): void {
    const s = this.summary();
    const icon = s.failed === 0 ? "✅" : "❌";
    console.log(
      `\n${icon} ${s.passed} passaram, ${s.failed} falharam, ${s.skipped} pulados (total ${s.total}) — ${s.durationMs}ms`
    );
  }
}
