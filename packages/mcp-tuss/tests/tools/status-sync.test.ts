import { describe, expect, it } from "vitest";
import { statusSyncHandler } from "../../src/tools/status-sync.js";
import { createEmptyDb, createRepo, createSeededDb } from "../helpers.js";

describe("status_sincronizacao_tuss", () => {
  it("retorna status com dados quando DB preenchido", () => {
    const repo = createRepo(createSeededDb());
    const result = statusSyncHandler({}, repo);
    const data = result.data as {
      tuss22: { versao: string | null; total_registros: number };
      tuss20: { versao: string | null; total_registros: number };
      tuss18: { versao: string | null; total_registros: number };
      cache_vazio: boolean;
    };

    expect(data.tuss22.versao).toBe("202603");
    expect(data.tuss22.total_registros).toBeGreaterThan(0);
    expect(data.tuss20.total_registros).toBeGreaterThan(0);
    expect(data.tuss18.total_registros).toBeGreaterThan(0);
    expect(data.cache_vazio).toBe(false);
  });

  it("retorna cache_vazio true quando DB está vazio", () => {
    const repo = createRepo(createEmptyDb());
    const result = statusSyncHandler({}, repo);
    const data = result.data as { cache_vazio: boolean };
    expect(data.cache_vazio).toBe(true);
  });

  it("_meta é um array com 3 entradas (22, 20, 18)", () => {
    const repo = createRepo(createSeededDb());
    const result = statusSyncHandler({}, repo);
    expect(Array.isArray(result._meta)).toBe(true);
    expect(result._meta).toHaveLength(3);
  });

  it("cada _meta tem campos obrigatórios", () => {
    const repo = createRepo(createSeededDb());
    const result = statusSyncHandler({}, repo);
    for (const m of result._meta as Array<Record<string, unknown>>) {
      expect(m.modo).toBeDefined();
      expect(m.fonte).toBeTruthy();
      expect(typeof m.defasagem_dias).toBe("number");
    }
  });

  it("inclui disclaimer em toda resposta", () => {
    const repo = createRepo(createSeededDb());
    const result = statusSyncHandler({}, repo);
    expect(result.disclaimer).toBeTruthy();
    expect((result.disclaimer as string).length).toBeGreaterThan(50);
  });
});
