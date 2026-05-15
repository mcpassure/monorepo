import { describe, expect, it } from "vitest";
import {
  analisarCompatibilidadeCodigosHandler,
  mapearCategoriaProcedimentosHandler,
  verificarCodigoTussHandler,
} from "../../src/prompts/handlers.js";
import { createEmptyDb, createRepo, createSeededDb } from "../helpers.js";

// ── verificar_codigo_tuss ──────────────────────────────────────────────────────

describe("verificarCodigoTussHandler", () => {
  it("encontra código na tabela 22", () => {
    const repo = createRepo(createSeededDb());
    const result = verificarCodigoTussHandler({ codigo: "10101012" }, repo);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content.type).toBe("text");
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("10101012");
    expect(text).toContain("Tabela 22");
  });

  it("encontra código na tabela 20 quando tabela especificada", () => {
    const repo = createRepo(createSeededDb());
    const result = verificarCodigoTussHandler({ codigo: "90010012", tabela: "20" }, repo);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("90010012");
    expect(text).toContain("Tabela 20");
  });

  it("retorna mensagem de não encontrado para código inexistente", () => {
    const repo = createRepo(createSeededDb());
    const result = verificarCodigoTussHandler({ codigo: "99999999" }, repo);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("99999999");
    expect(text).toContain("não localizado");
  });

  it("retorna mensagem de não encontrado em banco vazio", () => {
    const repo = createRepo(createEmptyDb());
    const result = verificarCodigoTussHandler({ codigo: "10101012" }, repo);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("não localizado");
  });
});

// ── mapear_categoria_procedimentos ────────────────────────────────────────────

describe("mapearCategoriaProcedimentosHandler", () => {
  it("retorna resultados agrupados por tabela", () => {
    const repo = createRepo(createSeededDb());
    const result = mapearCategoriaProcedimentosHandler({ termo: "diária" }, repo);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("diária");
    expect(text).toContain("Tabela 18");
  });

  it("retorna mensagem de nenhum resultado para termo sem match", () => {
    const repo = createRepo(createSeededDb());
    const result = mapearCategoriaProcedimentosHandler({ termo: "xyzabc123" }, repo);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("Nenhum resultado");
  });

  it("respeita limite informado", () => {
    const repo = createRepo(createSeededDb());
    const result = mapearCategoriaProcedimentosHandler({ termo: "consulta", limite: "1" }, repo);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(result.messages).toHaveLength(1);
    expect(text).toBeTruthy();
  });
});

// ── analisar_compatibilidade_codigos ──────────────────────────────────────────

describe("analisarCompatibilidadeCodigosHandler", () => {
  it("identifica códigos válidos e inválidos", () => {
    const repo = createRepo(createSeededDb());
    const result = analisarCompatibilidadeCodigosHandler({ codigos: "10101012,99999999" }, repo);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("✅ 10101012");
    expect(text).toContain("❌ 99999999");
    expect(text).toContain("órfãos");
  });

  it("retorna todos como inválidos em banco vazio", () => {
    const repo = createRepo(createEmptyDb());
    const result = analisarCompatibilidadeCodigosHandler({ codigos: "10101012,90010012" }, repo);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("❌ 10101012");
    expect(text).toContain("❌ 90010012");
  });

  it("identifica código em múltiplas tabelas não acontece (cada código tem tabela única)", () => {
    const repo = createRepo(createSeededDb());
    const result = analisarCompatibilidadeCodigosHandler({ codigos: "04010010" }, repo);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("04010010");
    expect(text).toContain("Tab. 18");
  });
});
