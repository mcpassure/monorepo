# Plano de Execução — MCP CNES v1.1

**Data:** 2026-05-13
**Spec base:** `4-spec.md` v1.1
**Substituí:** `5-plano_execucao.md` (v1.0)

---

## Overview

A v1.1 é uma atualização de resiliência e identidade sobre a v1.0 já implementada. O código funciona; este plano descreve as cirurgias necessárias para atingir os critérios de aceitação da v1.1 sem regressão nos testes passando.

**Mudanças principais:**
1. Rebrand `vetrum` → `mcpassure` em todos os identificadores
2. Formalização do Adapter Pattern via `ICnesRepository` em `src/domain/`
3. `_meta` obrigatório em 100% dos outputs (via `src/utils/meta.ts`)
4. Canário diário de schema upstream (`.github/workflows/canary.yml` + `scripts/canary.ts`)
5. Schema baseline DBC (`src/sources/schemas/cnes_dbc_layout.v1.json`)
6. `STATUS.md` na raiz (atualizado pelo canário)
7. Runbook `docs/pt-br/runbook-fonte.md`
8. Nova suíte de testes `tests/domain/repository.test.ts` + `t06-meta`

---

## Current State Analysis

### Código existente (v1.0 — funcional)

| Arquivo | Estado | Ação v1.1 |
|---|---|---|
| `package.json` | `@vetrum/mcp-cnes` | Renomear para `@mcpassure/mcp-cnes` |
| `src/server.ts` | `name: "vetrum-cnes"` | Renomear + injetar repository |
| `src/db/connection.ts` | `VETRUM_CNES_DB_PATH` | Renomear env var + path padrão |
| `src/fallback/client.ts` | `VETRUM_TCU_BASE_URL` | Renomear env vars + User-Agent |
| `src/tools/*.ts` (8 arquivos) | Import direto de `db/queries/` e `fallback/` | Refatorar para injeção de `ICnesRepository` |
| `src/tools/schemas.ts` | Sem `_meta` nos types | Adicionar `Meta` + `ResponseWithMeta<T>` |
| `src/sync/index.ts` | `@vetrum/mcp-cnes sync` | Rebrand na mensagem de sync |
| `tests/` | Existente | Adicionar `tests/domain/repository.test.ts` |
| `integration-tests/` | 5 suítes | Adicionar suíte `t06-meta` (8 casos) |

### Arquivos inexistentes (novos para v1.1)

- `src/domain/repository.ts` — interface + implementação CnesRepository
- `src/domain/types.ts` — tipos canônicos compartilhados
- `src/utils/meta.ts` — construtor de `_meta`
- `src/sources/schemas/cnes_dbc_layout.v1.json` — baseline de schema DBC
- `scripts/canary.ts` — validação diária upstream
- `.github/workflows/canary.yml` — workflow GitHub Actions
- `STATUS.md` — atualizado diariamente pelo canário
- `docs/pt-br/runbook-fonte.md` — runbook de resposta a mudanças DATASUS

---

## Desired End State

Após a v1.1:
- `npm run build` compila sem erro
- `npm test` passa todos os testes (incluindo `tests/domain/repository.test.ts`)
- Todos os 8 tools retornam `structuredContent: { data: {...}, _meta: {...} }`
- `npm run canary` executa sem erro (FTP + TCU acessíveis); exit 1 em divergência de schema
- `STATUS.md` na raiz com conteúdo `Last canary OK: <timestamp>`
- Package name `@mcpassure/mcp-cnes`, server name `mcpassure-cnes`
- Env var `MCPASSURE_DB_PATH` (fallback `~/.mcpassure/cnes.db`)
- Todos os `@vetrum` e `VETRUM_` eliminados do código-fonte

---

## Key Discoveries

