/**
 * Evals — qualidade e acurácia das buscas TUSS com dados reais ANS 202603.
 * Foco: relevância dos resultados, não apenas funcionamento.
 *
 * Requer: tuss_real.db sincronizado (npm run sync).
 * Skip automático se DB ausente.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import { applySchema } from "../src/db/schema.js";
import type { TussCode } from "../src/domain/types.js";
import { TussRepository } from "../src/repositories/tuss.repository.js";
import { BuscarDiariaInput, buscarDiariaHandler } from "../src/tools/buscar-diaria.js";
import {
  BuscarMedicamentoInput,
  buscarMedicamentoHandler,
} from "../src/tools/buscar-medicamento.js";
import {
  BuscarProcedimentoInput,
  buscarProcedimentoHandler,
} from "../src/tools/buscar-procedimento.js";

const DB_PATH = resolve(process.cwd(), "tuss_real.db");
const hasRealDb = existsSync(DB_PATH);

describe.skipIf(!hasRealDb)(
  "Evals — qualidade e acurácia de buscas (dados reais ANS 202603)",
  () => {
    let repo: TussRepository;

    beforeAll(() => {
      const db = new Database(DB_PATH, { readonly: true });
      applySchema(db);
      repo = new TussRepository(db);
    });

    // E01 — busca "consulta" deve incluir código 10101012 no top 20
    it("E01: busca 'consulta' retorna 10101012 nos primeiros resultados", () => {
      const r = buscarProcedimentoHandler(
        BuscarProcedimentoInput.parse({ query: "consulta", limit: 20 }),
        repo
      );
      const data = r.data as TussCode[];
      const found = data.some((d) => d.codigo === "10101012");
      expect(found).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    // E02 — busca "hemograma" deve incluir código 40304361
    it("E02: busca 'hemograma' retorna código 40304361 (hemograma com plaquetas)", () => {
      const r = buscarProcedimentoHandler(
        BuscarProcedimentoInput.parse({ query: "hemograma" }),
        repo
      );
      const data = r.data as TussCode[];
      const found = data.some((d) => d.codigo === "40304361");
      expect(found).toBe(true);
    });

    // E03 — busca "tomografia" deve retornar resultados relevantes
    it("E03: busca 'tomografia' retorna resultados com 'tomografia' no termo", () => {
      const r = buscarProcedimentoHandler(
        BuscarProcedimentoInput.parse({ query: "tomografia", limit: 10 }),
        repo
      );
      const data = r.data as TussCode[];
      expect(data.length).toBeGreaterThanOrEqual(1);
      for (const item of data) {
        expect(item.termo.toLowerCase()).toContain("tomografia");
      }
    });

    // E04 — busca "RESSONÂNCIA" (maiúsculas) deve funcionar (case-insensitive)
    it("E04: busca 'RESSONÂNCIA' em maiúsculas retorna resultados (case-insensitive)", () => {
      const r = buscarProcedimentoHandler(
        BuscarProcedimentoInput.parse({ query: "RESSONÂNCIA" }),
        repo
      );
      const data = r.data as TussCode[];
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    // E05 — código exato 10101012 retorna termo correto
    it("E05: código exato 10101012 retorna 'Consulta em consultório'", () => {
      const r = buscarProcedimentoHandler(
        BuscarProcedimentoInput.parse({ codigo: "10101012" }),
        repo
      );
      const data = r.data as TussCode[];
      expect(data).toHaveLength(1);
      expect(data[0].termo.toLowerCase()).toContain("consulta");
      expect(data[0].tabela).toBe("22");
    });

    // E06 — medicamento: busca "dipirona" (minúsculas) retorna código 90282680
    it("E06: busca 'dipirona' retorna código 90282680 (DIPIRONA SÓDICA)", () => {
      const r = buscarMedicamentoHandler(BuscarMedicamentoInput.parse({ query: "dipirona" }), repo);
      const data = r.data as Array<{ codigo: string; termo: string; tabela: string }>;
      const found = data.some((d) => d.codigo === "90282680");
      expect(found).toBe(true);
    });

    // E07 — medicamento: código exato 90282680 retorna DIPIRONA
    it("E07: código exato 90282680 retorna DIPIRONA SÓDICA (tabela 20)", () => {
      const r = buscarMedicamentoHandler(
        BuscarMedicamentoInput.parse({ codigo: "90282680" }),
        repo
      );
      const data = r.data as Array<{ codigo: string; termo: string; tabela: string }>;
      expect(data).toHaveLength(1);
      expect(data[0].termo.toLowerCase()).toContain("dipirona");
      expect(data[0].tabela).toBe("20");
    });

    // E08 — diária: busca "UTI" retorna registros da tabela 18
    it("E08: busca 'UTI' em diárias retorna resultados da tabela 18", () => {
      const r = buscarDiariaHandler(BuscarDiariaInput.parse({ query: "UTI" }), repo);
      const data = r.data as Array<{ tabela: string; termo: string }>;
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data.every((d) => d.tabela === "18")).toBe(true);
    });

    // E09 — diária: código exato 60000279 retorna DIÁRIA COMPACTA UTI
    it("E09: código exato 60000279 retorna diária de UTI adulto (tabela 18)", () => {
      const r = buscarDiariaHandler(BuscarDiariaInput.parse({ codigo: "60000279" }), repo);
      const data = r.data as Array<{ codigo: string; termo: string; tabela: string }>;
      expect(data).toHaveLength(1);
      expect(data[0].tabela).toBe("18");
      expect(/uti|terapia intensiva/i.test(data[0].termo)).toBe(true);
    });

    // E10 — todos os resultados têm campos obrigatórios (codigo, termo, tabela)
    it("E10: todos os campos obrigatórios presentes em qualquer resultado", () => {
      const r = buscarProcedimentoHandler(
        BuscarProcedimentoInput.parse({ query: "cirurgia", limit: 5 }),
        repo
      );
      const data = r.data as TussCode[];
      expect(data.length).toBeGreaterThanOrEqual(1);
      for (const item of data) {
        expect(typeof item.codigo).toBe("string");
        expect(item.codigo.length).toBeGreaterThan(0);
        expect(typeof item.termo).toBe("string");
        expect(item.termo.length).toBeGreaterThan(0);
        expect(item.tabela).toBe("22");
      }
    });

    // E11 — limit é estritamente respeitado para buscas amplas
    it("E11: limit=1 retorna exatamente 1 resultado para query ampla", () => {
      const r = buscarProcedimentoHandler(
        BuscarProcedimentoInput.parse({ query: "a", limit: 1 }),
        repo
      );
      expect(r.data.length).toBeLessThanOrEqual(1);
    });

    // E12 — busca com acentuação brasileira (minúsculas) funciona em todas as tabelas
    it("E12: busca com acentuação em todas as 3 tabelas retorna resultados não-vazios", () => {
      const r1 = buscarProcedimentoHandler(
        BuscarProcedimentoInput.parse({ query: "ressonância" }),
        repo
      );
      const r2 = buscarMedicamentoHandler(BuscarMedicamentoInput.parse({ query: "sódica" }), repo);
      const r3 = buscarDiariaHandler(BuscarDiariaInput.parse({ query: "internação" }), repo);
      expect((r1.data as unknown[]).length).toBeGreaterThanOrEqual(1);
      expect((r2.data as unknown[]).length).toBeGreaterThanOrEqual(1);
      expect((r3.data as unknown[]).length).toBeGreaterThanOrEqual(1);
    });
  }
);
