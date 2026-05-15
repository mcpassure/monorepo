// Suite t03-cache-vazio (substituiu t03-fallback em v1.1.1)
//
// Histórico: até v1.1 inicial este teste validava o fallback REST API TCU.
// Em v1.1.1 o fallback foi removido (endpoint TCU quebrado upstream, ver
// src/fallback/client.ts header). Esta suite agora valida o comportamento
// correto quando o cache SQLite está vazio: as 8 tools devem retornar
// mensagem clara orientando o usuário a executar sync.

import Database from "better-sqlite3";
import { applySchema } from "../../../src/db/schema.js";
import { CnesRepository } from "../../../src/domain/repository.js";
import { CacheVazioError, buscarPorCodigoCnes, buscarPorNomeFallback } from "../../../src/fallback/client.js";
import { assertEqual, assertTrue } from "../helpers/assert.js";
import type { Reporter } from "../helpers/reporter.js";

const SUITE = "t03-cache-vazio";

async function run(
  id: string,
  name: string,
  fn: () => Promise<void>,
  reporter: Reporter
): Promise<void> {
  const t = Date.now();
  try {
    await fn();
    reporter.pass(id, name, SUITE, Date.now() - t);
  } catch (err) {
    reporter.fail(id, name, SUITE, Date.now() - t, String(err));
  }
}

function buildEmptyDb(): Database.Database {
  const db = new Database(":memory:");
  applySchema(db);
  return db;
}

export async function runCacheVazioTests(reporter: Reporter): Promise<void> {
  console.log("\n💾 Suite: Cache vazio (v1.1.1 — fallback online removido)");

  await run(
    "F01",
    "fallback/client.ts: buscarPorCodigoCnes lança CacheVazioError",
    async () => {
      let thrown: Error | null = null;
      try {
        await buscarPorCodigoCnes("2077485");
      } catch (err) {
        thrown = err as Error;
      }
      assertTrue(thrown !== null, "deveria ter lançado erro");
      assertTrue(
        thrown instanceof CacheVazioError,
        `esperado CacheVazioError, got ${thrown?.constructor.name}`
      );
      assertTrue(
        (thrown?.message ?? "").includes("sync"),
        "mensagem deve mencionar comando sync"
      );
    },
    reporter
  );

  await run(
    "F02",
    "fallback/client.ts: buscarPorNomeFallback lança CacheVazioError",
    async () => {
      let thrown: Error | null = null;
      try {
        await buscarPorNomeFallback("qualquer");
      } catch (err) {
        thrown = err as Error;
      }
      assertTrue(thrown !== null, "deveria ter lançado erro");
      assertTrue(thrown instanceof CacheVazioError);
    },
    reporter
  );

  await run(
    "F03",
    "Repository: buscarPorCodigoCnes retorna mensagem clara quando dataset vazio",
    async () => {
      const db = buildEmptyDb();
      const repo = new CnesRepository(() => db);
      const result = await repo.buscarPorCodigoCnes("2077485");
      assertEqual(result.data.encontrado, false);
      assertTrue(
        (result.data.mensagem ?? "").includes("sync"),
        `mensagem deve orientar sync, got: ${result.data.mensagem}`
      );
      assertEqual(result._meta.modo, "cache_vazio");
      assertEqual(result._meta.status, "empty");
      db.close();
    },
    reporter
  );

  await run(
    "F04",
    "Repository: buscarPorNome retorna aviso de sync quando dataset vazio",
    async () => {
      const db = buildEmptyDb();
      const repo = new CnesRepository(() => db);
      const result = await repo.buscarPorNome({ nome: "hospital", limit: 5 } as Parameters<
        typeof repo.buscarPorNome
      >[0]);
      assertEqual(result.data.total, 0);
      assertTrue(
        (result.data.aviso ?? "").includes("sync"),
        `aviso deve orientar sync, got: ${result.data.aviso}`
      );
      assertEqual(result._meta.modo, "cache_vazio");
      db.close();
    },
    reporter
  );

  await run(
    "F05",
    "Repository: listar_leitos retorna aviso específico de LT quando dataset vazio",
    async () => {
      const db = buildEmptyDb();
      const repo = new CnesRepository(() => db);
      const result = await repo.listarLeitos("2077485");
      assertEqual(result.data.total, 0);
      assertTrue(
        (result.data.aviso ?? "").includes("LT"),
        `aviso deve mencionar grupo LT, got: ${result.data.aviso}`
      );
      assertEqual(result._meta.modo, "cache_vazio");
      db.close();
    },
    reporter
  );

  await run(
    "F06",
    "Repository: listar_profissionais retorna aviso específico de PF quando dataset vazio",
    async () => {
      const db = buildEmptyDb();
      const repo = new CnesRepository(() => db);
      const result = await repo.listarProfissionais("2077485");
      assertEqual(result.data.total, 0);
      assertTrue(
        (result.data.aviso ?? "").includes("PF"),
        `aviso deve mencionar grupo PF, got: ${result.data.aviso}`
      );
      assertTrue(result.data.disclaimer.length > 0);
      assertEqual(result._meta.modo, "cache_vazio");
      db.close();
    },
    reporter
  );

  await run(
    "F07",
    "Todas as 8 tools propagam modo cache_vazio quando dataset vazio",
    async () => {
      const db = buildEmptyDb();
      const repo = new CnesRepository(() => db);
      const ops: Array<() => Promise<{ _meta: { modo: string } }>> = [
        () => repo.buscarPorCodigoCnes("2077485"),
        () =>
          repo.buscarPorNome({ nome: "hosp", limit: 5 } as Parameters<
            typeof repo.buscarPorNome
          >[0]),
        () =>
          repo.buscarPorMunicipio({ codigoIbge: "355030", limit: 5 } as Parameters<
            typeof repo.buscarPorMunicipio
          >[0]),
        () =>
          repo.buscarPorTipo({ tipo: "hospital", limit: 5 } as Parameters<
            typeof repo.buscarPorTipo
          >[0]),
        () => repo.listarProfissionais("2077485"),
        () => repo.listarLeitos("2077485"),
        () => repo.listarEquipamentos("2077485"),
        () => repo.listarServicos("2077485"),
      ];
      for (const op of ops) {
        const r = await op();
        assertEqual(r._meta.modo, "cache_vazio");
      }
      db.close();
    },
    reporter
  );
}
