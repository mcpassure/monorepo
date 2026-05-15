import { describe, expect, it, vi } from "vitest";
import type { IBularioRepository } from "../../src/domain/repository.js";
import {
  getClassesTerapeuticasJson,
  SCOPE_MARKDOWN,
  TARJAS_JSON,
} from "../../src/resources/handlers.js";

function makeRepository(override?: Partial<IBularioRepository>): IBularioRepository {
  return {
    searchByName: vi.fn(),
    searchByPrincipalAtivo: vi.fn(),
    searchByClasseTerapeutica: vi.fn(),
    searchByTarja: vi.fn(),
    getDetalhes: vi.fn(),
    getApresentacoes: vi.fn(),
    getBulaLink: vi.fn(),
    ...override,
  };
}

describe("bulario://tarjas — TARJAS_JSON", () => {
  it("é JSON válido com 4 categorias de tarja", () => {
    const parsed = JSON.parse(TARJAS_JSON);
    expect(parsed.tarjas).toHaveLength(4);
    const codigos = parsed.tarjas.map((t: { codigo: string }) => t.codigo);
    expect(codigos).toContain("sem_tarja");
    expect(codigos).toContain("amarela");
    expect(codigos).toContain("vermelha");
    expect(codigos).toContain("preta");
  });

  it("inclui fonte regulatória RDC 357/2020 e Portaria 344/1998", () => {
    const parsed = JSON.parse(TARJAS_JSON);
    expect(parsed.fonte).toContain("357/2020");
    expect(parsed.fonte).toContain("344/1998");
  });

  it("cada tarja tem codigo, nome e descricao", () => {
    const parsed = JSON.parse(TARJAS_JSON);
    for (const tarja of parsed.tarjas) {
      expect(tarja).toHaveProperty("codigo");
      expect(tarja).toHaveProperty("nome");
      expect(tarja).toHaveProperty("descricao");
    }
  });
});

describe("bulario://classes_terapeuticas — getClassesTerapeuticasJson", () => {
  it("retorna JSON com lista de classes terapêuticas", async () => {
    const json = await getClassesTerapeuticasJson(makeRepository());
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed.classes_terapeuticas)).toBe(true);
    expect(parsed.classes_terapeuticas.length).toBeGreaterThan(10);
  });

  it("contém Antibiótico, Analgésico e Psicotrópico", async () => {
    const json = await getClassesTerapeuticasJson(makeRepository());
    const parsed = JSON.parse(json);
    expect(parsed.classes_terapeuticas).toContain("Antibiótico");
    expect(parsed.classes_terapeuticas).toContain("Analgésico");
    expect(parsed.classes_terapeuticas).toContain("Psicotrópico");
  });

  it("total bate com comprimento do array", async () => {
    const json = await getClassesTerapeuticasJson(makeRepository());
    const parsed = JSON.parse(json);
    expect(parsed.total).toBe(parsed.classes_terapeuticas.length);
  });
});

describe("bulario://scope — SCOPE_MARKDOWN", () => {
  it("é bilíngue com seções PT-BR e EN", () => {
    expect(SCOPE_MARKDOWN).toContain("Português");
    expect(SCOPE_MARKDOWN).toContain("English");
  });

  it("contém disclaimer de Tarja Preta e Portaria 344", () => {
    expect(SCOPE_MARKDOWN).toContain("Tarja Preta");
    expect(SCOPE_MARKDOWN).toContain("344");
    expect(SCOPE_MARKDOWN).toContain("Black-banded");
  });

  it("lista explicitamente o que o MCP NÃO faz", () => {
    expect(SCOPE_MARKDOWN).toContain("NÃO faz");
    expect(SCOPE_MARKDOWN).toContain("does NOT do");
  });
});
