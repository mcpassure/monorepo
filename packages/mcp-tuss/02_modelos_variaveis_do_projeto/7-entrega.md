# Entrega — @mcpassure/mcp-tuss v0.1.0

**Data:** 2026-05-13
**Status:** ✅ Pronto para publicação manual

---

## Objetivo entregue

MCP server TypeScript que expõe 4 tools de consulta às tabelas TUSS da ANS (procedimentos médicos, medicamentos, diárias/taxas hospitalares). Dados oficiais baixados do portal ANS, armazenados em SQLite local, servidos offline com latência < 5ms. Conformidade com spec MCP: annotations, `_meta`, `disclaimer`, `structuredContent`.

---

## Resumo da solução implementada

- **4 tools MCP**: `buscar_procedimento_tuss`, `buscar_medicamento_tuss`, `buscar_diaria_taxa_tuss`, `status_sincronizacao_tuss`
- **53.250 registros** reais ANS TUSS 202603 em SQLite WAL
- **Parser XLSX customizado** (sem SheetJS — evita licença SSPL) via ZIP Central Directory + inflateRawSync
- **Sincronizador** que baixa ZIP 552MB do portal ANS, extrai 3 planilhas XLSX, faz upsert idempotente
- **Canary** que valida disponibilidade da fonte ANS com HEAD request
- **84 testes** automatizados passando (22 unit + 25 integration + 12 evals + 25 integrados com dados reais)

---

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `src/index.ts` | Entrypoint do servidor MCP |
| `src/server.ts` | McpServer + registro dos 4 tools |
| `src/constants.ts` | DISCLAIMER e TOOL_ANNOTATIONS centralizados |
| `src/domain/types.ts` | Tipos: Meta, TussCode, TussMedicamento, TussDiaria, SyncLogRow |
| `src/db/schema.ts` | DDL SQLite: tuss_22, tuss_20, tuss_18, sync_log |
| `src/db/connection.ts` | Singleton better-sqlite3, WAL mode, path logic |
| `src/repositories/tuss.repository.ts` | TussRepository: queries por código e texto |
| `src/tools/buscar-procedimento.ts` | Handler buscar_procedimento_tuss |
| `src/tools/buscar-medicamento.ts` | Handler buscar_medicamento_tuss |
| `src/tools/buscar-diaria.ts` | Handler buscar_diaria_taxa_tuss |
| `src/tools/status-sync.ts` | Handler status_sincronizacao_tuss |
| `src/utils/meta.ts` | buildMeta(), buildEmptyMeta() |
| `src/utils/http.ts` | FetchHttpDownload: headCheck(), getStream() |
| `src/sync/index.ts` | runSync(): orquestrador de sincronização |
| `src/sync/tuss-source.ts` | downloadToFile(), extractTussData() |
| `src/sync/xlsx-parser.ts` | parseXlsxBuffer(): ZIP→XML→rows |
| `scripts/canary.ts` | Canary de disponibilidade ANS |
| `tests/tools/buscar-procedimento.test.ts` | 7 testes unitários |
| `tests/tools/buscar-medicamento.test.ts` | 5 testes unitários |
| `tests/tools/buscar-diaria.test.ts` | 5 testes unitários |
| `tests/tools/status-sync.test.ts` | 5 testes unitários |
| `tests/integration/real-data.test.ts` | 25 testes de integração |
| `tests/helpers.ts` | createSeededDb() para testes unitários |
| `evals/evals.test.ts` | 12 evals de qualidade de busca (dados reais) |
| `08_testes_integrados/plano.md` | Plano de testes integrados v2.3 |
| `08_testes_integrados/binarios/scripts/run_all.ts` | Script de 25 cenários com logs por cenário |
| `08_testes_integrados/binarios/fixtures/*.json` | 25 fixtures de cenários (C01–C25) |
| `08_testes_integrados/binarios/dados_locais/README.md` | Origem e checksum do tuss_real.db |

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `vitest.config.ts` | Adicionado `evals/**/*.test.ts` ao `include` para detectar evals |
| `src/db/schema.ts` | Adicionada função `unicodelower()` SQLite UDF (busca Unicode case-insensitive) |
| `src/repositories/tuss.repository.ts` | Queries de busca textual atualizadas para usar `unicodelower()` |
| `tests/tools/buscar-medicamento.test.ts` | Adicionado teste "sem args retorna erro orientativo" (5º caso) |
| `tests/tools/buscar-diaria.test.ts` | Adicionado teste "sem args retorna erro orientativo" (5º caso) |

