# Validação v1.1 — MCP TUSS / CBHPM / Rol ANS (@mcpassure/mcp-tuss)

**Spec de referência:** 4-spec.md v1.1 (2026-05-13)  
**Código avaliado:** `artifacts/vetrum-tuss-mcp/` (implementação v1.1 — pós-refatoração)  
**Data da validação:** 2026-05-13

---

## Escopo validado

Esta validação compara os requisitos do spec v1.1 contra a implementação v1.1 entregue.  
Cada item é classificado como:

- ✅ **Implementado e conforme** — presente no código e alinhado ao spec
- ⚠️ **Implementado, validação manual pendente** — código produzido, mas requer execução local para confirmar
- ❌ **Não implementado** — ausente

---

## Verificações automáticas realizadas

Leitura direta do código-fonte em `artifacts/vetrum-tuss-mcp/src/`, `tests/`, `evals/`, `.github/`, `scripts/`, `docs/` e `data/`.

### 1. Rebrand Vetrum → MCPAssure

| Item | v1.0 | v1.1 implementado | Status |
|------|------|-------------------|--------|
| Package name | `vetrum-tuss-mcp` | `@mcpassure/mcp-tuss` | ✅ |
| DB path padrão | `~/.vetrum/tuss.db` | `~/.mcpassure/tuss.db` | ✅ |
| Env var DB path | `VETRUM_DB_PATH` | `MCPASSURE_DB_PATH` | ✅ |
| Bin executável | `vetrum-mcp-tuss` | `mcpassure-mcp-tuss` | ✅ |
| User-Agent HTTP | `vetrum-mcp-tuss/...` | `mcpassure-mcp-tuss/1.1 (https://github.com/mcpassure/mcp-tuss)` | ✅ |
| Server name (MCP) | `vetrum-tuss-mcp` | `@mcpassure/mcp-tuss` | ✅ |
| Server version | `1.0.0` | `1.1.0` | ✅ |
| Logs stderr prefix | `[vetrum-mcp-tuss]` | `[mcpassure-mcp-tuss]` | ✅ |
| sync.yml env var | `VETRUM_DB_PATH` | `MCPASSURE_DB_PATH` | ✅ |
| MCPASSURE_VERSION constante | ausente | `"1.1.0"` em constants.ts | ✅ |

### 2. Adapter pattern — camada domain

| Item | Status | Localização |
|------|--------|-------------|
| `src/domain/types.ts` — `TerminologiaMeta`, `ResponseWithMeta<T>`, `ResponseWithMultiMeta<T>`, `CombinedRecord` | ✅ | `src/domain/types.ts` |
| `ITussSubRepository` interface | ✅ | `src/domain/tuss-repository.ts` |
| `TussRepository` impl | ✅ | `src/domain/tuss-repository.ts` |
| `IRolAnsSubRepository` interface | ✅ | `src/domain/rol-repository.ts` |
| `RolAnsRepository` impl | ✅ | `src/domain/rol-repository.ts` |
| `ICbhpmSubRepository` interface | ✅ | `src/domain/cbhpm-repository.ts` |
| `CbhpmRepository` impl | ✅ | `src/domain/cbhpm-repository.ts` |
| `ITerminologiaRepository` interface | ✅ | `src/domain/repository.ts` |
| `TerminologiaRepository` impl | ✅ | `src/domain/repository.ts` |
| `getSyncMeta()` sem queries desnecessárias | ✅ | `src/domain/repository.ts` |
| `buscarPorCodigo()` com `_meta` condicional (CBHPM só Tab.22) | ✅ | `src/domain/repository.ts` |

### 3. _meta em todos os outputs

| Ferramenta | _meta presente | Terminologias cobertas |
|------------|----------------|------------------------|
| `buscar_tuss_por_codigo` | ✅ | [TUSS, Rol ANS] ou [TUSS, Rol ANS, CBHPM] |
| `buscar_tuss_por_descricao` | ✅ | [TUSS] |
| `listar_por_categoria` | ✅ | [TUSS] |
| `validar_cobertura_rol` | ✅ | [TUSS, Rol ANS] |
| `consultar_hierarquia_cbhpm` | ✅ | [TUSS, CBHPM] |
| `listar_procedimentos_com_cobertura_obrigatoria` | ✅ | [TUSS, Rol ANS] |
| `status_sincronizacao` | ✅ | [TUSS, Rol ANS, CBHPM] |

