import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BularioRepository } from "../../src/domain/repository.js";
import { createServer } from "../../src/server.js";
import { FailingSource } from "../setup/fixture-source.js";
import { callTool, makeIntegrationServer } from "../setup/helpers.js";

type Suite = ReturnType<typeof makeIntegrationServer>;

type ListaData = {
  medicamentos: Array<{ nomeProduto: string; numProcesso: string }>;
  total: number;
  pagina: number;
};

type BulaData = {
  nomeProduto: string;
  tarja?: string;
  principioAtivo?: string;
  classesTerapeuticas?: string[];
  bulaPaciente?: { id: string; urlPdf?: string } | null;
  bulaProfissional?: { id: string; urlPdf?: string } | null;
  aviso_v2?: string;
};

type ApresentacoesData = {
  nomeProduto: string;
  apresentacoes: Array<{ descricao: string }>;
  aviso_v2?: string;
};

describe("buscar_por_nome — integration", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("returns structured content with real fixture data for novalgina", async () => {
    const result = await callTool(suite.server, "buscar_por_nome", { nome: "novalgina" });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toBeDefined();
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos.length).toBeGreaterThanOrEqual(1);
    expect(data.medicamentos[0].nomeProduto).toContain("NOVALGINA");
    expect(data.medicamentos[0].numProcesso).toBe("25351617747202347");
  });

  it("returns disclaimer in text content", async () => {
    const result = await callTool(suite.server, "buscar_por_nome", { nome: "tylenol" });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toContain("profissional de saúde");
  });

  it("source is called on each request (v2.0 — no separate in-memory cache)", async () => {
    await callTool(suite.server, "buscar_por_nome", { nome: "advil" });
    const callsBefore = suite.source.callLog.filter((c) => c.method === "searchByName").length;
    await callTool(suite.server, "buscar_por_nome", { nome: "advil" });
    const callsAfter = suite.source.callLog.filter((c) => c.method === "searchByName").length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });

  it("paginates correctly — page 2 returns empty for small fixtures", async () => {
    const result = await callTool(suite.server, "buscar_por_nome", {
      nome: "amoxil",
      pagina: 2,
      count: 10,
    });
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos).toHaveLength(0);
  });

  it("returns isError on source failure", async () => {
    const failRepo = new BularioRepository(new FailingSource());
    const failServer = createServer(failRepo);
    const result = await callTool(failServer, "buscar_por_nome", { nome: "x" });
    expect(result.isError).toBe(true);
  });
});

describe("buscar_por_principio_ativo — integration", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("finds dipirona via principio ativo", async () => {
    const result = await callTool(suite.server, "buscar_por_principio_ativo", {
      principioAtivo: "dipirona",
    });
    expect(result.isError).toBeUndefined();
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos.length).toBeGreaterThanOrEqual(1);
  });

  it("finds amoxicilina via principio ativo", async () => {
    const result = await callTool(suite.server, "buscar_por_principio_ativo", {
      principioAtivo: "amoxicilina",
    });
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos.some((m) => m.nomeProduto.toUpperCase().includes("AMOXICILINA"))).toBe(
      true
    );
  });

  it("finds ibuprofeno via principio ativo", async () => {
    const result = await callTool(suite.server, "buscar_por_principio_ativo", {
      principioAtivo: "ibuprofeno",
    });
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos.some((m) => m.nomeProduto.toUpperCase().includes("IBUPROFENO"))).toBe(
      true
    );
  });
});

describe("buscar_por_classe_terapeutica — integration", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("finds antibiotic class", async () => {
    const result = await callTool(suite.server, "buscar_por_classe_terapeutica", {
      classeTerapeutica: "antibiotico",
    });
    expect(result.isError).toBeUndefined();
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos.length).toBeGreaterThanOrEqual(1);
  });

  it("finds analgesics class", async () => {
    const result = await callTool(suite.server, "buscar_por_classe_terapeutica", {
      classeTerapeutica: "analgesico",
    });
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos.length).toBeGreaterThanOrEqual(1);
  });

  it("returns pagina field in structured content", async () => {
    const result = await callTool(suite.server, "buscar_por_classe_terapeutica", {
      classeTerapeutica: "ibuprofeno",
      pagina: 1,
    });
    const data = result.structuredContent?.data as ListaData;
    expect(data.pagina).toBe(1);
  });
});