1. **Tools v1.0 importam diretamente** `db/queries/` e `fallback/client.ts` — não há indireção. A v1.1 introduz `ICnesRepository` entre tools e fontes. A injeção será feita via parâmetro adicional `repo: ICnesRepository` nas funções `register*`.
2. **`structuredContent` v1.0 é flat** — retorna o objeto diretamente sem wrapper `{data, _meta}`. A v1.1 encapsula em `{data: ..., _meta: ...}`. Isso é breaking change documentado.
3. **`sync_log` já existe** e armazena `competencia` por grupo+uf. O `CnesRepository` deve ler `MAX(competencia)` de `sync_log WHERE status='ok'` para popular `_meta.competencia`.
4. **`isDatasetEmpty()`** continua sendo o único gate de fallback — não muda na v1.1.
5. **`scripts/canary.ts`** não executa `blast` (CLI externo); testa apenas FTP e REST TCU + validação de schema de colunas CSV.
6. **`MCPASSURE_DEGRADED_THRESHOLD_DAYS`** default 75 — quando `defasagem_dias > 75`, `_meta.status = "stale"`.
7. **Campos de texto de rebrand** nos sync mappers não contêm `vetrum` — apenas connection.ts, fallback/client.ts, server.ts, package.json e sync/index.ts precisam de rebrand.

---

## What We're NOT Doing

- NÃO alterar o schema SQLite (tabelas idênticas à v1.0)
- NÃO alterar os Zod input schemas (BuscarPorCodigoCnesInput etc.)
- NÃO implementar status page heartbeat em endpoint real (env var presente, comportamento não implementado nesta fase)
- NÃO publicar no npm (fora de escopo)
- NÃO rodar `blast` no canário (CLI externo, não disponível em CI padrão)
- NÃO alterar a lógica de negócio das queries SQLite
- NÃO alterar a API pública MCP (nomes de tools, input schemas)

---

## Implementation Approach

Estratégia: **inside-out**. Criar as camadas novas primeiro (domain, utils), depois conectar as ferramentas existentes às novas camadas. Evitar estados parciais.

**Sequência:**
1. Fase 1 — Infraestrutura de domínio: `src/domain/types.ts`, `src/domain/repository.ts`, `src/utils/meta.ts`
2. Fase 2 — Rebrand: `package.json`, `src/db/connection.ts`, `src/fallback/client.ts`, `src/server.ts`, `src/sync/index.ts`
3. Fase 3 — Refatoração dos tools (8 arquivos): injetar `ICnesRepository`, remover imports diretos
4. Fase 4 — Novos artefatos: `src/sources/schemas/`, `scripts/canary.ts`, `.github/workflows/canary.yml`, `STATUS.md`, `docs/pt-br/runbook-fonte.md`
5. Fase 5 — Testes: `tests/domain/repository.test.ts`, suíte `t06-meta`

---

## Implementação Fase 1 — Infraestrutura de domínio

**Arquivos a criar:**
- `src/domain/types.ts` — tipos `Meta`, `ResponseWithMeta<T>`, outputs canônicos (reexport de schemas.ts)
- `src/domain/repository.ts` — `ICnesRepository` + `CnesRepository` (implementação concreta)
- `src/utils/meta.ts` — `buildMeta(db, modo)` + `buildFallbackMeta()`

**Checklist:**
- [ ] `Meta` type com campos: `data_da_base`, `competencia`, `fonte`, `defasagem_dias`, `modo`, `status?`
- [ ] `ResponseWithMeta<T>` = `{ data: T; _meta: Meta }`
- [ ] `CnesRepository` implementa `ICnesRepository`, recebe `getDb: () => Database` no construtor
- [ ] `buildMeta()` lê `SELECT MAX(competencia) FROM sync_log WHERE status='ok'`
- [ ] `defasagem_dias` = dias desde início do mês da competência até hoje (sem dependência de date-fns, usando Date nativo)
- [ ] `status = "stale"` quando `defasagem_dias > threshold` (padrão 75, lido de `MCPASSURE_DEGRADED_THRESHOLD_DAYS`)
- [ ] Quando `sync_log` vazio: `competencia: ""`, `data_da_base: ""`, `defasagem_dias: 0`, `modo: "cache_local"`, `status: "ok"`

