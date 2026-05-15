# STATUS FINAL — MCP CNES (@mcpassure/mcp-cnes v1.1.0)

Data de conclusão: 2026-05-13
Versão anterior: v1.0 (arquivo mantido como referência em git)

---

## Artefatos produzidos

### Documentos (v1.0 — preservados)

| Etapa | Artefato | Localização |
|---|---|---|
| 1 — Pesquisa | `2-pesquisa.md` | `02_modelos_variaveis_do_projeto/2-pesquisa.md` |
| 2 — PRD | `3-prd.md` | `02_modelos_variaveis_do_projeto/3-prd.md` |
| 3 — Spec Técnica v1.0 | `4-spec.md` | `02_modelos_variaveis_do_projeto/4-spec.md` |
| 4 — Plano v1.0 | `5-plano_execucao.md` | `02_modelos_variaveis_do_projeto/5-plano_execucao.md` |
| 6 — Validação v1.0 | `6-validacao.md` | `02_modelos_variaveis_do_projeto/6-validacao.md` |
| 7 — Entrega v1.0 | `7-entrega.md` | `02_modelos_variaveis_do_projeto/7-entrega.md` |

### Documentos (v1.1 — novos)

| Etapa | Artefato | Localização |
|---|---|---|
| 4 — Plano v1.1 | `5-plano_execucao-v11.md` | `02_modelos_variaveis_do_projeto/5-plano_execucao-v11.md` |
| 6 — Validação v1.1 | `6-validacao-v11.md` | `02_modelos_variaveis_do_projeto/6-validacao-v11.md` |
| 7 — Entrega v1.1 | `7-entrega-v11.md` | `02_modelos_variaveis_do_projeto/7-entrega-v11.md` |
| 8 — Plano Testes v1.1 | `plano.md` | `08_testes_integrados/plano.md` |
| 8 — Resultado Run | `relatorio.md` | `08_testes_integrados/resultados/run_2026-05-13T18-13-18/relatorio.md` |

### Código-fonte (v1.1 — arquivos novos)

| Arquivo | Finalidade |
|---|---|
| `src/domain/types.ts` | Tipos `Meta` e `ResponseWithMeta<T>` |
| `src/domain/repository.ts` | Interface `ICnesRepository` + classe `CnesRepository` (adapter) |
| `src/utils/meta.ts` | `buildMeta(db)` e `buildFallbackMeta()` |
| `src/sources/schemas/cnes_dbc_layout.v1.json` | Schema baseline DBC — 5 grupos (ST, LT, EQ, PF, SR) |
| `scripts/canary.ts` | Canário upstream: FTP DATASUS + REST TCU + schema baseline |
| `.github/workflows/canary.yml` | GitHub Actions cron `0 3 * * *` |
| `STATUS.md` | Estado do último canário |
| `docs/pt-br/runbook-fonte.md` | 4 procedimentos de diagnóstico de fonte |
| `.nvmrc` | Node 18 (usado pelo canary.yml) |
| `tests/domain/repository.test.ts` | 7 testes unitários do repositório |
| `integration-tests/bin/tests/t06-meta.ts` | 8 testes integrados de `_meta` (M01–M08) |
| `08_testes_integrados/binarios/fixtures/M01_meta_buscar_por_codigo_cnes.json` | Fixture M01 |
| `08_testes_integrados/binarios/fixtures/M08_meta_todas_tools.json` | Fixture M08 |
| `08_testes_integrados/binarios/fixtures/FALLBACK_meta_online_fallback.json` | Fixture fallback |

---

## Decisões importantes

### Mantidas da v1.0

1. **Stack TypeScript.** MCPAssure adota TypeScript para todos os MCPs da série.
2. **DBC → blast CLI.** Não existe biblioteca TypeScript nativa para DBC do DATASUS. Pré-requisito apenas do sync.
3. **Fallback REST API TCU.** Dataset vazio → `buscar_por_codigo_cnes` / `buscar_por_nome` usam TCU REST.
4. **CPF mascarado por padrão.** `***.XXX.XXX-**` sem opção de desmascarar.
5. **SQLite síncrono (better-sqlite3).** MCP stdio: 1 request/vez → sem risco de lock.
6. **Sem ORM.** Queries SQL diretas para simplicidade e performance máxima.
7. **5 grupos FTP no MVP.** ST, LT, EQ, PF, SR. Out-of-scope na v1.x.