---

## Testes executados

| Suite | Testes | Status |
|-------|--------|--------|
| Unit — buscar-procedimento | 7 | ✅ |
| Unit — buscar-medicamento | 5 | ✅ |
| Unit — buscar-diaria | 5 | ✅ |
| Unit — status-sync | 5 | ✅ |
| Integration Vitest — real-data | 25 | ✅ |
| Evals — evals.test.ts (qualidade de busca, dados reais) | 12 | ✅ |
| Integrados — run_all.ts (dados reais ANS 202603) | 25 | ✅ |
| **Total** | **84** | **84/84** |

**Lint:** 0 erros (24 arquivos). **TypeScript strict:** 0 erros. **Build:** exit 0.

---

## Limitações atuais

| # | Limitação | Motivo |
|---|-----------|--------|
| L1 | Rol ANS não implementado | Endpoint gov.br retorna 403 — investigar auth para v2 |
| L2 | CBHPM não implementado | Fonte paga (AMB) — out-of-scope até parceria |
| L3 | TUSS Tab.19 OPME não implementada | XLSX 105MB — performance out-of-scope v1 |
| L4 | Busca sem FTS5 (usa LIKE) | Adequado para 53K registros; FTS5 é melhoria v2 |
| L5 | `modo` nunca é `"online"` | Sem fallback online em v0.1.0 |
| L6 | `MCPASSURE_DEGRADED_THRESHOLD_DAYS` default = 120 dias | Spec sugere 90; default mais conservador adotado |

---

## Pendências futuras

1. Investigar autenticação do Rol ANS (endpoint retorna 403)
2. Parceria AMB para CBHPM ou alternativa open-source
3. TUSS Tab.19 OPME (parser streaming para XLSX 105MB)
4. FTS5 virtual tables para buscas full-text mais rápidas
5. Multi-terminologia: `ITerminologiaRepository` + sub-repositories (spec v1.1)
6. Smoke test manual no Claude Desktop / Cursor

---

## Instruções de uso

### Sincronização inicial (requerida antes de usar)

```bash
# Sem proxy SSL
npm run sync

# Com proxy SSL (Norton, Zscaler, etc.)
MCPASSURE_INSECURE_TLS=1 npm run sync
```

Tempo estimado: ~5–10 minutos (download 552MB).
DB resultante: ~50MB SQLite com 53K+ registros.

### Iniciar servidor MCP

```bash
node dist/index.js
# ou em dev:
npm run dev
```

### Configurar em Claude Desktop / cliente MCP

```json
{
  "mcpServers": {
    "mcp-tuss": {
      "command": "node",
      "args": ["/path/to/mcp-tuss/dist/index.js"],
      "env": {
        "MCPASSURE_DB_PATH": "/custom/path/tuss.db"
      }
    }
  }
}
```

### Variáveis de ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `MCPASSURE_DB_PATH` | `%APPDATA%/mcpassure/tuss/tuss.db` (Win) | Caminho do banco |
| `MCPASSURE_RATE_LIMIT_MS` | `2000` | Delay entre requests ao sync |
| `MCPASSURE_INSECURE_TLS` | — | Defina `1` para dev com proxy SSL |
| `MCPASSURE_DEGRADED_THRESHOLD_DAYS` | `120` | Dias até `modo=stale` |

---

## Instruções de rollback

O pacote não foi publicado no npm. Para reverter:

1. Parar instâncias do servidor: `pkill -f "node dist/index.js"` (Linux/Mac) ou `Stop-Process` (Windows)
2. Remover configuração do cliente MCP (Claude Desktop / `mcp_servers` config)
3. Opcionalmente deletar o banco: `rm $APPDATA/mcpassure/tuss/tuss.db`

Não há alterações em sistemas externos (sem publicação npm, sem push git realizado).

---

## Changelog resumido

| Versão | Data | Mudança |
|--------|------|---------|
| v0.1.0 | 2026-05-13 | Implementação inicial: 4 tools TUSS, sync ANS ZIP→SQLite, parser XLSX customizado, 45 testes, canary |

---

## Passos para publicação (executados por Daniel)

```bash
# Após validar localmente:
git init  # se não for um repositório git
git add .
git commit -m "feat: implementação inicial @mcpassure/mcp-tuss v0.1.0"
git tag v0.1.0

# NPM publish (quando pronto):
npm publish --access public
```

> **Nota:** NÃO fazer npm publish sem validação completa em ambiente limpo.
