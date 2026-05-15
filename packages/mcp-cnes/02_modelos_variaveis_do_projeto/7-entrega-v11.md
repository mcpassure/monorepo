# Entrega — MCP CNES v1.1

**Versão:** `@mcpassure/mcp-cnes` v1.1.0
**Data:** 2026-05-13
**Baseado em:** `6-validacao-v11.md`
**Estado:** IMPLEMENTADO E TESTADO

---

## Objetivo entregue

Refatoração completa do `@vetrum/mcp-cnes` v1.0 para `@mcpassure/mcp-cnes` v1.1.0, introduzindo:
1. Rebrand completo Vetrum → MCPAssure em todos os identificadores
2. Adapter Pattern formalizado via `ICnesRepository`
3. `_meta` obrigatório em 100% dos outputs das 8 tools MCP
4. Canário diário de schema upstream (GitHub Actions)
5. Schema baseline DBC, STATUS.md e runbook de fonte

---

## Resumo da solução implementada

### Arquitetura v1.1

```
stdin → StdioServerTransport → McpServer
  → registerTool() [Zod validation]
  → CnesRepository (ICnesRepository)
      → isDatasetEmpty() [gate]
      ↙ false                   ↘ true
  SQLite queries            REST TCU fallback
      ↓                         ↓
  buildMeta(db)         buildFallbackMeta()
      ↓                         ↓
  { data: T, _meta: Meta }  { data: T, _meta: Meta }
  → structuredContent: { data, _meta }
  → content: [{ type: "text", text: JSON.stringify({data, _meta}) }]
```

A camada de domain (`CnesRepository`) é o único ponto de decisão entre SQLite e TCU. As tools nunca importam `db/queries` ou `fallback/client` diretamente.

---

## Arquivos criados

| Arquivo | Descrição |
|---|---|
| `src/domain/repository.ts` | `ICnesRepository` interface + `CnesRepository` implementação |
| `src/domain/types.ts` | `Meta`, `ResponseWithMeta<T>` |
| `src/utils/meta.ts` | `buildMeta(db)`, `buildFallbackMeta()` |
| `src/sources/schemas/cnes_dbc_layout.v1.json` | Schema baseline DBC para canário |
| `scripts/canary.ts` | Script de validação diária upstream |
| `.github/workflows/canary.yml` | Workflow GitHub Actions (cron 03:00 UTC) |
| `STATUS.md` | Atualizado diariamente pelo canário |
| `.nvmrc` | Node versão mínima para CI |
| `docs/pt-br/runbook-fonte.md` | Runbook de resposta a mudanças DATASUS |
| `tests/domain/repository.test.ts` | 7 testes unitários do CnesRepository |
| `integration-tests/bin/tests/t06-meta.ts` | 8 testes integrados de _meta (v1.1) |

---

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `package.json` | Rebrand `@vetrum` → `@mcpassure`, version `0.1.0` → `1.1.0`, author, URLs; `canary` script adicionado |
| `src/server.ts` | Rebrand `vetrum-cnes` → `mcpassure-cnes`; injeção de `CnesRepository` |
| `src/db/connection.ts` | `VETRUM_CNES_DB_PATH` → `MCPASSURE_DB_PATH`; path `vetrum/cnes` → `mcpassure/cnes` |
| `src/fallback/client.ts` | `VETRUM_TCU_BASE_URL` → `MCPASSURE_TCU_BASE_URL`; env vars `MCPASSURE_TCU_TIMEOUT_MS` e `MCPASSURE_TCU_RETRIES`; User-Agent rebrand |
| `src/sync/index.ts` | Rebrand no path de tempdir |
| `src/tools/buscar_por_codigo_cnes.ts` | Refatorado para `ICnesRepository`; `structuredContent: {data, _meta}` |
| `src/tools/buscar_por_nome.ts` | Refatorado para `ICnesRepository`; `structuredContent: {data, _meta}` |
| `src/tools/buscar_por_municipio.ts` | Refatorado para `ICnesRepository`; `structuredContent: {data, _meta}` |
| `src/tools/buscar_por_tipo.ts` | Refatorado para `ICnesRepository`; `structuredContent: {data, _meta}` |
| `src/tools/listar_profissionais.ts` | Refatorado para `ICnesRepository`; `structuredContent: {data, _meta}` |
| `src/tools/listar_leitos.ts` | Refatorado para `ICnesRepository`; `structuredContent: {data, _meta}` |
| `src/tools/listar_equipamentos.ts` | Refatorado para `ICnesRepository`; `structuredContent: {data, _meta}` |
| `src/tools/listar_servicos.ts` | Refatorado para `ICnesRepository`; `structuredContent: {data, _meta}` |
| `tests/integration/server.test.ts` | Atualizado para `CnesRepository`; assertions `structuredContent.data.*` |
| `integration-tests/bin/tests/t02-tools.ts` | Atualizado para `CnesRepository`; helper `call<T>` extrai `.data` |
| `integration-tests/bin/tests/t05-scenarios.ts` | Atualizado para `CnesRepository`; helper extrai `.data` |
| `integration-tests/bin/run-all.ts` | Adicionado `runMetaTests` (t06-meta) |
| `evals/runner.ts` | Atualizado para `CnesRepository`; extrai `.data` do structuredContent |

---

## Testes executados

