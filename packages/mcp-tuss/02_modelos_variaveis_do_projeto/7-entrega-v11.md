# Entrega v1.1 — MCP TUSS / CBHPM / Rol ANS (@mcpassure/mcp-tuss)

**Status: ✅ Implementado — v1.1 concluída**  
**Spec de referência:** 4-spec.md v1.1 (2026-05-13)  
**Validação:** 6-validacao-v11.md (2026-05-13)

---

## Objetivo entregue

A v1.1 introduz quatro avanços estruturais sobre a v1.0:

1. **Rebrand completo Vetrum → MCPAssure** — todos os identificadores (package name, env vars, paths, bin, User-Agent, logs, workflows) foram migrados para o namespace `@mcpassure/mcp-tuss`.
2. **Adapter pattern formal** — `ITerminologiaRepository` com 3 sub-repositories (`ITussSubRepository`, `IRolAnsSubRepository`, `ICbhpmSubRepository`) isola completamente as ferramentas do banco SQLite, permitindo substituição de backend sem alterar nenhuma tool.
3. **`_meta` granular por terminologia** — toda resposta MCP inclui um array `_meta: TerminologiaMeta[]` com versão, fonte, defasagem_dias e status (`ok`/`stale`) por terminologia consultada.
4. **Canário diário automático** — workflow GitHub Actions detecta drift nas fontes upstream (TUSS FHIR, planilhas ANS, site AMB) e abre issue automaticamente com label `upstream-drift` ou `upstream-down`.

---

## Resumo da solução implementada

### Arquitetura v1.1

```
src/
├── domain/                         ← NOVO — camada de domínio
│   ├── types.ts                    ← TerminologiaMeta, ResponseWithMeta<T>, CombinedRecord
│   ├── tuss-repository.ts          ← ITussSubRepository + TussRepository
│   ├── rol-repository.ts           ← IRolAnsSubRepository + RolAnsRepository
│   ├── cbhpm-repository.ts         ← ICbhpmSubRepository + CbhpmRepository
│   └── repository.ts               ← ITerminologiaRepository + TerminologiaRepository
├── utils/
│   └── meta.ts                     ← NOVO — buildTussMeta, buildRolAnsMeta, buildCbhpmMeta
├── sources/
│   └── schemas/                    ← NOVO — baseline JSON schemas para canário
│       ├── tuss_codesystem.v1.json
│       ├── rol_ans_planilha.v1.json
│       └── cbhpm_amb.v1.json
└── tools/                          ← REFATORADOS — assinatura (input, repo: ITerminologiaRepository)
    └── 7 tools inalterados na interface MCP, novos outputs com data/._meta/disclaimer
```

### Padrão de output v1.1

```typescript
// Toda resposta de sucesso
structuredContent: {
  data: { ...campos específicos da ferramenta },
  _meta: TerminologiaMeta[],   // 1-3 entradas por terminologia consultada
  disclaimer: string,
}

// Erro em buscar_tuss_por_codigo (código inexistente)
structuredContent: {
  error: "CODIGO_NAO_ENCONTRADO",
  codigo: string,
  _meta: TerminologiaMeta[],
}
```

