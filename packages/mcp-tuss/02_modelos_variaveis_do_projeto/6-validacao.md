# Validação — @mcpassure/mcp-tuss v0.1.0

**Data:** 2026-05-13 (atualizado 22:03)
**Versão validada:** 0.1.0
**Status geral:** ✅ APROVADO

---

## Escopo validado

Implementação completa do MCP server `@mcpassure/mcp-tuss v0.1.0` — consulta a tabelas TUSS da ANS (procedimentos, medicamentos, diárias/taxas) com 4 tools MCP, banco SQLite local, sincronizador ZIP→XLSX→SQLite, e canary de conectividade.

**Escopo v0.1.0:** TUSS tabelas 22, 20, 18 (53.250 registros reais ANS 202603).
**Fora de escopo v1:** Rol ANS (403), CBHPM (pago/AMB), TUSS Tab.19 OPME (105MB).

---

## Verificações automáticas realizadas

| Verificação | Comando | Resultado |
|-------------|---------|-----------|
| Lint | `npm run lint` (biome check src tests evals scripts) | ✅ 0 erros (24 arquivos) |
| TypeScript strict | `npx tsc --noEmit` | ✅ 0 erros |
| Testes unitários | `npx vitest run` | ✅ 22/22 |
| Testes de integração (Vitest) | `npx vitest run` | ✅ 25/25 |
| Evals (vitest) | `npx vitest run` | ✅ 12/12 (dados reais ANS 202603) |
| Testes integrados (run_all) | `tsx run_all.ts` | ✅ 25/25 (dados reais ANS 202603) |
| Build de produção | `npm run build` | ✅ exit 0 |
| Canary | `MCPASSURE_INSECURE_TLS=1 npm run canary` | ✅ versão 202603 OK |

**Total de testes automatizados: 84/84** (22 unit + 25 integration Vitest + 12 evals + 25 integrados run_all).

---

## Resultado das verificações automáticas

### Testes unitários (Vitest — em memória)

```
Tests  22 passed (22)
```

- `buscar-procedimento.test.ts`: 7 cenários (incl. disclaimer)
- `buscar-medicamento.test.ts`: 5 cenários (incl. disclaimer, sem-args)
- `buscar-diaria.test.ts`: 5 cenários (incl. disclaimer, sem-args)
- `status-sync.test.ts`: 5 cenários (incl. disclaimer)

### Testes de integração Vitest (dados reais tuss_real.db)

```
Tests  25 passed (25)
```

Executados contra DB real com 5.966 + 43.688 + 3.596 registros (TUSS 202603).

| Categoria | Testes | Status |
|-----------|--------|--------|
| Row counts mínimos (22/20/18) | 3 | ✅ |
| Códigos conhecidos por PK | 4 | ✅ |
| Busca textual LIKE | 5 | ✅ |
| sync_log e meta | 5 | ✅ |
| statusSyncHandler com dados reais | 1 | ✅ |
| Qualidade de dados (zero nulos/não-numéricos) | 3 | ✅ |
| Limite e paginação | 3 | ✅ |
| Disclaimer em todos os tools | 1 | ✅ |

### Testes integrados run_all.ts (cenários de usuário real)

```
25/25 PASS — Latência total 39ms — p50=1ms — p99=8ms
```

| Tool | Cenários | PASS | FAIL |
|------|----------|------|------|
| `buscar_procedimento_tuss` | 11 | 11 | 0 |
| `buscar_medicamento_tuss` | 6 | 6 | 0 |
| `buscar_diaria_taxa_tuss` | 6 | 6 | 0 |
| `status_sincronizacao_tuss` | 7 | 7 | 0 |
| `(transversal)` | 1 | 1 | 0 |

### Dados reais verificados (TUSS 202603)

| Tabela | Registros | Verificação spot-check |
|--------|-----------|------------------------|
| TUSS 22 (procedimentos) | 5.966 | código `10101012` = "Consulta em consultório" ✅ |
| TUSS 20 (medicamentos) | 43.688 | código `90282680` = "DIPIRONA SÓDICA" ✅ |
| TUSS 18 (diárias/taxas) | 3.596 | código `60000279` = "DIÁRIA COMPACTA DE ISOLAMENTO DE UTI ADULTO GERAL" ✅ |

---

## Itens pendentes de validação manual

| Item | Motivo da pendência | Responsável |
|------|--------------------|-|
| Teste de smoke no Claude Desktop / Cursor | Requer ambiente MCP cliente real | Daniel |
| Validação de primeira execução (DB vazio → auto-sync) | Requer ambiente limpo sem tuss.db | Daniel |
| Leitura do canary em CI Linux puro (sem INSECURE_TLS) | Requer runner GitHub Actions | CI |