### Novas da v1.1

8. **Adapter pattern (ICnesRepository).** Todas as 8 tools delegam para `CnesRepository`. Dados fluem de SQLite local ou TCU REST conforme `isDatasetEmpty()`. Sem lógica de orquestração nas tools.

9. **`_meta` obrigatório em 100% dos responses.** Estrutura `{data: T, _meta: Meta}` em todas as tools. Breaking change de v1.0 (formato plano → wrapped). `_meta` inclui: `competencia`, `defasagem_dias`, `fonte`, `modo`, `status`.

10. **`modo = "cache_local"` vs `"online_fallback"`.** `buildMeta(db)` lê `sync_log`, detecta competência e staleness. `buildFallbackMeta()` retorna modo=online_fallback com fonte="REST TCU fallback".

11. **`status = "stale"` quando defasagem > `MCPASSURE_DEGRADED_THRESHOLD_DAYS` (padrão 75 dias).** Modo degraded exposto via `_meta.status`.

12. **Rebrand completo vetrum → mcpassure.** `package.json`, env vars (`MCPASSURE_*`), caminhos (`~/.local/share/mcpassure/cnes`), User-Agent, URLs.

13. **Canário diário GitHub Actions.** FTP DATASUS + REST TCU + schema baseline. Falha abre issue `[upstream-drift]` automaticamente. Sucesso atualiza `STATUS.md`.

14. **`_meta.competencia = ""` quando sync_log vazio.** Comportamento correto nos testes de integração: seed não popula sync_log. O caso com sync_log populado é validado nos unit tests de repository.

---

## Verificações automáticas finais (v1.1)

| Verificação | Resultado |
|---|---|
| `npm run typecheck` (tsc) | ✅ PASS — 0 erros |
| `npm test` (Vitest) | ✅ PASS — 31/31 testes (7 novos de repository) |
| `npm run test:integration -- --offline` | ✅ PASS — 93/93, 0 falhas, 0 skips, 60ms |
| Suíte t06-meta | ✅ PASS — 8/8 (M01–M08) |
| Suíte t01-queries | ✅ PASS — 40/40 |
| Suíte t02-tools | ✅ PASS — 30/30 |
| Suíte t05-scenarios | ✅ PASS — 15/15 |

---

## Riscos remanescentes

| Risco | Impacto | Mitigação |
|---|---|---|
| `blast` CLI não instalado | Script de sync não funciona | `BlastNaoEncontradoError` com instruções; server funciona via fallback TCU |
| FTP passivo bloqueado | Sync não funciona | Executar sync em Linux/VPS |
| REST API TCU indisponível/depreciada | Fallback não funciona com SQLite vazio | Retry 3x + backoff; erro claro; canário alerta |
| DBC layout muda no DATASUS | Ingestão quebra silenciosamente | Canário valida schema baseline; issue `[upstream-drift]` gerada |
| Competência não populada em testes integrados | `_meta.competencia = ""` | Esperado; unit tests validam caso com sync_log populado |
| t03-fallback e t04-ftp nunca executados | Cobertura parcial | Executar `test:integration` (sem --offline) com rede ativa |
| Performance com dataset nacional não medida | Latência pode exceder 500ms | Índices SQLite; medir após sync real |
| GitHub Actions ainda não configurado | Canário não roda | Fazer push para github.com/mcpassure/mcp-cnes |

---

## Próximos passos para publicação

1. `git init && git remote add origin github.com/mcpassure/mcp-cnes`
2. Push e observar primeiro run do canário (GitHub Actions)
3. Executar `npm run test:integration` (sem `--offline`) para validar t03 e t04
4. Executar `npm run canary` local com rede para validar FTP e TCU
5. Confirmar canário verde por 7 dias
6. `npm publish --access public` com conta `@mcpassure`
7. Validar `npx -y @mcpassure/mcp-cnes` em terminal limpo
8. Testar em Claude Desktop com `claude_desktop_config.json` atualizado
9. Submeter ao MCP Registry, Smithery e Glama
