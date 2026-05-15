import { describe, it, expect, beforeAll } from "vitest";
import { createTestRepository } from "../fixtures.js";
import type { ITerminologiaRepository } from "../../src/domain/repository.js";
import { handler, inputSchema } from "../../src/tools/validar-cobertura-rol.js";

let repo: ITerminologiaRepository;

beforeAll(() => {
  repo = createTestRepository();
});

describe("validar-cobertura-rol", () => {
  it("10101012 está no Rol ANS", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { no_rol_ans: boolean };
    expect(data.no_rol_ans).toBe(true);
  });

  it("10101012 é coberto no segmento AMB", () => {
    const input = inputSchema.parse({ codigo: "10101012", segmento: "AMB" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { coberturas: Array<{ segmento: string; coberto: boolean }> };
    const amb = data.coberturas.find((c) => c.segmento === "AMB");
    expect(amb?.coberto).toBe(true);
  });

  it("10101012 não é coberto no segmento OD", () => {
    const input = inputSchema.parse({ codigo: "10101012", segmento: "OD" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { coberturas: Array<{ segmento: string; coberto: boolean }> };
    const od = data.coberturas.find((c) => c.segmento === "OD");
    expect(od?.coberto).toBe(false);
  });

  it("40301370 tem DUT indicado", () => {
    const input = inputSchema.parse({ codigo: "40301370" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { coberturas: Array<{ tem_dut: boolean }> };
    expect(data.coberturas.some((c) => c.tem_dut === true)).toBe(true);
  });

  it("40702014 é coberto HCO e HSO mas não PAC", () => {
    const input = inputSchema.parse({ codigo: "40702014" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { coberturas: Array<{ segmento: string; coberto: boolean }> };
    const porSeg = Object.fromEntries(data.coberturas.map((c) => [c.segmento, c.coberto]));
    expect(porSeg["HCO"]).toBe(true);
    expect(porSeg["HSO"]).toBe(true);
    expect(porSeg["PAC"]).toBe(false);
  });

  it("código fora do Rol retorna no_rol_ans=false", () => {
    const input = inputSchema.parse({ codigo: "98765432" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { no_rol_ans: boolean };
    expect(data.no_rol_ans).toBe(false);
  });

  it("código totalmente desconhecido retorna no_rol_ans=false", () => {
    const input = inputSchema.parse({ codigo: "00000000" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { no_rol_ans: boolean };
    expect(data.no_rol_ans).toBe(false);
  });

  it("retorna descricao_tuss quando o código existe", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { descricao_tuss: string | null };
    expect(data.descricao_tuss).toBeTruthy();
  });

  it("retorna todos os 5 segmentos quando nenhum segmento é filtrado", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { coberturas: Array<{ segmento: string }> };
    const segmentos = data.coberturas.map((c) => c.segmento).sort();
    expect(segmentos).toEqual(["AMB", "HCO", "HSO", "OD", "PAC"]);
  });

  it("retorna _meta com [TUSS, Rol ANS]", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as Array<{ terminologia: string }>;
    expect(Array.isArray(meta)).toBe(true);
    expect(meta.length).toBe(2);
    expect(meta[0].terminologia).toBe("TUSS");
    expect(meta[1].terminologia).toBe("Rol ANS");
  });

  it("rejeita código com formato inválido", () => {
    expect(() => inputSchema.parse({ codigo: "1234" })).toThrow();
  });

  it("rejeita segmento inválido", () => {
    expect(() =>
      inputSchema.parse({ codigo: "10101012", segmento: "INVALIDO" })
    ).toThrow();
  });
});