---

## Resultado da validação manual já confirmada

| Item | Status | Observação |
|------|--------|------------|
| Download ZIP 552MB ANS | ✅ | `MCPASSURE_INSECURE_TLS=1` necessário em dev Windows |
| Parse XLSX customizado (sem SheetJS) | ✅ | 53.250 registros ingeridos corretamente |
| Canary HEAD request ANS | ✅ | versão 202603 disponível (552MB) |
| Build dist/ utilizável via `node dist/index.js` | ✅ | servidor MCP inicia sem erros |

---

## Divergências em relação à spec

| # | Item da spec v1.1 | Implementação v0.1.0 | Decisão |
|---|------------------|---------------------|---------|
| D1 | 7 tools (`buscar_tuss_por_codigo`, `buscar_tuss_por_descricao`, `listar_por_categoria`, `validar_cobertura_rol`, `consultar_hierarquia_cbhpm`, `listar_procedimentos_com_cobertura_obrigatoria`, `status_sincronizacao`) | 4 tools: `buscar_procedimento_tuss`, `buscar_medicamento_tuss`, `buscar_diaria_taxa_tuss`, `status_sincronizacao_tuss` | Aceita — Rol ANS (403) e CBHPM (pago) out-of-scope v1 |
| D2 | `ITerminologiaRepository` + 3 sub-repositories (adapter pattern v1.1) | `TussRepository` simples | Aceita — multi-terminologia out-of-scope v1 |
| D3 | `_meta` como array `TerminologiaMeta[]` (uma entrada por terminologia) | `_meta` como objeto único; array apenas em `status_sincronizacao_tuss` | Aceita — single-terminology tools não necessitam array |
| D4 | `MCPASSURE_DEGRADED_THRESHOLD_DAYS` default = 90 dias | Implementado com default = 120 dias | Aceita — documentado em 7-entrega.md |
| D5 | FTS5 virtual tables (`tuss_procedimentos_fts`, etc.) | Índices B-tree NOCASE + `LIKE ?` | Aceita — performance adequada para 53K registros; FTS5 é v2 |
| D6 | `modo: "cache_local" | "online"` | `modo: "cache_local" | "cache_vazio"` | Aceita — não há fallback online em v0.1.0 |
| D7 | Tab.19 OPME (`tuss_materiais`) | Não implementada | Aceita — XLSX 105MB, performance out-of-scope v1 |
| D8 | `cross_mapping.v1.json` + hierarquia CBHPM | Não implementado | Aceita — CBHPM pago, out-of-scope v1 |
| D9 | Canário valida schema upstream múltiplas terminologias | Canário só valida HEAD request ANS TUSS ZIP | Aceita — simplificação adequada para v0.1.0 |

---

## Divergências em relação ao plano

Nenhuma. O plano de execução v0.1.0 foi seguido integralmente. Todas as fases foram concluídas com os artefatos esperados.

---

## Riscos remanescentes

| # | Risco | Impacto | Probabilidade | Mitigação |
|---|-------|---------|---------------|-----------|
| R1 | ANS muda estrutura do ZIP/XLSX | Alto | Baixa | Regex cascata (3 candidatos por tabela) + canary semanal |
| R2 | TLS diferente em CI vs dev | Médio | Baixa | `MCPASSURE_INSECURE_TLS=1` só para dev; CI Linux usa CA nativa |
| R3 | Header row duplicada em futuros releases | Baixo | Baixa | Filtro `!/^\d+$/.test(codigo)` é robusto |
| R4 | DB sem sync na primeira execução | Baixo | Certa | `modo: "cache_vazio"` retornado em todos os tools; mensagem clara |
| R5 | Download 552MB em rede lenta | Médio | Média | Progresso logado a cada 50MB; arquivo temporário evita corrupção |

---

## Conclusão

`@mcpassure/mcp-tuss v0.1.0` está **APROVADO** para publicação manual por Daniel.

**84/84 testes automatizados passando** (22 unit + 25 integration + 12 evals + 25 integrados contra dados reais ANS 202603). Build limpo. Canary OK. Divergências da spec documentadas e aceitas como decisões de escopo v1.

**Bug corrigido nesta iteração:** SQLite LIKE não faz case-fold para caracteres não-ASCII (ã, ç, etc.). TUSS 18/20 armazenam termos em MAIÚSCULAS. Solução: função `unicodelower()` registrada via better-sqlite3 usando `.toLowerCase()` do JS (suporta Unicode) em todas as queries de busca por texto.

Próximos passos para v2:
- Investigar auth Rol ANS (403)
- FTS5 para buscas full-text mais rápidas
- TUSS Tab.19 OPME (performance)
- Multi-terminologia (CBHPM se parceria AMB viabilizar)