Todos os tools usam `ITerminologiaRepository` — nenhum importa `db/queries.ts` diretamente.

### 4. src/utils/meta.ts

| Função | Status |
|--------|--------|
| `buildTussMeta(db)` — lê `sincronizacao_versoes WHERE tabela='tuss_22'` | ✅ |
| `buildRolAnsMeta(db)` — usa `rn_referencia` como versão | ✅ |
| `buildCbhpmMeta(db)` — usa `CBHPM_EDICAO` + data da tuss_22 | ✅ |
| `calcularDefasagem(dataBase)` — dias desde sync | ✅ |
| `STALE_THRESHOLD_DAYS` via `MCPASSURE_DEGRADED_THRESHOLD_DAYS` env | ✅ |
| `status: "stale"` quando defasagem > threshold | ✅ |

### 5. Baseline schemas e canário

| Item | Status | Localização |
|------|--------|-------------|
| `src/sources/schemas/tuss_codesystem.v1.json` | ✅ | Presente |
| `src/sources/schemas/rol_ans_planilha.v1.json` | ✅ | Presente |
| `src/sources/schemas/cbhpm_amb.v1.json` | ✅ | Presente |
| `scripts/canary.ts` | ✅ | Presente — exit 0/1/2 |
| `.github/workflows/canary.yml` | ✅ | Cron `0 3 * * *`, abre issue com label `upstream-drift` |
| `STATUS.md` na raiz | ✅ | Presente |
| `data/cross_mapping.v1.json` | ✅ | 5 mapeamentos TUSS↔CBHPM↔Rol ANS |
| `docs/pt-br/runbook-fonte.md` | ✅ | 8 seções, cobre todos os cenários de drift |
| Script `canary` em package.json | ✅ | `"canary": "tsx scripts/canary.ts"` |

### 6. Testes

| Conjunto | Arquivos | Status |
|----------|----------|--------|
| `tests/domain/` — 4 novos suítes | tuss-repository, rol-repository, cbhpm-repository, terminologia-repository | ✅ Criados |
| `tests/tools/` — 7 suítes refatorados | Todos migrados de `db: Database` → `ITerminologiaRepository` | ✅ |
| `tests/fixtures.ts` | `createTestDb()` mantido + `createTestRepository()` adicionado | ✅ |
| `evals/evals.test.ts` | 12 evals migrados para `repo: ITerminologiaRepository`, paths `sc.data.*` | ✅ |
| Estrutura de output nos testes | Verificam `structuredContent.data.*` e `structuredContent._meta` | ✅ |

---

## Resultado das verificações automáticas

**Implementação v1.1 completa por leitura de código.**

Todos os 10 requisitos estruturais do spec v1.1 foram implementados:
1. ✅ Rebrand completo (10/10 identificadores)
2. ✅ Camada domain com adapter pattern (9 interfaces/classes)
3. ✅ `_meta` array em 100% dos 7 tools
4. ✅ `buildTussMeta/buildRolAnsMeta/buildCbhpmMeta` com defasagem e status
5. ✅ Baseline schemas JSON (3 arquivos)
6. ✅ `scripts/canary.ts` com saídas 0/1/2
7. ✅ `.github/workflows/canary.yml` com cron diário e criação de issue
8. ✅ `STATUS.md` na raiz
9. ✅ `docs/pt-br/runbook-fonte.md`
10. ✅ `data/cross_mapping.v1.json`

---

## Itens pendentes de validação manual

| # | Item | Comando | Critério de aprovação |
|---|------|---------|----------------------|
| M1 | TypeScript compila sem erros | `npm run typecheck` | Zero erros `tsc --noEmit` |
| M2 | Suite de testes passa | `npm test` | 100% pass em `tests/` |
| M3 | Evals passam | `npm run evals` | 12/12 evals aprovados |
| M4 | Canário executa | `npm run canary` | Exit 0 (fontes upstream acessíveis) |
| M5 | Servidor inicia | `node dist/index.js` | Conexão MCP estabelecida |
| M6 | DB path rebrand | Verificar variável de ambiente | `MCPASSURE_DB_PATH` reconhecida |

