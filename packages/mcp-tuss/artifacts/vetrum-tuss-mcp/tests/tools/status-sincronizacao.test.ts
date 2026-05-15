import { describe, it, expect, beforeAll } from "vitest";
import { createTestRepository } from "../fixtures.js";
import type { ITerminologiaRepository } from "../../src/domain/repository.js";
import { handler, inputSchema } from "../../src/tools/status-sincronizacao.js";
import { CBHPM_EDICAO } from "../../src/constants.js";

let repo: ITerminologiaRepository;

beforeAll(() => {
  repo = createTestRepository();
});

describe("status-sincronizacao", () => {
  it("retorna cbhpm_edicao correto", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    const data = result.structuredContent.data as { cbhpm_edicao: string };
    expect(data.cbhpm_edicao).toBe(CBHPM_EDICAO);
  });

  it("retorna tuss_versao correto", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    const data = result.structuredContent.data as { tuss_versao: string };
    expect(data.tuss_versao).toBe("202501");
  });

  it("retorna rol_versao referenciando RN correta", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    const data = result.structuredContent.data as { rol_versao: string };
    expect(data.rol_versao).toContain("RN 654/2025");
  });

  it("retorna ultima_sincronizacao não-nula", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    const data = result.structuredContent.data as { ultima_sincronizacao: string | null };
    expect(data.ultima_sincronizacao).toBeTruthy();
  });

  it("retorna data da última sincronização no content text", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    expect(result.content[0].text).toContain("sincronizado em:");
    expect(result.content[0].text).not.toContain("nunca");
  });

  it("inclui disclaimer", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    expect(result.structuredContent.disclaimer).toBeTruthy();
  });

  it("retorna _meta com 3 terminologias [TUSS, Rol ANS, CBHPM]", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as Array<{ terminologia: string }>;
    expect(Array.isArray(meta)).toBe(true);
    expect(meta.length).toBe(3);
    expect(meta[0].terminologia).toBe("TUSS");
    expect(meta[1].terminologia).toBe("Rol ANS");
    expect(meta[2].terminologia).toBe("CBHPM");
  });

  it("_meta items têm defasagem_dias como número ≥ 0", () => {
    const input = inputSchema.parse({});
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as Array<{ defasagem_dias: number }>;
    for (const m of meta) {
      expect(typeof m.defasagem_dias).toBe("number");
      expect(m.defasagem_dias).toBeGreaterThanOrEqual(0);
    }
  });

  it("aceita input vazio", () => {
    expect(() => inputSchema.parse({})).not.toThrow();
    expect(() => inputSchema.parse(undefined)).not.toThrow();
  });
});
