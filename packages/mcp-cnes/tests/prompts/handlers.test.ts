import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { getInMemoryDb } from "../../src/db/connection.js";
import { CnesRepository } from "../../src/domain/repository.js";
import {
  handleAnalisarCoberturaUf,
  handleMapearRedeMunicipio,
  handlePerfilEstabelecimento,
} from "../../src/prompts/handlers.js";
import { seedDatabase } from "../fixtures/seed.js";

let db: Database.Database;
let repo: CnesRepository;

beforeEach(() => {
  db = getInMemoryDb();
  repo = new CnesRepository(() => db);
});

describe("handlePerfilEstabelecimento", () => {
  it("retorna perfil completo quando CNES existe no cache", async () => {
    seedDatabase(db);
    const result = await handlePerfilEstabelecimento(
      {
        codigo_cnes: "2077485",
        incluir_profissionais: true,
        incluir_leitos: true,
        incluir_equipamentos: true,
        incluir_servicos: true,
      },
      repo
    );
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    const content = result.messages[0].content;
    expect(content.type).toBe("text");
    const text = (content as { type: "text"; text: string }).text;
    expect(text).toContain("2077485");
    expect(text).toContain("Profissionais:");
    expect(text).toContain("Leitos:");
  });

  it("retorna mensagem de não encontrado para CNES inexistente", async () => {
    seedDatabase(db);
    const result = await handlePerfilEstabelecimento(
      {
        codigo_cnes: "9999999",
        incluir_profissionais: false,
        incluir_leitos: false,
        incluir_equipamentos: false,
        incluir_servicos: false,
      },
      repo
    );
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("9999999");
    expect(text.toLowerCase()).toMatch(/não localizado|não encontrado/i);
  });

  it("retorna mensagem de cache vazio quando DB está vazio", async () => {
    const result = await handlePerfilEstabelecimento(
      {
        codigo_cnes: "2077485",
        incluir_profissionais: false,
        incluir_leitos: false,
        incluir_equipamentos: false,
        incluir_servicos: false,
      },
      repo
    );
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text.toLowerCase()).toMatch(/cache|não localizado/i);
  });
});

describe("handleMapearRedeMunicipio", () => {
  it("retorna mapa da rede quando município (IBGE) tem dados", async () => {
    seedDatabase(db);
    const result = await handleMapearRedeMunicipio(
      { municipio: "3550308", uf: "SP", tipo_estabelecimento: undefined, limite: 50 },
      repo
    );
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("3550308");
  });

  it("retorna instrução de IBGE quando municipio é nome (não código)", async () => {
    const result = await handleMapearRedeMunicipio(
      { municipio: "São Paulo", uf: "SP", tipo_estabelecimento: undefined, limite: 50 },
      repo
    );
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text.toLowerCase()).toContain("ibge");
  });
});

describe("handleAnalisarCoberturaUf", () => {
  it("retorna análise por tipo quando UF tem dados", async () => {
    seedDatabase(db);
    const result = await handleAnalisarCoberturaUf({ uf: "SP", agrupar_por: "tipo" }, repo);
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("SP");
    expect(text.toLowerCase()).toContain("tipo");
  });

  it("retorna mensagem de sync pendente quando UF não tem dados", async () => {
    const result = await handleAnalisarCoberturaUf({ uf: "AM", agrupar_por: "tipo" }, repo);
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("AM");
    expect(text.toLowerCase()).toMatch(/sync|sincroniz/i);
  });
});
