import { describe, it, expect, beforeAll } from "vitest";
import { createTestRepository } from "../fixtures.js";
import type { ITerminologiaRepository } from "../../src/domain/repository.js";
import { handler, inputSchema } from "../../src/tools/buscar-por-codigo.js";
import { FHIR_SYSTEM } from "../../src/constants.js";

let repo: ITerminologiaRepository;

beforeAll(() => {
  repo = createTestRepository();
});

describe("buscar-por-codigo", () => {
  it("retorna procedimento existente com todos os campos obrigatórios", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    expect(result.structuredContent.data).toMatchObject({
      codigo: "10101012",
      tabela_origem: "22",
      sistema_fhir: FHIR_SYSTEM,
    });
    expect((result.structuredContent.data as { descricao_tuss: string }).descricao_tuss).toContain("Consulta");
    expect(result.structuredContent.disclaimer).toBeTruthy();
  });

  it("retorna _meta array com pelo menos 2 entradas (TUSS + Rol ANS)", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as unknown[];
    expect(Array.isArray(meta)).toBe(true);
    expect(meta.length).toBeGreaterThanOrEqual(2);
    expect((meta[0] as { terminologia: string }).terminologia).toBe("TUSS");
    expect((meta[1] as { terminologia: string }).terminologia).toBe("Rol ANS");
  });

  it("retorna _meta com 3 entradas para Tab. 22 com hierarquia CBHPM", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as unknown[];
    expect(meta.length).toBe(3);
    expect((meta[2] as { terminologia: string }).terminologia).toBe("CBHPM");
  });

  it("retorna coberturas corretas para 10101012 (AMB/HCO/HSO/PAC cobertos, OD não)", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const coberturas = (result.structuredContent.data as { coberturas: Array<{ segmento: string; coberto: boolean }> }).coberturas;
    const porSegmento = Object.fromEntries(coberturas.map((c) => [c.segmento, c.coberto]));

    expect(porSegmento["OD"]).toBe(false);
    expect(porSegmento["AMB"]).toBe(true);
    expect(porSegmento["HCO"]).toBe(true);
    expect(porSegmento["HSO"]).toBe(true);
    expect(porSegmento["PAC"]).toBe(true);
  });

  it("retorna hierarquia CBHPM para 10101012", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const hierarquia = (result.structuredContent.data as { hierarquia_cbhpm: { capitulo: string; grupo: string } }).hierarquia_cbhpm;
    expect(hierarquia).toMatchObject({
      capitulo: "PROCEDIMENTOS GERAIS",
      grupo: "PROCEDIMENTOS GERAIS",
    });
  });

  it("retorna ressonância magnética com tem_dut=true", () => {
    const input = inputSchema.parse({ codigo: "40301370" });
    const result = handler(input, repo);

    const coberturas = (result.structuredContent.data as { coberturas: Array<{ tem_dut: boolean }> }).coberturas;
    expect(coberturas.some((c) => c.tem_dut)).toBe(true);
  });

  it("retorna erro estruturado para código inexistente", () => {
    const input = inputSchema.parse({ codigo: "00000000" });
    const result = handler(input, repo);

    expect(result.structuredContent).toMatchObject({
      error: "CODIGO_NAO_ENCONTRADO",
      codigo: "00000000",
    });
    expect(result.content[0].text).toContain("não encontrado");
    // _meta presente mesmo no erro
    expect(Array.isArray(result.structuredContent._meta)).toBe(true);
  });

  it("rejeita código com menos de 8 dígitos", () => {
    expect(() => inputSchema.parse({ codigo: "1234567" })).toThrow();
  });

  it("rejeita código com caracteres não numéricos", () => {
    expect(() => inputSchema.parse({ codigo: "1234567A" })).toThrow();
  });

  it("retorna material OPME corretamente", () => {
    const input = inputSchema.parse({ codigo: "98765432" });
    const result = handler(input, repo);

    expect(result.structuredContent.data).toMatchObject({
      codigo: "98765432",
      tabela_origem: "19",
      tipo: "opme",
    });
  });

  it("retorna medicamento corretamente", () => {
    const input = inputSchema.parse({ codigo: "12345678" });
    const result = handler(input, repo);

    expect((result.structuredContent.data as { tabela_origem: string }).tabela_origem).toBe("20");
    expect((result.structuredContent.data as { descricao_tuss: string }).descricao_tuss).toContain("Dipirona");
  });

  it("retorna taxa/diária corretamente", () => {
    const input = inputSchema.parse({ codigo: "20202143" });
    const result = handler(input, repo);

    expect(result.structuredContent.data).toMatchObject({
      codigo: "20202143",
      tabela_origem: "18",
      tipo: "diaria",
    });
  });

  it("_meta items têm defasagem_dias como número ≥ 0", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as Array<{ defasagem_dias: number }>;
    for (const m of meta) {
      expect(typeof m.defasagem_dias).toBe("number");
      expect(m.defasagem_dias).toBeGreaterThanOrEqual(0);
    }
  });
});
