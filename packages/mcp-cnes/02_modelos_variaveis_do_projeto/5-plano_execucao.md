# Plano de Execução

## Overview

O `@vetrum/mcp-cnes` v0.1.0 está **completamente implementado**. Este plano documenta a execução realizada, as fases concluídas, o estado de verificação atual e os passos remanescentes para publicação e operação em produção.

Resultado de testes: **101 pass / 0 fail / 0 skip** na suíte de integração (101 casos). Vitest unitário + integração MCP: 24 casos, todos passando.

---

## Current State Analysis

| Componente | Status |
|---|---|
| 8 MCP tools | ✅ Implementado e testado |
| SQLite schema (6 tabelas) | ✅ Implementado e testado |
| Queries SQLite (5 módulos) | ✅ Implementado e testado (40 casos t01) |
| Fallback REST TCU | ✅ Implementado; testes pulados por falta de rede |
| Pipeline FTP + blast | ✅ Implementado; testes pulados por falta de rede/blast |
| Vitest unitários | ✅ 26 casos passando |
| Integração 101 casos | ✅ 101 pass / 0 fail / 0 skip |
| Biome lint | ✅ Passando |
| TypeScript typecheck | ✅ Passando |
| Build `dist/` | ✅ Compilando |
| `.npmignore` | ✅ Criado |
| Publicação npm | ⏳ Pendente |
| Sync com dados reais | ⏳ Pendente (requer blast + FTP) |
| README PT-BR completo | ⏳ Verificar |

---

## Desired End State

1. `npm publish` completo com `@vetrum/mcp-cnes` no registry público
2. Sync com dados reais DATASUS executado ao menos 1 UF (SP) para validação
3. Servidor testado em produção com Claude Desktop ou Claude Code
4. README com instalação, casos de uso e aviso LGPD/defasagem

---

## Key Discoveries

1. **Campo `descricao` em `ServicoOutput`**: o tipo usa `descricao`, não `descricaoServico` — bug encontrado e corrigido nos testes de integração.
2. **`checkFtp()` TCP-only**: a verificação original de FTP apenas testava conexão TCP, não listagem de diretório — corrigido para `listarArquivos("ST","SP")` real.
3. **FTP modo passivo bloqueado**: em ambiente Windows atual, FTP DATASUS não retorna listagens — confirma necessidade de documentação de requisito de rede.
4. **Biome organizeImports**: imports de tipo devem vir antes de imports de valor no mesmo `from`.
5. **`padStart(13,"0")` no fallback TCU**: formato real do `codUnidade` na API TCU não confirmado; teste F07 foi criado para diagnóstico mas não executou por falta de rede.

---

## What We're NOT Doing

- Cache de consultas com invalidação na ingestão (v0.2.0+)
- Publicação Smithery / Glama (v0.1.1+)
- CI/CD GitHub Actions (pós-publicação)
- FHIR mapper ativo (aguarda MCP RNDS)
- Suporte uvx / Python FastMCP
- Modo ativo FTP ou mirror HTTP DATASUS
- Rate limiting por client MCP
- Dados PHI de pacientes em qualquer camada
- Testes de carga / stress

---

## Implementation Approach

A implementação seguiu o padrão do MCP 1 (Bulário):
1. Schema SQLite → queries → tools → server → entrypoint (bottom-up)
2. Fallback online paralelo ao SQLite (não substituto)
3. Sync como CLI separado do servidor MCP
4. Testes unitários Vitest + suíte de integração própria com seed realista
5. Biome para lint/format desde o primeiro arquivo

---

## Implementação Fase 1 — Core (Concluído)

**Objetivo**: servidor MCP funcional com SQLite + 8 tools + Vitest

| Tarefa | Arquivo(s) | Status |
|---|---|---|
| Schema SQLite + connection | `src/db/schema.ts`, `src/db/connection.ts` | ✅ |
| Queries por módulo | `src/db/queries/*.ts` | ✅ |
| Dicionários DATASUS | `src/db/tipos_unidade.ts`, `leitos_tipos.ts`, `equipamentos_tipos.ts` | ✅ |
| Zod schemas + output types | `src/tools/schemas.ts` | ✅ |
| Annotations MCP | `src/tools/annotations.ts` | ✅ |
| 8 tools MCP | `src/tools/buscar_*.ts`, `src/tools/listar_*.ts` | ✅ |
| Server + entrypoint | `src/server.ts`, `src/index.ts` | ✅ |
| Testes unitários Vitest | `tests/unit/db/queries.test.ts` | ✅ |
| Testes integração MCP Vitest | `tests/integration/server.test.ts` | ✅ |
| Seed fixtures Vitest | `tests/fixtures/seed.ts` | ✅ |

**Automated Verification**:
```
npm test           → 26 casos, todos passando
npm run typecheck  → sem erros
npm run lint       → sem warnings
npm run build      → dist/ gerado
```

---

## Implementação Fase 2 — Sync + Fallback + Integração (Concluído)

**Objetivo**: pipeline FTP DATASUS + fallback TCU + suíte de integração 101 casos

