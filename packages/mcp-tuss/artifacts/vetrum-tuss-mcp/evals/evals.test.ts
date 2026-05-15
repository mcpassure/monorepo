/**
 * Evals de negócio — 12 casos da PRD §7
 *
 * Cada eval descreve um cenário de uso real da saúde suplementar brasileira
 * e verifica que o comportamento do MCP está correto do ponto de vista regulatório.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createTestRepository } from "../tests/fixtures.js";
import type { ITerminologiaRepository } from "../src/domain/repository.js";
import { handler as buscarCodigo, inputSchema as schemaCodigo } from "../src/tools/buscar-por-codigo.js";
import { handler as buscarDesc, inputSchema as schemaDesc } from "../src/tools/buscar-por-descricao.js";
import { handler as validarRol, inputSchema as schemaRol } from "../src/tools/validar-cobertura-rol.js";
import { handler as hierarquiaCbhpm, inputSchema as schemaHier } from "../src/tools/consultar-hierarquia-cbhpm.js";
import { handler as listarObrig, inputSchema as schemaObrig } from "../src/tools/listar-cobertura-obrigatoria.js";
import { handler as listarCat, inputSchema as schemaCat } from "../src/tools/listar-por-categoria.js";
import { handler as statusSync, inputSchema as schemaStatus } from "../src/tools/status-sincronizacao.js";
import { FHIR_SYSTEM, CBHPM_EDICAO } from "../src/constants.js";

let repo: ITerminologiaRepository;

beforeAll(() => {
  repo = createTestRepository();
});

describe("Evals de negócio — PRD §7", () => {
  // Eval 1: Busca por código TUSS válido retorna todos os campos esperados
  it("Eval 01 — buscar_tuss_por_codigo: retorna todos os campos obrigatórios para código válido", () => {
    const result = buscarCodigo(schemaCodigo.parse({ codigo: "10101012" }), repo);
    const sc = result.structuredContent;
    const data = sc.data as {
      codigo: string;
      descricao_tuss: string;
      tabela_origem: string;
      sistema_fhir: string;
      coberturas: unknown[];
      hierarquia_cbhpm: unknown;
    };

    expect(data.codigo).toBe("10101012");
    expect(data.descricao_tuss).toBeTruthy();
    expect(data.tabela_origem).toBe("22");
    expect(data.sistema_fhir).toBe(FHIR_SYSTEM);
    expect(Array.isArray(data.coberturas)).toBe(true);
    expect(data.hierarquia_cbhpm).toBeDefined();
    expect(sc.disclaimer).toBeTruthy();
    expect(Array.isArray(sc._meta)).toBe(true);
  });

  // Eval 2: Código inexistente retorna erro estruturado (não throw)
  it("Eval 02 — buscar_tuss_por_codigo: código inexistente retorna erro estruturado sem lançar exceção", () => {
    const result = buscarCodigo(schemaCodigo.parse({ codigo: "99999999" }), repo);

    expect(result.structuredContent.error).toBe("CODIGO_NAO_ENCONTRADO");
    expect(result.content[0].text).toContain("não encontrado");
  });

  // Eval 3: Consulta médica (10101012) é coberta no plano ambulatorial (AMB)
  it("Eval 03 — validar_cobertura_rol: consulta médica é coberta no segmento AMB", () => {
    const result = validarRol(schemaRol.parse({ codigo: "10101012", segmento: "AMB" }), repo);
    const data = result.structuredContent.data as {
      no_rol_ans: boolean;
      coberturas: Array<{ segmento: string; coberto: boolean }>;
    };

    expect(data.no_rol_ans).toBe(true);
    expect(data.coberturas.find((c) => c.segmento === "AMB")?.coberto).toBe(true);
  });

  // Eval 4: Ressonância magnética (40301370) tem DUT indicado
  it("Eval 04 — validar_cobertura_rol: ressonância magnética do encéfalo possui indicação de DUT", () => {
    const result = validarRol(schemaRol.parse({ codigo: "40301370" }), repo);
    const data = result.structuredContent.data as {
      no_rol_ans: boolean;
      coberturas: Array<{ segmento: string; coberto: boolean; tem_dut: boolean }>;
    };

    expect(data.no_rol_ans).toBe(true);
    expect(data.coberturas.some((c) => c.tem_dut === true)).toBe(true);
  });

  // Eval 5: Transplante de córnea (40702014) não é coberto para plano ambulatorial (AMB)
  it("Eval 05 — validar_cobertura_rol: transplante de córnea não é coberto no segmento AMB", () => {
    const result = validarRol(schemaRol.parse({ codigo: "40702014", segmento: "AMB" }), repo);
    const data = result.structuredContent.data as {
      coberturas: Array<{ segmento: string; coberto: boolean }>;
    };

    const amb = data.coberturas.find((c) => c.segmento === "AMB");
    expect(amb?.coberto).toBe(false);
  });

  // Eval 6: CBHPM hierarquia retorna capítulo correto e inclui nota de limitação mandatória
  it("Eval 06 — consultar_hierarquia_cbhpm: retorna capítulo e nota de limitação mandatória", () => {
    const result = hierarquiaCbhpm(schemaHier.parse({ codigo: "10101012" }), repo);
    const data = result.structuredContent.data as {
      capitulo: string;
      nota_limitacao: string;
      cbhpm_edicao: string;
    };

    expect(data.capitulo).toBeTruthy();
    expect(data.nota_limitacao).toContain("porte anestésico");
    expect(data.cbhpm_edicao).toBe(CBHPM_EDICAO);
  });

  // Eval 7: Busca por texto retorna resultados paginados corretamente
  it("Eval 07 — buscar_tuss_por_descricao: busca por texto retorna paginação estruturada", () => {
    const result = buscarDesc(schemaDesc.parse({ texto: "Colonoscopia", por_pagina: 2 }), repo);
    const data = result.structuredContent.data as {
      total: number;
      resultados: unknown[];
      pagina: number;
      por_pagina: number;
    };

    expect(data.total).toBeGreaterThanOrEqual(3);
    expect(data.resultados.length).toBeLessThanOrEqual(2);
    expect(data.pagina).toBe(1);
    expect(data.por_pagina).toBe(2);
  });

  // Eval 8: Busca por texto filtrando por tabela 19 retorna apenas materiais/OPME
  it("Eval 08 — buscar_tuss_por_descricao: filtro por tabela 19 retorna apenas materiais", () => {
    const result = buscarDesc(
      schemaDesc.parse({ texto: "titânio", tabelas: ["19"] }),
      repo
    );
    const data = result.structuredContent.data as {
      resultados: Array<{ tabela_origem: string }>;
    };

    expect(data.resultados.length).toBeGreaterThanOrEqual(1);
    expect(data.resultados.every((r) => r.tabela_origem === "19")).toBe(true);
  });

  // Eval 9: Listar procedimentos obrigatórios com DUT
  it("Eval 09 — listar_procedimentos_com_cobertura_obrigatoria: filtra por com_dut=true corretamente", () => {
    const result = listarObrig(schemaObrig.parse({ com_dut: true }), repo);
    const data = result.structuredContent.data as {
      resultados: Array<{ tem_dut: boolean }>;
    };

    expect(data.resultados.length).toBeGreaterThanOrEqual(1);
    expect(data.resultados.every((r) => r.tem_dut)).toBe(true);
  });

  // Eval 10: Listar por categoria retorna apenas registros da categoria correta
  it("Eval 10 — listar_por_categoria: categoria 'opme' retorna apenas registros com tipo=opme", () => {
    const result = listarCat(schemaCat.parse({ categoria: "opme" }), repo);
    const data = result.structuredContent.data as {
      resultados: Array<{ tipo: string }>;
    };

    expect(data.resultados.length).toBeGreaterThanOrEqual(1);
    expect(data.resultados.every((r) => r.tipo === "opme")).toBe(true);
  });

  // Eval 11: Status de sincronização informa versões e edição CBHPM
  it("Eval 11 — status_sincronizacao: retorna versões de todas as terminologias e cbhpm_edicao", () => {
    const result = statusSync(schemaStatus.parse({}), repo);
    const data = result.structuredContent.data as {
      cbhpm_edicao: string;
      tuss_versao: string;
      rol_versao: string;
    };

    expect(data.tuss_versao).toBeTruthy();
    expect(data.rol_versao).toBeTruthy();
    expect(data.cbhpm_edicao).toBe(CBHPM_EDICAO);
  });

  // Eval 12: Disclaimer está presente em todas as ferramentas (segurança regulatória)
  it("Eval 12 — disclaimer regulatório: todas as ferramentas incluem disclaimer obrigatório", () => {
    const tools = [
      buscarCodigo(schemaCodigo.parse({ codigo: "10101012" }), repo),
      buscarDesc(schemaDesc.parse({ texto: "consulta" }), repo),
      validarRol(schemaRol.parse({ codigo: "10101012" }), repo),
      hierarquiaCbhpm(schemaHier.parse({ codigo: "10101012" }), repo),
      listarObrig(schemaObrig.parse({}), repo),
      listarCat(schemaCat.parse({ categoria: "procedimentos" }), repo),
      statusSync(schemaStatus.parse({}), repo),
    ];

    for (const result of tools) {
      expect(result.structuredContent.disclaimer).toBeTruthy();
      expect(typeof result.structuredContent.disclaimer).toBe("string");
      expect((result.structuredContent.disclaimer as string).length).toBeGreaterThan(50);
    }
  });
});