**Verificação automática:** `npm run typecheck` sem erros nos novos arquivos.

---

## Implementação Fase 2 — Rebrand

**Substituições globais:**

| De | Para | Arquivos |
|---|---|---|
| `@vetrum/mcp-cnes` | `@mcpassure/mcp-cnes` | `package.json`, `src/sync/index.ts` |
| `vetrum-cnes` | `mcpassure-cnes` | `src/server.ts` |
| `VETRUM_CNES_DB_PATH` | `MCPASSURE_DB_PATH` | `src/db/connection.ts` |
| `VETRUM_TCU_BASE_URL` | `MCPASSURE_TCU_BASE_URL` | `src/fallback/client.ts` |
| `vetrum/cnes` path | `mcpassure/cnes` | `src/db/connection.ts` |
| `User-Agent: vetrum-mcp-cnes/...` | `User-Agent: mcpassure-mcp-cnes/...` | `src/fallback/client.ts` |
| `vetrum` no author/homepage/repo | `mcpassure` | `package.json` |

**Novas env vars a suportar em `fallback/client.ts`:**
- `MCPASSURE_TCU_TIMEOUT_MS` (padrão 5000)
- `MCPASSURE_TCU_RETRIES` (padrão 3)

**Adição ao package.json scripts:**
- `"canary": "tsx scripts/canary.ts"`

**Verificação automática:** grep `vetrum` em `src/` retorna vazio.

---

## Implementação Fase 3 — Refatoração dos tools

Cada tool passa a receber `repo: ICnesRepository` como segundo parâmetro de `register*()`:
```typescript
export function registerBuscarPorCodigoCnes(server: McpServer, repo: ICnesRepository): void
```

O `structuredContent` passa a ter formato `{ data: {...}, _meta: Meta }`.

**Checklist por tool:**
- [ ] `buscar_por_codigo_cnes.ts` — `repo.buscarPorCodigoCnes(cnes)` → `{data: {encontrado, estabelecimento?}, _meta}`
- [ ] `buscar_por_nome.ts` — `repo.buscarPorNome(params)` → `{data: {total, estabelecimentos}, _meta}`
- [ ] `buscar_por_municipio.ts` — `repo.buscarPorMunicipio(params)` → `{data: {total, estabelecimentos}, _meta}`
- [ ] `buscar_por_tipo.ts` — `repo.buscarPorTipo(params)` → `{data: {total, estabelecimentos}, _meta}`
- [ ] `listar_profissionais.ts` — `repo.listarProfissionais(cnes)` → `{data: {total, profissionais, disclaimer}, _meta}`
- [ ] `listar_leitos.ts` — `repo.listarLeitos(cnes)` → `{data: {total, leitos}, _meta}`
- [ ] `listar_equipamentos.ts` — `repo.listarEquipamentos(cnes)` → `{data: {total, equipamentos}, _meta}`
- [ ] `listar_servicos.ts` — `repo.listarServicos(cnes)` → `{data: {total, servicos}, _meta}`
- [ ] `src/server.ts` — instancia `CnesRepository` e injeta em todos os `register*`

**Verificação automática:** `npm run typecheck` sem erros. `npm test` passa.

---

## Implementação Fase 4 — Novos artefatos

### 4a. Schema baseline DBC (`src/sources/schemas/cnes_dbc_layout.v1.json`)
- Lista colunas esperadas por grupo (ST, LT, EQ, PF, SR), derivada dos mappers existentes
- Encoding esperado: `latin1`
- Versionado; usado pelo canário para detectar drift

