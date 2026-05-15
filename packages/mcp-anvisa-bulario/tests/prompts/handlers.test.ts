import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IBularioRepository } from "../../src/domain/repository.js";
import {
  handleAnalisarApresentacoes,
  handleCompararTarjasPorClasse,
  handleVerificarMedicamentoCompleto,
} from "../../src/prompts/handlers.js";

const mockMeta = {
  data_da_base: "2026-05-14T00:00:00.000Z",
  fonte: "anvisa_api",
  defasagem_dias: 0,
  modo: "online" as const,
  status: "ok" as const,
};

function makeRepository(override?: Partial<IBularioRepository>): IBularioRepository {
  return {
    searchByName: vi.fn().mockResolvedValue({
      data: [
        {
          numProcesso: "25351.123456/2020-00",
          nomeProduto: "DIPIRONA SÓDICA",
          empresa: "LABORATÓRIO TESTE",
          idBulaPacienteProtegido: "abc123",
          idBulaProfissionalProtegido: "def456",
          dataAtualizacao: "2026-01-01",
        },
      ],
      _meta: mockMeta,
    }),
    searchByPrincipalAtivo: vi.fn().mockResolvedValue({ data: [], _meta: mockMeta }),
    searchByClasseTerapeutica: vi.fn().mockResolvedValue({
      data: [
        {
          numProcesso: "25351.000001/2020-00",
          nomeProduto: "AMOXICILINA TESTE",
          empresa: "PHARMA A",
        },
        {
          numProcesso: "25351.000002/2020-00",
          nomeProduto: "AZITROMICINA TESTE",
          empresa: "PHARMA B",
        },
      ],
      _meta: mockMeta,
    }),
    searchByTarja: vi.fn().mockResolvedValue({ data: [], _meta: mockMeta }),
    getDetalhes: vi.fn().mockResolvedValue({
      data: {
        numProcesso: "25351.123456/2020-00",
        nomeProduto: "DIPIRONA SÓDICA",
        empresa: "LABORATÓRIO TESTE",
        tarja: "LIVRE",
        classesTerapeuticas: ["Analgésico"],
        principioAtivo: "dipirona sódica",
      },
      _meta: mockMeta,
    }),
    getApresentacoes: vi.fn().mockResolvedValue({
      data: [
        { descricao: "500 mg comprimido cx 20" },
        { descricao: "500 mg/mL solução injetável fr 2mL" },
      ],
      _meta: mockMeta,
    }),
    getBulaLink: vi.fn().mockResolvedValue({
      data: { id: "abc123", urlPdf: "https://anvisa.gov.br/bula/abc123.pdf" },
      _meta: mockMeta,
    }),
    ...override,
  };
}