| Tarefa | Arquivo(s) | Status |
|---|---|---|
| Fallback REST TCU | `src/fallback/client.ts`, `src/fallback/types.ts` | ✅ |
| FTP client | `src/sync/ftp.ts` | ✅ |
| Conversor DBC→CSV | `src/sync/convert.ts` | ✅ |
| Ingestor CSV→SQLite | `src/sync/ingest.ts` | ✅ |
| Mappers ST/LT/EQ/PF/SR | `src/sync/mappers/*.ts` | ✅ |
| State sync_log | `src/sync/state.ts` | ✅ |
| CLI de sync | `src/sync/index.ts` | ✅ |
| Assert helpers | `integration-tests/bin/helpers/assert.ts` | ✅ |
| Reporter JSON+MD | `integration-tests/bin/helpers/reporter.ts` | ✅ |
| Seed hospitais referência | `integration-tests/bin/seed/hospitals.ts` | ✅ |
| Seed + enriquecimento API | `integration-tests/bin/seed/seed-api.ts` | ✅ |
| Suite t01 queries (40) | `integration-tests/bin/tests/t01-queries.ts` | ✅ |
| Suite t02 tools (30) | `integration-tests/bin/tests/t02-tools.ts` | ✅ |
| Suite t03 fallback (7) | `integration-tests/bin/tests/t03-fallback.ts` | ✅ (mock HTTP local — 0 skips) |
| Suite t04 FTP+blast (9) | `integration-tests/bin/tests/t04-ftp.ts` | ✅ (mock FTP + fake blast — 0 skips) |
| Suite t05 cenários (15) | `integration-tests/bin/tests/t05-scenarios.ts` | ✅ |
| Orquestrador run-all | `integration-tests/bin/run-all.ts` | ✅ |
| Scripts package.json | `package.json` | ✅ |

**Automated Verification**:
```
npm run test:integration → 101 pass / 0 fail / 0 skip
```

**Manual Verification**:
- [ ] Instalar `blast` real e executar com FTP acessível (sem VETRUM_FTP_MOCK)
- [ ] Em rede com acesso FTP passivo → verificar listagem real DATASUS
- [ ] Em rede com API TCU acessível → confirmar formato `codUnidade` (7 vs 13 dígitos)
- [ ] `npm run sync -- --uf SP --grupos ST` → log deve mostrar registros ingeridos

---

## Implementação Fase 3 — Publicação (Pendente)

| Tarefa | Comando / Arquivo | Status |
|---|---|---|
| Criar `.npmignore` | `.npmignore` | ✅ |
| Verificar `README.md` PT-BR | `README.md` | ⏳ |
| `git init` + commit inicial | `git init && git add . && git commit` | ⏳ |
| `npm login` no registry | `npm login` | ⏳ |
| `npm publish --access public` | — | ⏳ |
| Criar repositório GitHub | `github.com/vetrum/mcp-cnes` | ⏳ |
| `git remote add origin` + push | — | ⏳ |

---

## Testing Strategy

### Automated
| Comando | Cobertura | Gate |
|---|---|---|
| `npm test` | unitários + integração MCP | obrigatório |
| `npm run test:integration` | 101 casos end-to-end | obrigatório |
| `npm run lint` | Biome estático | obrigatório |
| `npm run typecheck` | TypeScript strict | obrigatório |
| `npm run build` | compilação dist/ | obrigatório |

### Manual (pré-publicação)
1. `npm run dev` → verificar conexão MCP via Claude Desktop
2. Listar tools no cliente MCP → confirmar 8 tools com descrições corretas
3. `buscar_por_codigo_cnes` com CNES 2077485 → confirmar HC FMUSP
4. `listar_profissionais` → confirmar CPF mascarado
5. `npm run sync --uf SP --grupos ST` (com blast + FTP) → confirmar ingestão

### Degradação graciosa
- Sem blast: sync falha com `BlastNaoEncontradoError` + instruções de instalação
- Sem FTP: sync falha por timeout; fallback TCU serve consultas básicas
- Sem rede: testes t03/t04 pulados automaticamente

---

## Performance Considerations

- SQLite WAL: reads simultâneos sem bloqueio
- Prepared statements: compilados uma vez, reutilizados
- `better-sqlite3` síncrono: sem overhead de event loop para queries locais
- T30 confirmado: todas as 5 tools críticas < 500ms (típico: 0-3ms com seed)
- Ingestão: UPSERT em lotes de 1.000 com `db.transaction()` — estimativa ~100k registros/minuto

---

## Migration Notes

- **Não há migração de schema**: o schema é criado via `CREATE TABLE IF NOT EXISTS` na primeira execução.
- **Re-ingestão idempotente**: `INSERT OR REPLACE` garante que re-executar sync não duplica dados.
- **Novo campo futuro**: adicionar coluna no schema requer `ALTER TABLE ... ADD COLUMN` ou recriar o banco — documentar como breaking change em v0.2.0 se necessário.
- **Env var**: `VETRUM_CNES_DB_PATH` permite mover o banco sem reconfigurar o servidor.

---

## References

- CNES DATASUS FTP: `ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/`
- Grupos FTP: ST (estabelecimentos), LT (leitos), EQ (equipamentos), PF (profissionais), SR (serviços)
- API TCU fallback: `http://mobile-aceite.tcu.gov.br/mapa-da-saude/rest/`
- blast CLI: `https://github.com/datasus/blast/releases`
- MCP SDK: `@modelcontextprotocol/sdk` v1.29.0
- Relatório de integração: `integration-tests/results/latest/summary.md`