### 4b. Canary script (`scripts/canary.ts`)
- Lista diretórios FTP DATASUS — detecta indisponibilidade
- Verifica colunas CSV de amostra vs `cnes_dbc_layout.v1.json`
- Verifica nova competência mensal disponível
- Faz GET REST TCU para validar fallback ativo
- Exit 0 se ok, exit 1 se divergência ou indisponibilidade

### 4c. Workflow GitHub Actions (`.github/workflows/canary.yml`)
- Cron `0 3 * * *` + `workflow_dispatch`
- `npm ci && npm run canary`
- On failure: abre issue `[upstream-drift]`
- On success: atualiza `STATUS.md` + push com `mcpassure-bot`

### 4d. STATUS.md
- Conteúdo inicial: `Last canary OK: (awaiting first run)`
- Atualizado pelo workflow na raiz

### 4e. Runbook (`docs/pt-br/runbook-fonte.md`)
- Procedimento para resposta a mudança de layout DBC
- Procedimento para FTP DATASUS indisponível
- Procedimento para REST TCU degradado
- Referência ao schema baseline e ao workflow do canário

---

## Implementação Fase 5 — Testes

### `tests/domain/repository.test.ts`
- Usa `getInMemoryDb()` para banco in-memory
- Testa `CnesRepository.buscarPorCodigoCnes()` com dataset populado → `_meta.modo = "cache_local"`
- Testa com dataset vazio → `_meta.modo = "online_fallback"` (mock do fallback/client)
- Testa `_meta.competencia` lida de `sync_log`
- Testa `_meta.status = "stale"` quando `defasagem_dias > 75`
- Testa `_meta.defasagem_dias` calculado corretamente para competência conhecida

### `integration-tests/bin/tests/t06-meta.ts`
- 8 casos integrados usando seed dos 6 hospitais reais
- Valida `_meta` presente em 100% dos responses
- Valida `defasagem_dias` > 0 (dados são antigos)
- Valida `fonte = "DATASUS FTP CNES"` quando dataset populado
- Valida `status = "stale"` se competência seed > 75 dias atrás
- Valida `modo = "online_fallback"` quando db vazio

---

## Testing Strategy

| Nível | Comando | Critério pass |
|---|---|---|
| Typecheck | `npm run typecheck` | 0 erros |
| Unit | `npm test` | Todos os testes passando |
| Integration | `npm run test:integration` | ≥ 85 pass, 0 fail |
| Canary | `npm run canary` | exit 0 se rede disponível |

---

## Performance Considerations

- `buildMeta()` executa um único SELECT em `sync_log` — O(1), negligível
- Nenhuma query nova na path quente das 8 tools
- `_meta` adiciona ~100 bytes por response — aceitável
- Canário executa 1x/dia (GitHub Actions cron) — sem impacto no runtime do MCP

---

## Migration Notes

### Breaking changes v1.0 → v1.1

1. **`structuredContent` encapsulado**: antes `{encontrado, estabelecimento}`, agora `{data: {encontrado, estabelecimento}, _meta: {...}}`.
2. **Env vars renomeadas**: `VETRUM_CNES_DB_PATH` → `MCPASSURE_DB_PATH`. Usuários com env var configurada precisam renomear.
3. **Package name**: `@vetrum/mcp-cnes` → `@mcpassure/mcp-cnes`. Claude Desktop configs precisam atualizar.
4. **DB path padrão**: `~/.vetrum/cnes.db` → `~/.mcpassure/cnes.db`. Banco existente precisa ser movido manualmente.

### Rollback

Para rollback para v1.0: reverter para tag git `v1.0.0`. Env vars `VETRUM_*` restauradas.

---

## References

- Spec técnica v1.1: `02_modelos_variaveis_do_projeto/4-spec.md`
- Código atual: `src/` (todos os arquivos listados na spec)
- Schema SQLite: `src/db/schema.ts`
- Mappers: `src/sync/mappers/*.ts`
- FTP client: `src/sync/ftp.ts`
- REST TCU client: `src/fallback/client.ts`
