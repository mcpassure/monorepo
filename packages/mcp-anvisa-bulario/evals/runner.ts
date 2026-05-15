import { FixtureSource } from "../integration-tests/setup/fixture-source.js";
import { BularioRepository } from "../src/domain/repository.js";
import { buildServer, callTool, QUESTIONS } from "./questions.js";

async function runEvals(): Promise<void> {
  // v2.0: use FixtureSource instead of live API (evals are for regression, not E2E)
  const source = new FixtureSource();
  const repository = new BularioRepository(source);
  const server = buildServer(repository);

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  process.stdout.write(
    `\n=== MCPAssure ANVISA Bulário — Evals (${QUESTIONS.length} questions) ===\n\n`
  );

  for (const q of QUESTIONS) {
    try {
      const result = await callTool(server, q.tool, q.input);
      const ok = q.validate(result);

      if (ok) {
        process.stdout.write(`  ✓ [${q.id}] ${q.description}\n`);
        passed++;
      } else {
        process.stdout.write(`  ✗ [${q.id}] ${q.description}\n`);
        process.stdout.write(`      Result: ${JSON.stringify(result, null, 2).slice(0, 300)}\n`);
        failed++;
        failures.push(q.id);
      }
    } catch (err) {
      process.stdout.write(
        `  ✗ [${q.id}] ${q.description} — THREW: ${err instanceof Error ? err.message : String(err)}\n`
      );
      failed++;
      failures.push(q.id);
    }
  }

  process.stdout.write(`\n=== Results: ${passed}/${QUESTIONS.length} passed ===\n`);

  if (failed > 0) {
    process.stdout.write(`Failed: ${failures.join(", ")}\n`);
    process.exit(1);
  }
}

runEvals().catch((err: unknown) => {
  process.stderr.write(`Eval runner error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
