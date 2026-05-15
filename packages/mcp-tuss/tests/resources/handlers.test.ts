import { describe, expect, it } from "vitest";
import {
  categoriasHandler,
  scopeHandler,
  tabelasDisponiveisHandler,
} from "../../src/resources/handlers.js";

describe("tabelasDisponiveisHandler", () => {
  it("retorna URI correta, MIME type application/json e conteúdo válido", () => {
    const result = tabelasDisponiveisHandler();
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe("tuss://tabelas_disponiveis");
    expect(content.mimeType).toBe("application/json");
    const parsed = JSON.parse("text" in content ? content.text : "{}");
    expect(parsed.tabelas).toHaveLength(3);
    expect(parsed.tabelas.map((t: { numero: string }) => t.numero)).toEqual(["18", "20", "22"]);
  });
});

describe("categoriasHandler", () => {
  it("retorna URI correta, MIME type application/json e categorias por tabela", () => {
    const result = categoriasHandler();
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe("tuss://categorias");
    expect(content.mimeType).toBe("application/json");
    const parsed = JSON.parse("text" in content ? content.text : "{}");
    expect(parsed.tabela_22_procedimentos).toBeDefined();
    expect(parsed.tabela_20_medicamentos).toBeDefined();
    expect(parsed.tabela_18_diarias_taxas).toBeDefined();
  });
});

describe("scopeHandler", () => {
  it("retorna URI correta, MIME type text/markdown e conteúdo bilíngue", () => {
    const result = scopeHandler();
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe("tuss://scope");
    expect(content.mimeType).toBe("text/markdown");
    const text = "text" in content ? content.text : "";
    expect(text).toContain("PT-BR");
    expect(text).toContain("EN-US");
    expect(text).toContain("Disclaimer");
  });
});
