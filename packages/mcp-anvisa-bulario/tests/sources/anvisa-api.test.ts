import { describe, expect, it, vi } from "vitest";
import { AnvisaApiSource } from "../../src/sources/anvisa-api.js";
import { SourceAuthError } from "../../src/utils/backoff.js";
import type { HttpGet } from "../../src/utils/http.js";

/**
 * Cria um mock HttpGet que retorna uma resposta fixa.
 * Permite testar a lógica de mapeamento do AnvisaApiSource sem
 * instanciar Playwright real.
 */
function makeMockClient(response: unknown): HttpGet {
  return {
    get: vi.fn().mockResolvedValue(response),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMockClientWithError(error: Error): HttpGet {
  return {
    get: vi.fn().mockRejectedValue(error),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

const makeSource = (client: HttpGet) =>
  new AnvisaApiSource("https://consultas.anvisa.gov.br", 1, 0, 5000, client);

describe("AnvisaApiSource identity", () => {
  it("has name = anvisa_api", () => {
    const source = makeSource(makeMockClient({}));
    expect(source.name).toBe("anvisa_api");
  });
});

describe("AnvisaApiSource.searchByName", () => {
  it("returns mapped medicamentos on success", async () => {
    const client = makeMockClient({
      content: [
        {
          numProcesso: "123",
          nomeProduto: "NOVALGINA",
          razaoSocial: "SANOFI",
          idBulaPacienteProtegido: "abc",
        },
      ],
      totalElements: 1,
    });
    const source = makeSource(client);
    const result = await source.searchByName({ nome: "novalgina" });

    expect(result).toHaveLength(1);
    expect(result[0].nomeProduto).toBe("NOVALGINA");
    expect(result[0].numProcesso).toBe("123");
    expect(result[0].empresa).toBe("SANOFI");
  });

  it("uses 1-indexed pagination (no -1 offset)", async () => {
    const client = makeMockClient({ content: [], totalElements: 0 });
    const source = makeSource(client);
    await source.searchByName({ nome: "test", pagina: 3, count: 5 });

    // Verifica que o cliente foi chamado com page=3, NÃO page=2
    expect(client.get).toHaveBeenCalledWith(
      "/api/consulta/bulario",
      expect.objectContaining({ page: "3", count: "5" })
    );
  });

  it("returns empty array when content is absent", async () => {
    const client = makeMockClient({});
    const source = makeSource(client);
    const result = await source.searchByName({ nome: "xyz" });
    expect(result).toEqual([]);
  });

  it("propagates SourceAuthError from client", async () => {
    const client = makeMockClientWithError(new SourceAuthError("auth required"));
    const source = makeSource(client);
    await expect(source.searchByName({ nome: "test" })).rejects.toThrow("auth required");
  });
});

describe("AnvisaApiSource.getDetalhes — schema novo (2026)", () => {
  it("maps nomeComercial from new schema", async () => {
    const client = makeMockClient({
      codigoProduto: 999,
      nomeComercial: "NOVALGINA",
      numeroRegistro: "186200018",
      principioAtivo: "dipirona monoidratada",
      empresa: { razaoSocial: "SANOFI MEDLEY", cnpj: "10588595001092" },
      processo: { numero: "25351617747202347" },
      codigoBulaPaciente: "jwt.token.aqui",
      codigoBulaProfissional: "jwt.token.outro",
      classesTerapeuticas: ["ANALGESICOS NAO NARCOTICOS"],
    });
    const source = makeSource(client);
    const result = await source.getDetalhes("25351617747202347");

    expect(result.nomeProduto).toBe("NOVALGINA");
    expect(result.empresa).toBe("SANOFI MEDLEY");
    expect(result.cnpj).toBe("10588595001092");
    expect(result.numProcesso).toBe("25351617747202347");
    expect(result.idBulaPacienteProtegido).toBe("jwt.token.aqui");
    expect(result.idBulaProfissionalProtegido).toBe("jwt.token.outro");
    expect(result.classesTerapeuticas).toEqual(["ANALGESICOS NAO NARCOTICOS"]);
    expect(result.principioAtivo).toBe("dipirona monoidratada");
    expect(result.numeroRegistro).toBe("186200018");
  });

  it("falls back to legacy fields when new schema absent", async () => {
    const client = makeMockClient({
      numProcesso: "456",
      nomeProduto: "MORFINA",
      razaoSocial: "CRISTALIA",
      tarja: "TARJA PRETA",
    });
    const source = makeSource(client);
    const result = await source.getDetalhes("456");

    expect(result.nomeProduto).toBe("MORFINA");
    expect(result.empresa).toBe("CRISTALIA");
    expect(result.tarja).toBe("PRETA");
  });

  it("handles missing tarja gracefully", async () => {
    const client = makeMockClient({
      codigoProduto: 1,
      nomeComercial: "TEST",
      empresa: { razaoSocial: "EM" },
    });
    const source = makeSource(client);
    const result = await source.getDetalhes("789");
    expect(result.tarja).toBeUndefined();
  });

  it("handles classesTerapeuticas as array of objects (legacy schema)", async () => {
    const client = makeMockClient({
      nomeComercial: "X",
      empresa: "Y",
      classesTerapeuticas: [{ descricao: "ANALGESICOS" }, { descricao: "ANTI-INFLAMATORIOS" }],
    });
    const source = makeSource(client);
    const result = await source.getDetalhes("1");
    expect(result.classesTerapeuticas).toEqual(["ANALGESICOS", "ANTI-INFLAMATORIOS"]);
  });
});

describe("AnvisaApiSource.getApresentacoes", () => {
  it("returns presentations from response", async () => {
    const client = makeMockClient({
      apresentacoes: [{ descricao: "500MG COMPRIMIDOS" }, { descricao: "GOTAS 500MG/ML" }],
    });
    const source = makeSource(client);
    const result = await source.getApresentacoes("123");
    expect(result).toHaveLength(2);
    expect(result[0].descricao).toBe("500MG COMPRIMIDOS");
  });

  it("returns empty array when apresentacoes is absent", async () => {
    const client = makeMockClient({});
    const source = makeSource(client);
    const result = await source.getApresentacoes("123");
    expect(result).toEqual([]);
  });

  it("falls back to embalagem when descricao missing", async () => {
    const client = makeMockClient({
      apresentacoes: [{ embalagem: "CAIXA C/ 20 COMPRIMIDOS" }],
    });
    const source = makeSource(client);
    const result = await source.getApresentacoes("123");
    expect(result[0].descricao).toBe("CAIXA C/ 20 COMPRIMIDOS");
  });
});
