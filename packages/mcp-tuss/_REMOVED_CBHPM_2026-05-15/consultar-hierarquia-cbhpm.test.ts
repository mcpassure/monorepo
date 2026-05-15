import { describe, it, expect, beforeAll } from "vitest";
import { createTestRepository } from "../fixtures.js";
import type { ITerminologiaRepository } from "../../src/domain/repository.js";
import {
  handler,
  inputSchema,
  NOTA_LIMITACAO,
} from "../../src/tools/consultar-hierarquia-cbhpm.js";
import { CBHPM_EDICAO } from "../../src/constants.js";

let repo: ITerminologiaRepository;

beforeAll(() => {
  repo = createTestRepository();
});

describe("consultar-hierarquia-cbhpm", () => {
  it("retorna hierarquia completa para 10101012", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as {
      codigo: string;
      capitulo: string;
      grupo: string;
      subgrupo: string;
    };
    expect(data.codigo).toBe("10101012");
    expect(data.capitulo).toBe("PROCEDIMENTOS GERAIS");
    expect(data.grupo).toBe("PROCEDIMENTOS GERAIS");
    expect(data.subgrupo).toBeTruthy();
  });

  it("retorna hierarquia para procedimento de oftalmologia (40702014)", () => {
    const input = inputSchema.parse({ codigo: "40702014" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { capitulo: string };
    expect(data.capitulo).toBe("OFTALMOLOGIA");
  });

  it("retorna null para hierarquia de código sem registro CBHPM", () => {
    const input = inputSchema.parse({ codigo: "40301370" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as {
      capitulo: null;
      grupo: null;
      subgrupo: null;
    };
    expect(data.capitulo).toBeNull();
    expect(data.grupo).toBeNull();
    expect(data.subgrupo).toBeNull();
  });

  it("sempre inclui nota_limitacao sobre porte/UCO", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { nota_limitacao: string };
    expect(data.nota_limitacao).toBe(NOTA_LIMITACAO);
    expect(data.nota_limitacao).toContain("porte anestésico");
  });

  it("sempre inclui cbhpm_edicao", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { cbhpm_edicao: string };
    expect(data.cbhpm_edicao).toBe(CBHPM_EDICAO);
  });

  it("inclui descricao_tuss quando o código existe", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as { descricao_tuss: string | null };
    expect(data.descricao_tuss).toBeTruthy();
  });

  it("retorna null para hierarquia de código inexistente", () => {
    const input = inputSchema.parse({ codigo: "00000000" });
    const result = handler(input, repo);

    const data = result.structuredContent.data as {
      capitulo: null;
      grupo: null;
      subgrupo: null;
      descricao_tuss: null;
    };
    expect(data.capitulo).toBeNull();
    expect(data.grupo).toBeNull();
    expect(data.subgrupo).toBeNull();
    expect(data.descricao_tuss).toBeNull();
  });

  it("retorna _meta com [TUSS, CBHPM]", () => {
    const input = inputSchema.parse({ codigo: "10101012" });
    const result = handler(input, repo);

    const meta = result.structuredContent._meta as Array<{ terminologia: string }>;
    expect(Array.isArray(meta)).toBe(true);
    expect(meta.length).toBe(2);
    expect(meta[0].terminologia).toBe("TUSS");
    expect(meta[1].terminologia).toBe("CBHPM");
  });

  it("rejeita código com formato inválido", () => {
    expect(() => inputSchema.parse({ codigo: "1010101" })).toThrow();
  });
});
