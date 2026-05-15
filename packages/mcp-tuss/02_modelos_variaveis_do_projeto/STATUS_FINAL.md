# STATUS FINAL — @mcpassure/mcp-tuss v0.1.0

**Data:** 2026-05-13 (atualizado 22:03)
**Status:** ✅ Implementação completa, testes passando, build limpo

---

## Resumo

MCP server para consulta de tabelas TUSS (procedimentos, medicamentos, diárias/taxas) com dados reais da ANS. 84 testes passando (22 unit + 25 integration + 12 evals + 25 integrados), 53.250 registros reais no banco.

---

## Artefatos produzidos

| Artefato | Localização | Status |
|----------|-------------|--------|
| Código-fonte | `src/` (16 arquivos) | ✅ |
| Constantes centralizadas | `src/constants.ts` | ✅ |
| Testes unitários | `tests/tools/` | ✅ 22/22 |
| Testes de integração Vitest | `tests/integration/` | ✅ 25/25 |
| Evals (qualidade de busca) | `evals/evals.test.ts` | ✅ 12/12 |
| Testes integrados run_all | `08_testes_integrados/` | ✅ 25/25 |
| Build compilado | `dist/` | ✅ |
| Canary script | `scripts/canary.ts` | ✅ |
| Documentos de projeto | `02_modelos_variaveis_do_projeto/` | ✅ |
| Plano testes integrados | `08_testes_integrados/plano.md` | ✅ |
| Fixtures (25 cenários) | `08_testes_integrados/binarios/fixtures/` | ✅ |
| Última run com logs | `08_testes_integrados/resultados/run_20260513_T230402/` | ✅ |

---

## Decisões técnicas importantes

1. **Download para disco**: `Readable.fromWeb()` não mantém o event loop ativo no Node.js 22. Solução: `https.get()` + arquivo temporário + `unzipper.Open.file()`.

2. **Parser XLSX customizado**: Sem SheetJS (licença SSPL pós v0.18.5). Parser manual via ZIP Central Directory + XML regex.

3. **Filtro de códigos numéricos**: TUSS 20 tem row de header na linha de dados. Filtro `!/^\d+$/.test(codigo)` resolve sistematicamente.

4. **Scope v1**: Apenas TUSS 22, 20, 18. Rol ANS entra na v0.2.0. **CBHPM removida permanentemente (2026-05-15) — propriedade intelectual da AMB, não é base aberta.** TUSS 19 (105MB) segue out-of-scope por performance.

5. **TLS dev**: `MCPASSURE_INSECURE_TLS=1` para ambientes com proxy SSL interceptador (Norton, Zscaler). NÃO usar em CI/produção.

6. **Threshold degraded**: Default 120 dias (spec sugere 90). Decisão conservadora documentada em 6-validacao.md (D6).

7. **Unicode case-insensitive search**: SQLite LIKE e UPPER() são ASCII-only. TUSS 18/20 armazenam em MAIÚSCULAS (Ã, Ç). Solução: função `unicodelower()` registrada via better-sqlite3 usando JS `.toLowerCase()` em todas as queries de texto.

---

## Dados reais verificados (202603)

| Tabela | Registros | Última versão |
|--------|-----------|---------------|
| TUSS 22 | 5.966 | 202603 |
| TUSS 20 | 43.688 | 202603 |
| TUSS 18 | 3.596 | 202603 |

---

## Riscos remanescentes

| # | Risco | Impacto | Mitigação |
|---|-------|---------|-----------|
| R1 | ANS muda estrutura do ZIP | Alto | Regex cascata + CI canary semanal |
| R2 | Certificado TLS em CI distinto | Médio | GitHub Actions Linux → CA nativa funciona |
| R3 | Header row em futuros releases | Baixo | Filtro numérico é robusto |
| R4 | DB sem sync (first run) | Baixo | `modo: "cache_vazio"` em todos os tools |
