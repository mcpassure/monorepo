import { describe, it, expect, beforeAll } from "vitest";
import { createTestRepository } from "../fixtures.js";
import type { ITerminologiaRepository } from "../../src/domain/repository.js";

let repo: ITerminologiaRepository;

beforeAll(() => {
  repo = createTestRepository();
});

describe("TerminologiaRepository", () => {
  it("buscarPorCodigo retorna _meta array com 3 entradas para Tab. 22 com cobertura", () => {
    const result = repo.buscarPorCodigo("10101012");
    expect(Array.isArray(result._meta)).toBe(true);
    expect(result._meta.length).toBe(3);
    expect(result._meta[0].terminologia).toBe("TUSS");
    expect(result._meta[1].terminologia).toBe("Rol ANS");
    expect(result._meta[2].terminologia).toBe("CBHPM");
  });

  it("buscarPorCodigo retorna _meta array com 2 entradas para Tab. 22 sem CBHPM", () => {
    const result = repo.buscarPorCodigo("40301370");
    expect(result._meta.length).toBe(2);
    expect(result._meta[0].terminologia).toBe("TUSS");
    expect(result._meta[1].terminologia).toBe("Rol ANS");
  });

  it("buscarPorCodigo retorna _meta array com 2 entradas para Tab. 19", () => {
    const result = repo.buscarPorCodigo("98765432");
    expect(result._meta.length).toBe(2);
    expect(result._meta[0].terminologia).toBe("TUSS");
    expect(result._meta[1].terminologia).toBe("Rol ANS");
  });

  it("buscarPorCodigo retorna found=true para código existente", () => {
    const result = repo.buscarPorCodigo("10101012");
    expect(result.data.found).toBe(true);
    expect(result.data.descricao_tuss).toContain("Consulta");
    expect(result.data.tabela_origem).toBe("22");
  });

  it("buscarPorCodigo retorna found=false para código inexistente", () => {
    const result = repo.buscarPorCodigo("99999999");
    expect(result.data.found).toBe(false);
    expect(result.data.descricao_tuss).toBeNull();
    expect(result.data.tabela_origem).toBeNull();
    expect(Array.isArray(result._meta)).toBe(true);
    expect(result._meta.length).toBeGreaterThanOrEqual(1);
  });

  it("buscarPorCodigo retorna coberturas corretas para 10101012", () => {
    const result = repo.buscarPorCodigo("10101012");
    const coberturas = result.data.coberturas;
    expect(Array.isArray(coberturas)).toBe(true);
    const porSegmento = Object.fromEntries(
      coberturas.map((c) => [c.segmento, c.coberto])
    );
    expect(porSegmento["OD"]).toBe(false);
    expect(porSegmento["AMB"]).toBe(true);
  });

  it("buscarPorCodigo retorna hierarquia_cbhpm para código Tab. 22 com hierarquia", () => {
    const result = repo.buscarPorCodigo("10101012");
    expect(result.data.hierarquia_cbhpm).not.toBeNull();
    expect(result.data.hierarquia_cbhpm?.capitulo).toBe("PROCEDIMENTOS GERAIS");
  });

  it("getSyncMeta() retorna meta para todas as 3 terminologias", () => {
    const meta = repo.getSyncMeta();
    expect(meta.tuss.terminologia).toBe("TUSS");
    expect(meta.rolAns.terminologia).toBe("Rol ANS");
    expect(meta.cbhpm.terminologia).toBe("CBHPM");
  });

  it("todos os _meta itens têm defasagem_dias como número", () => {
    const result = repo.buscarPorCodigo("10101012");
    for (const m of result._meta) {
      expect(typeof m.defasagem_dias).toBe("number");
      expect(m.defasagem_dias).toBeGreaterThanOrEqual(0);
    }
  });

  it("todos os _meta itens têm modo='cache_local'", () => {
    const result = repo.buscarPorCodigo("10101012");
    for (const m of result._meta) {
      expect(m.modo).toBe("cache_local");
    }
  });
});