describe("filtrar_por_tarja — integration", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("PRETA tarja returns controlled substances", async () => {
    const result = await callTool(suite.server, "filtrar_por_tarja", { tarja: "PRETA" });
    expect(result.isError).toBeUndefined();
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos.length).toBeGreaterThanOrEqual(1);
    expect(data.medicamentos[0].nomeProduto).toBe("RITALINA");
  });

  it("VERMELHA tarja returns prescription medications", async () => {
    const result = await callTool(suite.server, "filtrar_por_tarja", { tarja: "VERMELHA" });
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos.length).toBeGreaterThanOrEqual(1);
  });

  it("LIVRE tarja returns OTC medications", async () => {
    const result = await callTool(suite.server, "filtrar_por_tarja", { tarja: "LIVRE" });
    const data = result.structuredContent?.data as ListaData;
    expect(data.medicamentos.length).toBeGreaterThanOrEqual(1);
    expect(data.medicamentos[0].nomeProduto).toBe("TYLENOL");
  });

  it("invalid tarja is rejected before calling source", async () => {
    const result = await callTool(suite.server, "filtrar_por_tarja", { tarja: "ROXO" });
    expect(result.isError).toBe(true);
    const prevCalls = suite.source.callLog.filter((c) => c.method === "searchByTarja").length;
    expect(prevCalls).toBe(0);
  });
});

describe("consultar_bula — integration (v2.0 — metadados apenas)", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("returns metadata for NOVALGINA with aviso_v2", async () => {
    const result = await callTool(suite.server, "consultar_bula", {
      numProcesso: "25351617747202347",
    });
    expect(result.isError).toBeUndefined();
    const data = result.structuredContent?.data as BulaData;
    expect(data.nomeProduto).toBe("NOVALGINA");
    expect(data.aviso_v2).toContain("v2.0");
    // v2.0: bula PDF não disponível no CSV
    expect(data.bulaPaciente).toBeNull();
    expect(data.bulaProfissional).toBeNull();
  });

  it("returns principioAtivo and classesTerapeuticas for NOVALGINA", async () => {
    const result = await callTool(suite.server, "consultar_bula", {
      numProcesso: "25351617747202347",
    });
    const data = result.structuredContent?.data as BulaData;
    expect(data.principioAtivo).toContain("dipirona");
    expect(Array.isArray(data.classesTerapeuticas)).toBe(true);
  });

  it("returns isError for unknown numProcesso", async () => {
    const result = await callTool(suite.server, "consultar_bula", { numProcesso: "00000000000" });
    expect(result.isError).toBe(true);
    const content = result.content as Array<{ text: string }>;
    expect(content[0].text).toContain("00000000000");
  });
});

describe("listar_apresentacoes — integration (v2.0 — dados limitados)", () => {
  let suite: Suite;
  beforeEach(() => {
    suite = makeIntegrationServer();
  });
  afterEach(() => suite.cleanup());

  it("returns available metadata for NOVALGINA with aviso_v2", async () => {
    const result = await callTool(suite.server, "listar_apresentacoes", {
      numProcesso: "25351617747202347",
    });
    expect(result.isError).toBeUndefined();
    const data = result.structuredContent?.data as ApresentacoesData;
    expect(data.nomeProduto).toBe("NOVALGINA");
    expect(data.aviso_v2).toContain("v2.0");
    expect(data.apresentacoes.length).toBeGreaterThanOrEqual(1);
  });

  it("nomeProduto is included in output", async () => {
    const result = await callTool(suite.server, "listar_apresentacoes", {
      numProcesso: "25351464826202349",
    });
    const data = result.structuredContent?.data as ApresentacoesData;
    expect(data.nomeProduto).toBe("TYLENOL");
  });
});