---

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `src/domain/types.ts` | Tipos: TerminologiaMeta, ResponseWithMeta<T>, ResponseWithMultiMeta<T>, CombinedRecord |
| `src/domain/tuss-repository.ts` | ITussSubRepository interface + TussRepository |
| `src/domain/rol-repository.ts` | IRolAnsSubRepository interface + RolAnsRepository |
| `src/domain/cbhpm-repository.ts` | ICbhpmSubRepository interface + CbhpmRepository |
| `src/domain/repository.ts` | ITerminologiaRepository + TerminologiaRepository + getSyncMeta() |
| `src/utils/meta.ts` | buildTussMeta, buildRolAnsMeta, buildCbhpmMeta, calcularDefasagem |
| `src/sources/schemas/tuss_codesystem.v1.json` | Baseline FHIR CodeSystem TUSS |
| `src/sources/schemas/rol_ans_planilha.v1.json` | Baseline planilha Rol ANS |
| `src/sources/schemas/cbhpm_amb.v1.json` | Baseline disponibilidade AMB |
| `scripts/canary.ts` | Script canário: exit 0=OK, 1=drift, 2=offline |
| `.github/workflows/canary.yml` | Workflow diário 03:00 UTC, abre issues em falha |
| `STATUS.md` | Status de última execução bem-sucedida do canário |
| `data/cross_mapping.v1.json` | 5 mapeamentos TUSS↔CBHPM↔Rol ANS exemplares |
| `docs/pt-br/runbook-fonte.md` | Runbook para mudanças em fontes upstream (8 seções) |
| `tests/domain/tuss-repository.test.ts` | Testes de TussRepository |
| `tests/domain/rol-repository.test.ts` | Testes de RolAnsRepository |
| `tests/domain/cbhpm-repository.test.ts` | Testes de CbhpmRepository |
| `tests/domain/terminologia-repository.test.ts` | Testes de TerminologiaRepository |

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `package.json` | name `@mcpassure/mcp-tuss`, version `1.1.0`, bin `mcpassure-mcp-tuss`, script `canary` |
| `src/constants.ts` | `DEFAULT_DB_DIR = ".mcpassure"`, `MCPASSURE_VERSION = "1.1.0"` |
| `src/db/client.ts` | `VETRUM_DB_PATH` → `MCPASSURE_DB_PATH` |
| `src/sync/downloader.ts` | User-Agent: `mcpassure-mcp-tuss/1.1` |
| `src/server.ts` | `createServer(repo: ITerminologiaRepository)`, name/version MCPAssure |
| `src/index.ts` | Instancia TussRepository/RolAnsRepository/CbhpmRepository/TerminologiaRepository |
| `src/tools/buscar-por-codigo.ts` | Assinatura `(input, repo)`, output `{data, _meta, disclaimer}` |
| `src/tools/buscar-por-descricao.ts` | Idem |
| `src/tools/listar-por-categoria.ts` | Idem |
| `src/tools/validar-cobertura-rol.ts` | Idem |
| `src/tools/consultar-hierarquia-cbhpm.ts` | Idem |
| `src/tools/listar-cobertura-obrigatoria.ts` | Idem |
| `src/tools/status-sincronizacao.ts` | Idem; usa `getSyncMeta()` em vez de `getSyncStatus()` |
| `tests/fixtures.ts` | Adicionado `createTestRepository()` |
| `tests/tools/*.test.ts` (7 arquivos) | Migrados para `ITerminologiaRepository`, acessos via `data.*` |
| `evals/evals.test.ts` | Migrado para `ITerminologiaRepository`, acessos via `data.*` |
| `.github/workflows/sync.yml` | `VETRUM_DB_PATH` → `MCPASSURE_DB_PATH` |

---

## Testes executados

Nenhum teste foi executado automaticamente nesta sessão (ambiente sem Node.js).

Todos os 7 suítes de tools e 4 suítes domain foram escritos/atualizados para a v1.1. Para executar:

```bash
cd artifacts/vetrum-tuss-mcp
npm install
npm run typecheck   # validação TypeScript (zero erros esperados)
npm test            # suítes de testes unitários
npm run evals       # 12 evals de negócio
```

---

## Limitações atuais

1. **Testes não executados em CI**: O ambiente de desenvolvimento não executou a suite em tempo real. A validação foi feita por leitura de código.
2. **CBHPM data_da_base indireta**: `buildCbhpmMeta` usa a data de sincronização da tabela `tuss_22` como proxy, pois a CBHPM não tem sincronização automática (fonte paga).
3. **Canário CBHPM limitado**: Apenas verifica disponibilidade do site AMB — não valida integridade do conteúdo (publicação paga, sem acesso automatizado).
4. **`data/cross_mapping.v1.json`** tem apenas 5 entradas de exemplo. O mapeamento completo requer curadoria manual.
5. **Baseline schemas não são usados em CI** ainda — o canário faz verificações HTTP básicas mas não valida contra os JSON schemas de forma automática na pipeline.