| Suite | Casos | Resultado | Observação |
|---|---|---|---|
| Unit: db/queries | 14 | ✅ PASS | Sem regressão |
| Unit: domain/repository | 7 | ✅ PASS | NOVO v1.1 |
| Integration: server | 10 | ✅ PASS | Assertions atualizadas |
| Integration: t01-queries | 40 | ✅ PASS | Sem regressão |
| Integration: t02-tools | 30 | ✅ PASS | API atualizada |
| Integration: t03-fallback | - | ⏭ SKIP | offline |
| Integration: t04-ftp | - | ⏭ SKIP | offline |
| Integration: t05-scenarios | 15 | ✅ PASS | API atualizada |
| Integration: t06-meta | 8 | ✅ PASS | NOVO v1.1 |
| **Total** | **124** | **✅ 124 PASS / 0 FAIL** | |

---

## Limitações atuais

1. **Canário não validado em CI real**: o workflow está configurado mas não executado em GitHub Actions. Requer push para repositório remoto.
2. **Status page heartbeat não implementado**: env var `MCPASSURE_STATUS_HEARTBEAT` reconhecida mas sem endpoint real conectado (marcado como opcional na spec).
3. **Testes t03/t04 requerem rede**: REST TCU e FTP DATASUS só são testados com conectividade real.
4. **Competência desconhecida no seed**: o banco de integração não popula `sync_log`, então `_meta.competencia = ""` e `defasagem_dias = 0` nos testes de integração. O teste unitário `repository.test.ts` valida `competencia` com `sync_log` populado.

---

## Pendências futuras

- [ ] Adicionar `.nvmrc` ao CI chain de build (feito: `.nvmrc` criado com `18`)
- [ ] Executar `npm run canary` com rede ativa para validar FTP + TCU
- [ ] Configurar repositório GitHub em `github.com/mcpassure/mcp-cnes` e fazer primeiro push
- [ ] Validar canário verde por 7 dias consecutivos (critério da spec para release)
- [ ] Implementar heartbeat real para `MCPASSURE_STATUS_HEARTBEAT=true` (v1.2)
- [ ] Publicar no npm registry como `@mcpassure/mcp-cnes@1.1.0`

---

## Instruções de uso

### Servidor MCP (Claude Desktop)

Adicione ao `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "cnes": {
      "command": "npx",
      "args": ["@mcpassure/mcp-cnes"],
      "env": {
        "MCPASSURE_DB_PATH": "/Users/seuusuario/.mcpassure/cnes.db"
      }
    }
  }
}
```

### Sincronização de dados

```bash
# Sincronizar estabelecimentos de São Paulo
npx @mcpassure/mcp-cnes sync --uf SP --grupos ST

# Sincronizar todos os grupos de todas as UFs
npx @mcpassure/mcp-cnes sync
```

### Variáveis de ambiente v1.1

| Variável | Default | Descrição |
|---|---|---|
| `MCPASSURE_DB_PATH` | `~/.mcpassure/cnes.db` | Caminho do SQLite |
| `MCPASSURE_DEGRADED_THRESHOLD_DAYS` | `75` | Threshold para `_meta.status = "stale"` |
| `MCPASSURE_TCU_TIMEOUT_MS` | `5000` | Timeout da chamada REST TCU |
| `MCPASSURE_TCU_RETRIES` | `3` | Retries da chamada REST TCU |
| `MCPASSURE_STATUS_HEARTBEAT` | `false` | Liga heartbeat (v1.2) |

### Estrutura de resposta v1.1

Todas as tools retornam:
```json
{
  "data": { ... },
  "_meta": {
    "data_da_base": "2026-04-01T00:00:00.000Z",
    "competencia": "202604",
    "fonte": "DATASUS FTP CNES",
    "defasagem_dias": 42,
    "modo": "cache_local",
    "status": "ok"
  }
}
```

---

## Instruções de rollback

Para reverter para v1.0:
1. `git checkout v1.0.0` (tag git, se existente)
2. Restaurar env vars: `VETRUM_CNES_DB_PATH` (se configurada)
3. Atualizar Claude Desktop config para `@vetrum/mcp-cnes`
4. Mover banco de dados: `mv ~/.mcpassure/cnes.db ~/.vetrum/cnes.db` (se necessário)

---

## Changelog resumido

### v1.1.0 (2026-05-13)

**Breaking changes:**
- Package renomeado de `@vetrum/mcp-cnes` para `@mcpassure/mcp-cnes`
- Env vars renomeadas: `VETRUM_*` → `MCPASSURE_*`
- DB path padrão: `~/.vetrum/cnes.db` → `~/.mcpassure/cnes.db`
- `structuredContent` encapsulado em `{data: ..., _meta: ...}` (era flat)

**Novidades:**
- `_meta` em todos os responses: `competencia`, `defasagem_dias`, `fonte`, `modo`, `status`
- Adapter Pattern via `ICnesRepository` — tools desacopladas de implementação de fonte
- Canário diário (`.github/workflows/canary.yml`) com abertura automática de issue em drift
- Schema baseline DBC (`src/sources/schemas/cnes_dbc_layout.v1.json`)
- Runbook `docs/pt-br/runbook-fonte.md`
- `STATUS.md` atualizado pelo canário
- Suite de testes `t06-meta` (8 casos) para validação de `_meta`
- `tests/domain/repository.test.ts` (7 casos)