---

## Resultado da validação manual já confirmada

Nenhuma validação manual foi executada nesta sessão (ambiente sem execução de Node.js).

**Risco principal:** Possível erro de compilação TypeScript em:
- `src/domain/tuss-repository.ts` — retorno de `ResponseWithMeta<T>` (tipo `_meta` vs campo dentro de objeto)
- `src/domain/repository.ts` — acesso a `tussResult.data.record` (depende da estrutura do `findByCodigo`)

Esses itens devem ser verificados ao executar M1.

---

## Divergências em relação à spec

| Item | Spec v1.1 | Implementado | Classificação |
|------|-----------|-------------|---------------|
| `IBularioRepository` / `ICnesRepository` | Mencionados como exemplos do padrão | Não criados (fora de escopo deste projeto) | Não-divergência — eram exemplos genéricos |
| `defasagem_dias` para CBHPM | Usa data real da CBHPM | Reutiliza `data_sincronizacao` da `tuss_22` | Aceitável — CBHPM não tem data própria no DB; documentado em `buildCbhpmMeta` |
| Canário HTTP | Spec especifica `fetch` nativo | Implementado com `fetch` nativo (Node 20) | ✅ Conforme |
| Canário exit codes | 0=OK, 1=drift, 2=offline | Implementado igual | ✅ Conforme |

---

## Divergências em relação ao plano

| Item | Plano (5-plano_execucao-v11.md) | Realizado | Status |
|------|--------------------------------|-----------|--------|
| Fase 1 — Rebrand | Renomear todos os identificadores | ✅ Completo | OK |
| Fase 2 — Domain layer | Criar ITerminologiaRepository + 3 sub-repos | ✅ Completo | OK |
| Fase 3 — Tool refactor | Migrar 7 tools para ITerminologiaRepository | ✅ Completo | OK |
| Fase 4 — _meta | Adicionar _meta array em todos os outputs | ✅ Completo | OK |
| Fase 5 — Infra | canary.yml, canary.ts, schemas, STATUS.md, runbook, cross_mapping | ✅ Completo | OK |
| Fase 6 — Testes | Novos domain tests + refatoração de tools tests + evals | ✅ Completo | OK |

Nenhuma divergência material em relação ao plano.

---

## Riscos remanescentes

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | Erro de tipo TypeScript em `ResponseWithMeta<T>` nas sub-repos | Média | Alto | Executar `npm run typecheck` antes de publicar |
| R2 | Canário HTTP com `fetch` pode não compilar no TS strict sem `@types/node` | Baixa | Médio | `@types/node` já presente em devDependencies |
| R3 | `buildCbhpmMeta` usa data da tuss_22 como proxy | Baixa | Baixo | Comportamento documentado; CBHPM é fonte estática |
| R4 | Testes domain dependem de acesso ao SQLite in-memory | Baixa | Alto | Fixtures criados; sem dependência de arquivo externo |
| R5 | `data/cross_mapping.v1.json` tem apenas 5 exemplos | Alta | Baixo | Arquivo é demonstrativo; expansão planejada para v1.2 |

---

## Conclusão

A implementação v1.1 está **estruturalmente completa** conforme leitura de código. Todos os requisitos funcionais e arquiteturais do spec v1.1 foram cobertos:

- **Rebrand**: 100% dos identificadores migrados de vetrum → mcpassure
- **Adapter pattern**: ITerminologiaRepository + 3 sub-repositories + TerminologiaRepository
- **_meta granular**: array de TerminologiaMeta em 100% dos 7 tools, com defasagem e status por terminologia
- **Canário diário**: workflow + script + schemas baseline + STATUS.md + runbook
- **Testes**: 4 novos suítes domain + 9 suítes refatorados (tools + evals)

**Resultado:** ✅ Implementação conforme o spec v1.1, sujeita a validação de compilação TypeScript (M1) e execução de testes (M2/M3) que devem ser realizados localmente.
