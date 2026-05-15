/**
 * http.integration.test.ts — v2.0 stub
 *
 * O HttpClient baseado em Playwright foi removido em v2.0.
 * A fonte de dados agora é o CSV dados.anvisa.gov.br via SQLite local.
 * Estes testes foram substituídos pelos integration tests do BularioDatasetSource.
 *
 * Previsto para v2.1: testes de validação do CSV download e parsing.
 */
import { describe, expect, it } from "vitest";

describe("HttpClient (v1.0 Playwright) — removido em v2.0", () => {
  it("HttpClient foi removido — fonte agora é CSV ANVISA via SQLite", () => {
    // v2.0: Playwright removido. Fonte = dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv
    expect(true).toBe(true);
  });
});