describe("handleVerificarMedicamentoCompleto", () => {
  let repository: IBularioRepository;

  beforeEach(() => {
    repository = makeRepository();
  });

  it("retorna mensagens com dados do medicamento encontrado por nome", async () => {
    const messages = await handleVerificarMedicamentoCompleto(
      { termo: "dipirona", incluir_apresentacoes: false, incluir_bula: false },
      repository
    );
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].content.text).toContain("DIPIRONA SÓDICA");
    expect(messages[1].content.text).toContain("LABORATÓRIO TESTE");
  });

  it("inclui apresentações quando incluir_apresentacoes=true", async () => {
    const messages = await handleVerificarMedicamentoCompleto(
      { termo: "dipirona", incluir_apresentacoes: true, incluir_bula: false },
      repository
    );
    expect(repository.getApresentacoes).toHaveBeenCalled();
    expect(messages[1].content.text).toContain("500 mg");
  });

  it("inclui link da bula quando incluir_bula=true", async () => {
    const messages = await handleVerificarMedicamentoCompleto(
      { termo: "dipirona", incluir_apresentacoes: false, incluir_bula: true },
      repository
    );
    expect(repository.getBulaLink).toHaveBeenCalled();
    expect(messages[1].content.text).toContain("anvisa.gov.br");
  });

  it("faz fallback para busca por princípio ativo quando busca por nome falha", async () => {
    const repoFallback = makeRepository({
      searchByName: vi.fn().mockRejectedValue(new Error("nome falhou")),
      searchByPrincipalAtivo: vi.fn().mockResolvedValue({
        data: [{ numProcesso: "999", nomeProduto: "IBUPROFENO GENÉRICO", empresa: "PHARMA X" }],
        _meta: mockMeta,
      }),
    });
    const messages = await handleVerificarMedicamentoCompleto(
      { termo: "ibuprofeno", incluir_apresentacoes: false, incluir_bula: false },
      repoFallback
    );
    expect(repoFallback.searchByPrincipalAtivo).toHaveBeenCalled();
    expect(messages[1].content.text).toContain("IBUPROFENO GENÉRICO");
  });

  it("retorna mensagem de erro quando ambas buscas falham", async () => {
    const repoFail = makeRepository({
      searchByName: vi.fn().mockRejectedValue(new Error("falha nome")),
      searchByPrincipalAtivo: vi.fn().mockRejectedValue(new Error("falha pa")),
    });
    const messages = await handleVerificarMedicamentoCompleto(
      { termo: "xyz", incluir_apresentacoes: false, incluir_bula: false },
      repoFail
    );
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].content.text).toContain("Não foi possível");
  });

  it("retorna mensagem de não encontrado quando lista vazia", async () => {
    const repoEmpty = makeRepository({
      searchByName: vi.fn().mockResolvedValue({ data: [], _meta: mockMeta }),
    });
    const messages = await handleVerificarMedicamentoCompleto(
      { termo: "xyz123", incluir_apresentacoes: false, incluir_bula: false },
      repoEmpty
    );
    expect(messages[0].content.text).toContain("Nenhum medicamento encontrado");
  });

  it("contém disclaimer ANVISA no rodapé", async () => {
    const messages = await handleVerificarMedicamentoCompleto(
      { termo: "dipirona", incluir_apresentacoes: false, incluir_bula: false },
      repository
    );
    expect(messages[1].content.text).toContain("Aviso ANVISA");
  });
});

describe("handleCompararTarjasPorClasse", () => {
  let repository: IBularioRepository;

  beforeEach(() => {
    repository = makeRepository();
  });

  it("retorna agrupamento por tarja para uma classe terapêutica", async () => {
    const messages = await handleCompararTarjasPorClasse(
      { classe_terapeutica: "antibiótico", limite: 50 },
      repository
    );
    expect(messages).toHaveLength(2);
    expect(messages[1].content.text).toContain("antibiótico");
    expect(messages[1].content.text).toContain("Tarja Vermelha");
    expect(messages[1].content.text).toContain("Tarja Preta");
  });

  it("retorna erro quando busca por classe falha", async () => {
    const repoFail = makeRepository({
      searchByClasseTerapeutica: vi.fn().mockRejectedValue(new Error("API down")),
    });
    const messages = await handleCompararTarjasPorClasse(
      { classe_terapeutica: "analgésico", limite: 10 },
      repoFail
    );
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].content.text).toContain("Erro ao buscar");
  });
});

describe("handleAnalisarApresentacoes", () => {
  let repository: IBularioRepository;

  beforeEach(() => {
    repository = makeRepository();
  });

  it("agrupa apresentações por concentracao", async () => {
    const messages = await handleAnalisarApresentacoes(
      { nome_medicamento: "dipirona", agrupar_por: "concentracao" },
      repository
    );
    expect(messages).toHaveLength(2);
    expect(messages[1].content.text).toContain("500 mg");
  });

  it("agrupa apresentações por forma_farmaceutica", async () => {
    const messages = await handleAnalisarApresentacoes(
      { nome_medicamento: "dipirona", agrupar_por: "forma_farmaceutica" },
      repository
    );
    expect(messages[1].content.text).toContain("Comprimido");
  });

  it("retorna mensagem de não encontrado quando lista vazia", async () => {
    const repoEmpty = makeRepository({
      searchByName: vi.fn().mockResolvedValue({ data: [], _meta: mockMeta }),
    });
    const messages = await handleAnalisarApresentacoes(
      { nome_medicamento: "xyz999", agrupar_por: "concentracao" },
      repoEmpty
    );
    expect(messages[0].content.text).toContain("Nenhum medicamento encontrado");
  });
});