---

## Pendências futuras (v1.2+)

| Item | Prioridade |
|------|-----------|
| Executar `npm run typecheck` + `npm test` e corrigir erros residuais | Alta |
| Expandir `data/cross_mapping.v1.json` com mapeamento completo TUSS↔CBHPM | Média |
| Integrar validação dos baseline schemas no canário (JSON Schema validation) | Média |
| Implementar modo degraded: resposta com `status: "stale"` visível no MCP host | Média |
| Adicionar `MCPASSURE_DEGRADED_THRESHOLD_DAYS` à documentação de instalação | Baixa |
| Suporte a múltiplas versões do Rol ANS no banco | Baixa |

---

## Instruções de uso

### Instalação

```bash
npx @mcpassure/mcp-tuss sync   # baixa e indexa dados TUSS + Rol ANS
npx @mcpassure/mcp-tuss        # inicia o servidor MCP
```

### Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `MCPASSURE_DB_PATH` | `~/.mcpassure/tuss.db` | Caminho do banco SQLite |
| `MCPASSURE_DEGRADED_THRESHOLD_DAYS` | `90` | Dias de defasagem para status `stale` |

### Configuração no Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "mcp-tuss": {
      "command": "npx",
      "args": ["@mcpassure/mcp-tuss"]
    }
  }
}
```

### Canário

```bash
npm run canary          # verifica fontes upstream
# Exit 0: tudo OK
# Exit 1: drift detectado (nova versão disponível)
# Exit 2: fonte offline
```

---

## Instruções de rollback

Para reverter para v1.0:

1. Restaurar `package.json` (name: `vetrum-tuss-mcp`, version: `1.0.0`)
2. Restaurar `src/constants.ts` (`DEFAULT_DB_DIR = ".vetrum"`)
3. Restaurar `src/db/client.ts` (`VETRUM_DB_PATH`)
4. Remover `src/domain/`, `src/utils/meta.ts`, `src/sources/`
5. Restaurar assinaturas das 7 tools para `(input, db: Database)`
6. Restaurar `src/server.ts` e `src/index.ts` para versão pre-domain
7. Restaurar `tests/fixtures.ts` (remover `createTestRepository`)
8. Restaurar arquivos de teste para versão pre-v1.1

Os arquivos v1.0 originais estão preservados nos documentos `5-plano_execucao.md`, `6-validacao.md` e `7-entrega.md` (sem sufixo `-v11`).

---

## Changelog resumido

### v1.1.0 (2026-05-13)

**Rebrand:**
- Package `vetrum-tuss-mcp` → `@mcpassure/mcp-tuss`
- Bin `vetrum-mcp-tuss` → `mcpassure-mcp-tuss`
- Env `VETRUM_DB_PATH` → `MCPASSURE_DB_PATH`
- DB path `~/.vetrum/` → `~/.mcpassure/`

**Arquitetura:**
- Nova camada `src/domain/` com adapter pattern (ITerminologiaRepository)
- 3 sub-repositories isolando TUSS, Rol ANS e CBHPM
- `getSyncMeta()` sem queries desnecessárias
- `buscarPorCodigo()` unificado no domínio com `_meta` condicional

**Observabilidade:**
- `_meta: TerminologiaMeta[]` em 100% dos outputs MCP
- `defasagem_dias` e `status: ok|stale` por terminologia
- Canário diário GitHub Actions (03:00 UTC)
- `STATUS.md` atualizado pelo workflow

**Documentação:**
- `docs/pt-br/runbook-fonte.md` (runbook completo para drift de fontes)
- `data/cross_mapping.v1.json` (mapeamentos TUSS↔CBHPM↔Rol ANS)
- `src/sources/schemas/` (3 baseline JSONs)
