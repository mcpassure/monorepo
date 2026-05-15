# Plano de Execução v1.1 — MCP TUSS / CBHPM / Rol ANS (@mcpassure/mcp-tuss)

**Spec de referência:** 4-spec.md v1.1 (2026-05-13)
**Pré-condição:** v1.0 totalmente implementada em `artifacts/vetrum-tuss-mcp/` (82 testes unitários + 12 evals passando).

---

## Overview

Implementação incremental das mudanças introduzidas no spec v1.1 sobre a base existente da v1.0. As mudanças são agrupadas em 6 fases sequenciais e verificáveis:

| Fase | Nome | Entrega |
|------|------|---------|
| 1 | Rebrand Vetrum → MCPAssure | package.json, paths, env vars, bin, constants.ts atualizados |
| 2 | Domain Layer (Adapter Pattern) | `src/domain/` com `ITerminologiaRepository` + 3 sub-repos |
| 3 | `_meta` Granular | `src/utils/meta.ts`; todos os tools retornam `_meta: TerminologiaMeta[]` |
| 4 | Source Adapters + Schemas Baseline | `src/sources/tuss_fhir/`, `rol_ans/`, `cbhpm_amb/`; 3 schemas JSON |
| 5 | Canário Diário + Cross Mapping | `scripts/canary.ts`, `canary.yml`, `cross_mapping.v1.json`, `STATUS.md`, runbook |
| 6 | Testes Domain + Documentação Final | `tests/domain/` (4 arquivos), README atualizado, disclaimer CBHPM |

**Duração estimada:** cada fase executável em sessão de trabalho dedicada.

---

## Current State Analysis

**Estado atual (`artifacts/vetrum-tuss-mcp/`):**

- Package name: `vetrum-tuss-mcp` (deve ser `@mcpassure/mcp-tuss`)
- DB path: `~/.vetrum/tuss.db` (deve ser `~/.mcpassure/tuss.db`)
- Env var: `VETRUM_DB_PATH` (deve ser `MCPASSURE_DB_PATH`)
- Bin: `vetrum-tuss-mcp` (deve ser `mcpassure-mcp-tuss`)
- Arquitetura: tools importam `db/queries.ts` diretamente (deve ser `ITerminologiaRepository`)
- Output: `metadata: SyncMetadata` (objeto único) (deve ser `_meta: TerminologiaMeta[]`)
- `src/domain/`: não existe
- `src/utils/meta.ts`: não existe
- `src/sources/tuss_fhir/`, `rol_ans/`, `cbhpm_amb/`: não existem
- `src/sources/schemas/`: não existe
- `scripts/canary.ts`: não existe
- `.github/workflows/canary.yml`: não existe
- `data/cross_mapping.v1.json`: não existe
- `STATUS.md`: não existe
- `docs/pt-br/runbook-fonte.md`: não existe
- `tests/domain/`: não existe

---

## Desired End State

- Package `@mcpassure/mcp-tuss` publicado no npm.
- `npx -y @mcpassure/mcp-tuss` inicia o servidor MCP em stdio.
- Todos os 7 tools retornam `_meta: TerminologiaMeta[]` — uma entrada por terminologia consultada.
- Tools consomem `ITerminologiaRepository` via injeção (zero imports diretos de `db/queries.ts`).
- Canário diário verde por 7 dias consecutivos.
- `STATUS.md` atualizado diariamente pelo canário.
- `cross_mapping.v1.json` versionado e usado no ingestor.
- 3 schemas baseline versionados.
- Suite `tests/domain/` passando (4 arquivos, ~30 casos adicionais).
- Disclaimer sobre licenciamento CBHPM explícito no README.

---

## Key Discoveries

1. **Tools acoplados ao banco em v1.0:** `buscar-por-codigo.ts` importa `findByCode` e `getSyncMetadata` de `db/queries.ts` diretamente. O desacoplamento exige refatoração de todos os 7 handlers para aceitar `ITerminologiaRepository` como parâmetro em vez de `Database`.
2. **`_meta` é uma mudança de contrato de output:** o campo `metadata: SyncMetadata` existente (objeto único com `tuss_22_versao`, `rol_rn`, etc.) deve ser substituído por `_meta: TerminologiaMeta[]` com defasagem calculada por terminologia. Isso quebra os testes da v1.0 que assertam `metadata`.
3. **FTS5 + queries existentes não mudam:** o schema SQLite permanece idêntico — a camada domain é uma abstração nova sobre as queries existentes, não uma reescrita delas.
4. **Ingestor deve gerar `cross_mapping.v1.json`:** na v1.1, o mapeamento cruzado TUSS↔CBHPM↔Rol é versionado como artefato estático em `data/`. O ingestor deve produzir esse JSON após a ingestão.
5. **Canário é read-only:** `scripts/canary.ts` apenas baixa amostras e valida schemas, sem escrever no banco. Pode rodar sem banco populado.
6. **Source adapters são extrações, não reescritas:** o código de download/parse da v1.0 (`sync/downloader.ts`, `sync/parser.ts`) é reaproveitado. Os adapters em `src/sources/` encapsulam a fonte específica e delegam para o código existente.

---

## What We're NOT Doing

- Não alterar o schema SQLite (DDL permanece idêntico).
- Não mudar os 7 tools em termos de funcionalidade ou input — apenas o output (`_meta` no lugar de `metadata`).
- Não implementar porte anestésico/UCO (fora do escopo v1 mantido).
- Não implementar status page heartbeat (opcional v1.1, default `false` — não requer código novo na v1 stdio).
- Não migrar bancos SQLite existentes de usuários v1.0 — a mudança de path é documentada como breaking change.
- Não implementar `cross_mapping.v2.json` — apenas `v1`.
- Não alterar testes de sync existentes.

---

## Implementation Approach

Cada fase é atômica. A Fase 1 (rebrand) deve estar concluída antes das fases seguintes para evitar conflito de paths e variáveis de ambiente.

---

## Implementação Fase 1 — Rebrand Vetrum → MCPAssure

### Objetivo
Renomear todos os identificadores de `vetrum` para `mcpassure` sem alterar funcionalidade.

### Passos

**1.1 — `package.json`**
- `"name": "@mcpassure/mcp-tuss"`
- `"bin": { "mcpassure-mcp-tuss": "./dist/index.js" }`
- Manter versão `1.0.0` → bump para `1.1.0` apenas ao final da Fase 6

**1.2 — `src/constants.ts`**
- `MCPASSURE_DB_PATH` (env var padrão)
- Caminho padrão: `~/.mcpassure/tuss.db`
- Bin name: `mcpassure-mcp-tuss`
- GitHub repo: `github.com/mcpassure/mcp-tuss`

**1.3 — `src/db/client.ts`**
- Substituir `VETRUM_DB_PATH` por `MCPASSURE_DB_PATH`
- Substituir `~/.vetrum/` por `~/.mcpassure/`

**1.4 — `.github/workflows/sync.yml`**
- Atualizar cache key de `~/.vetrum/tuss.db` para `~/.mcpassure/tuss.db`

**1.5 — `README.md` e documentação**
- Substituir todas as referências a `vetrum`, `vetrum-tuss-mcp`, `VETRUM_*` pelas equivalentes MCPAssure
- Atualizar config de exemplo para Claude Desktop:
  ```json
  { "mcpServers": { "mcpassure-tuss": { "command": "npx", "args": ["-y", "@mcpassure/mcp-tuss"] } } }
  ```

**1.6 — Testar rebrand**
```bash
grep -r "vetrum" src/ --include="*.ts"  # deve retornar zero resultados
grep -r "VETRUM" src/ --include="*.ts"  # deve retornar zero resultados
```

### Automated Verification (Fase 1)
```bash
npm run typecheck   # zero erros
npm run lint        # zero warnings críticos
npm run build       # dist/ gerado com sucesso
grep -ri "vetrum" src/ package.json README.md   # zero resultados
```

### Manual Verification (Fase 1)
- Confirmar que `MCPASSURE_DB_PATH` sobreescreve o path no `db/client.ts`.
- Confirmar que o bin `mcpassure-mcp-tuss` aparece em `package.json`.

### Rollback (Fase 1)
`git revert` ou `git stash` — não há mudanças de schema ou dados.

---

## Implementação Fase 2 — Domain Layer (Adapter Pattern)

### Objetivo
Criar `src/domain/` com interfaces e implementações dos 3 sub-repositories + orquestrador. Refatorar tools para consumir `ITerminologiaRepository` via injeção.

### Passos

**2.1 — Criar `src/domain/types.ts`**

Tipos canônicos de domínio:
```typescript
export type TerminologiaMeta = {
  terminologia: "TUSS" | "Rol ANS" | "CBHPM";
  versao: string;
  data_da_base: string;
  fonte: string;
  defasagem_dias: number;
  modo: "cache_local" | "online";
  status?: "ok" | "stale";
};

export type ResponseWithMeta<T> = { data: T; _meta: TerminologiaMeta };
export type ResponseWithMultiMeta<T> = { data: T; _meta: TerminologiaMeta[] };
```

Reusar `TussRecord`, `CoberturaRol`, `HierarquiaCbhpm` de `src/types.ts` (sem duplicação).

**2.2 — Criar `src/domain/tuss-repository.ts`**

```typescript
export interface ITussSubRepository {
  findByCodigo(codigo: string): ResponseWithMeta<TussRecord | null>;
  searchByText(params: SearchParams): ResponseWithMeta<PaginatedResult<TussRecord>>;
  listByCategoria(params: ListParams): ResponseWithMeta<PaginatedResult<TussRecord>>;
}

export class TussRepository implements ITussSubRepository {
  constructor(private db: Database) {}
  // Delega para findByCode, searchByText, listByCategory de db/queries.ts
  // Constrói TerminologiaMeta TUSS a partir de sincronizacao_versoes
}
```

**2.3 — Criar `src/domain/rol-repository.ts`**

```typescript
export interface IRolAnsSubRepository {
  getCobertura(codigo: string, segmento?: Segmento): ResponseWithMeta<CoberturaRol[]>;
  listObrigatorios(params: ListObrigatoriosParams): ResponseWithMeta<PaginatedResult<RolEntry>>;
}

export class RolAnsRepository implements IRolAnsSubRepository {
  constructor(private db: Database) {}
  // Delega para getRolCoverage, listObrigatorio de db/queries.ts
  // Constrói TerminologiaMeta "Rol ANS" a partir de sincronizacao_versoes
}
```

**2.4 — Criar `src/domain/cbhpm-repository.ts`**

```typescript
export interface ICbhpmSubRepository {
  getHierarquia(codigo: string): ResponseWithMeta<HierarquiaCbhpm | null>;
}

export class CbhpmRepository implements ICbhpmSubRepository {
  constructor(private db: Database) {}
  // Delega para getCbhpmHierarchy de db/queries.ts
  // Constrói TerminologiaMeta "CBHPM" com versao = CBHPM_EDICAO
}
```

**2.5 — Criar `src/domain/repository.ts`**

```typescript
export interface ITerminologiaRepository {
  tuss: ITussSubRepository;
  rolAns: IRolAnsSubRepository;
  cbhpm: ICbhpmSubRepository;
  buscarPorCodigo(codigo: string): ResponseWithMultiMeta<CombinedRecord>;
}

export class TerminologiaRepository implements ITerminologiaRepository {
  constructor(
    readonly tuss: ITussSubRepository,
    readonly rolAns: IRolAnsSubRepository,
    readonly cbhpm: ICbhpmSubRepository,
  ) {}

  buscarPorCodigo(codigo: string): ResponseWithMultiMeta<CombinedRecord> {
    const tussResult = this.tuss.findByCodigo(codigo);
    const rolResult = this.rolAns.getCobertura(codigo);
    const cbhpmResult = codigo_e_tab22(tussResult.data)
      ? this.cbhpm.getHierarquia(codigo)
      : null;
    // monta _meta array e CombinedRecord
  }
}
```

**2.6 — Refatorar `src/server.ts` e `src/index.ts`**
- `src/index.ts`: instancia `TussRepository`, `RolAnsRepository`, `CbhpmRepository`, `TerminologiaRepository`; passa `repository` para `createServer`
- `src/server.ts`: `createServer(repository: ITerminologiaRepository)` — repassa para handlers dos tools
- Todos os handlers recebem `repository: ITerminologiaRepository` em vez de `db: Database`

**2.7 — Refatorar todos os 7 tool handlers**

| Tool | Mudança no handler |
|------|--------------------|
| `buscar-por-codigo.ts` | usa `repository.buscarPorCodigo(codigo)` |
| `buscar-por-descricao.ts` | usa `repository.tuss.searchByText(params)` |
| `listar-por-categoria.ts` | usa `repository.tuss.listByCategoria(params)` |
| `validar-cobertura-rol.ts` | usa `repository.tuss.findByCodigo` + `repository.rolAns.getCobertura` |
| `consultar-hierarquia-cbhpm.ts` | usa `repository.tuss.findByCodigo` + `repository.cbhpm.getHierarquia` |
| `listar-cobertura-obrigatoria.ts` | usa `repository.rolAns.listObrigatorios` |
| `status-sincronizacao.ts` | usa `repository.tuss`, `repository.rolAns`, `repository.cbhpm` para coletar status |

**Regra:** nenhum tool deve importar de `db/queries.ts` diretamente após esta fase.

### Automated Verification (Fase 2)
```bash
npm run typecheck   # zero erros
npm run lint
grep -r "from.*db/queries" src/tools/   # deve retornar zero resultados
npm test            # testes da v1.0 adaptados para nova assinatura de handlers
```

### Manual Verification (Fase 2)
- Executar `status_sincronizacao` via MCP Inspector e confirmar que o response structure é válido.
- Confirmar que `TerminologiaRepository` é instanciado com os 3 sub-repositories em `index.ts`.

### Rollback (Fase 2)
`git revert` — nenhuma mudança de schema ou dados.

---

## Implementação Fase 3 — `_meta` Granular

### Objetivo
Substituir `metadata: SyncMetadata` por `_meta: TerminologiaMeta[]` em todos os outputs. Criar `src/utils/meta.ts`.

### Passos

**3.1 — Criar `src/utils/meta.ts`**

```typescript
export function buildTussMeta(db: Database): TerminologiaMeta {
  const row = getSyncRow(db, "tuss_22");
  return {
    terminologia: "TUSS",
    versao: row?.versao ?? "desconhecida",
    data_da_base: row?.data_sincronizacao ?? new Date(0).toISOString(),
    fonte: "https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS",
    defasagem_dias: calcularDefasagem(row?.data_sincronizacao),
    modo: "cache_local",
    status: defasagem > 90 ? "stale" : "ok",
  };
}

export function buildRolAnsMeta(db: Database): TerminologiaMeta { ... }
export function buildCbhpmMeta(): TerminologiaMeta { ... }  // sem DB — versão estática
export function calcularDefasagem(dataBase: string | null): number { ... }
```

**3.2 — Atualizar sub-repositories para usar `meta.ts`**
- `TussRepository`: chama `buildTussMeta(db)` em cada `ResponseWithMeta`
- `RolAnsRepository`: chama `buildRolAnsMeta(db)`
- `CbhpmRepository`: chama `buildCbhpmMeta()`

**3.3 — Atualizar tool handlers: output sem `metadata`, com `_meta`**

Exemplo — `buscar-por-codigo.ts` output v1.1:
```typescript
{
  data: {
    codigo, descricao_tuss, tabela_origem, sistema_fhir,
    coberturas: CoberturaRol[],
    hierarquia_cbhpm: HierarquiaCbhpm | null
  },
  _meta: [tussMeta, rolMeta, cbhpmMeta?],
  disclaimer: DISCLAIMER
}
```

**3.4 — Atualizar testes existentes quebrados por mudança de contrato**

Todos os testes que assertam `result.structuredContent.metadata` devem ser atualizados para `result.structuredContent._meta[0]` (ou índice correto).

Novos assertions obrigatórios em testes existentes:
- `expect(result.structuredContent._meta).toBeInstanceOf(Array)`
- `expect(result.structuredContent._meta[0].terminologia).toBe("TUSS")`
- `expect(result.structuredContent._meta[0]).toHaveProperty("defasagem_dias")`

**3.5 — Atualizar `evals/evals.test.ts`**

Eval 01 atualizado:
```typescript
expect(result.structuredContent._meta).toHaveLength(2);  // TUSS + Rol ANS
expect(result.structuredContent._meta[0].terminologia).toBe("TUSS");
expect(result.structuredContent._meta[1].terminologia).toBe("Rol ANS");
// campo metadata antigo não deve mais existir
expect(result.structuredContent.metadata).toBeUndefined();
```

### Automated Verification (Fase 3)
```bash
npm run typecheck
npm test    # incluindo testes atualizados
grep -r '"metadata"' src/tools/   # deve retornar zero resultados
```

### Manual Verification (Fase 3)
- Chamar `buscar_tuss_por_codigo("10101012")` — confirmar `_meta` array com 2 entradas (TUSS + Rol ANS).
- Chamar `consultar_hierarquia_cbhpm("10101012")` — confirmar `_meta` com 2 entradas (TUSS + CBHPM).
- Confirmar `defasagem_dias` é um número inteiro ≥ 0 em todas as respostas.

---

## Implementação Fase 4 — Source Adapters + Schemas Baseline

### Objetivo
Criar adapters dedicados por terminologia em `src/sources/` e versionar 3 schemas baseline para o canário.

### Passos

**4.1 — Criar `src/sources/tuss_fhir/index.ts`**

Adapter para `terminologia.saude.gov.br/fhir`:
```typescript
export class TussFhirAdapter {
  async fetchSample(): Promise<FhirCodeSystemSample>
  async validateSchema(baseline: object): Promise<ValidationResult>
  async detectVersion(): Promise<string>
}
```
Implementação: chama `fetch` no endpoint FHIR, extrai `version`, `concept[0..5]`, `property[*]`. Não usa banco.

**4.2 — Criar `src/sources/rol_ans/index.ts`**

Adapter para planilhas ANS:
```typescript
export class RolAnsAdapter {
  async fetchSample(): Promise<RolAnsPlanilhaSample>   // apenas header + 10 linhas
  async validateSchema(baseline: object): Promise<ValidationResult>
  async detectVersion(): Promise<string>
}
```
Reusa `findCorrelacaoUrl` + `downloadFile` de `sync/downloader.ts`. Parse parcial: apenas headers.

**4.3 — Criar `src/sources/cbhpm_amb/index.ts`**

Adapter para publicação AMB/CFM:
```typescript
export class CbhpmAmbAdapter {
  async fetchSample(): Promise<CbhpmAmbSample>
  async validateSchema(baseline: object): Promise<ValidationResult>
}
```
Implementação: tentativa de acesso ao endpoint AMB/CFM. Se indisponível, retorna `{ available: false, reason: "offline" }` sem lançar erro.

**4.4 — Criar schemas baseline JSON**

`src/sources/schemas/tuss_codesystem.v1.json`:
```json
{
  "version": "v1",
  "generated_at": "2026-05-13",
  "required_fields": ["resourceType", "id", "url", "version", "concept"],
  "required_properties": ["concept.code", "concept.display"],
  "min_concepts": 1000,
  "sample_hash": "sha256:..."
}
```

`src/sources/schemas/rol_ans_planilha.v1.json`:
```json
{
  "version": "v1",
  "generated_at": "2026-05-13",
  "required_columns": ["Código", "Descrição", "Correlação", "OD", "AMB", "HCO", "HSO", "PAC"],
  "header_row": 8,
  "min_data_rows": 1000
}
```

`src/sources/schemas/cbhpm_amb.v1.json`:
```json
{
  "version": "v1",
  "generated_at": "2026-05-13",
  "note": "CBHPM publicação AMB — validação de disponibilidade apenas na v1",
  "check": "url_reachable"
}
```

### Automated Verification (Fase 4)
```bash
npm run typecheck
npx tsx src/sources/tuss_fhir/index.ts   # smoke test (se CLI stub)
```

### Manual Verification (Fase 4)
- Confirmar que `TussFhirAdapter.fetchSample()` retorna objeto com `resourceType === "CodeSystem"`.
- Confirmar que `RolAnsAdapter.validateSchema(baseline)` retorna `{ valid: true }` contra o schema gerado.

---

## Implementação Fase 5 — Canário Diário + Cross Mapping

### Objetivo
Implementar `scripts/canary.ts`, workflow `canary.yml`, `data/cross_mapping.v1.json`, `STATUS.md` e runbook de fonte.

### Passos

**5.1 — Implementar `scripts/canary.ts`**

```typescript
// Execução: npx tsx scripts/canary.ts
// Exit code 0: sem drift | Exit code 1: drift detectado | Exit code 2: rede offline
async function main() {
  const results = await Promise.allSettled([
    checkTuss(),   // TussFhirAdapter + tuss_codesystem.v1.json
    checkRolAns(), // RolAnsAdapter + rol_ans_planilha.v1.json
    checkCbhpm(),  // CbhpmAmbAdapter + cbhpm_amb.v1.json
  ]);
  reportResults(results);
  process.exit(hasFailure(results) ? 1 : 0);
}
```

Log estruturado por terminologia: `{ terminologia, status, drift, detail, latency_ms }`.

**5.2 — Criar `.github/workflows/canary.yml`**

Conforme spec v1.1 (conteúdo completo definido no spec). Gatilho: `cron "0 3 * * *"` + `workflow_dispatch`. Em falha: abre issue com label `upstream-drift`. Em sucesso: commit de `STATUS.md`.

**5.3 — Criar `data/cross_mapping.v1.json`**

Gerado pelo ingestor após ingestão completa. Estrutura:
```json
{
  "version": "v1",
  "generated_at": "ISO8601",
  "source_files": [
    { "name": "correlacao_tuss_rol", "version": "RN 668/2026", "hash": "sha256:..." }
  ],
  "mappings": [
    { "tuss": "10101012", "cbhpm": null, "rol_ans": "consulta_consultorio" }
  ]
}
```

Atualizar `src/sync/ingestor.ts`: após COMMIT, chamar `generateCrossMapping(db) → data/cross_mapping.v1.json`.

**5.4 — Criar `STATUS.md`** (inicial)
```markdown
<!-- Atualizado automaticamente pelo canário. Não editar manualmente. -->
Last canary OK: (nunca executado ainda)
```

**5.5 — Criar `docs/pt-br/runbook-fonte.md`**

Seções obrigatórias:
- O que fazer se ANS mudar URL da correlação
- O que fazer se ANS mudar estrutura de colunas da planilha
- O que fazer se terminologia.saude.gov.br mudar estrutura do FHIR CodeSystem
- O que fazer se AMB/CFM mudar publicação CBHPM
- Como atualizar os schemas baseline
- Como forçar geração de nova versão do `cross_mapping`
- Contatos e SLA esperado por fonte

### Automated Verification (Fase 5)
```bash
npm run typecheck
npx tsx scripts/canary.ts   # deve retornar exit 0 se fontes online; exit 2 se offline
cat data/cross_mapping.v1.json | python3 -m json.tool   # JSON válido
```

### Manual Verification (Fase 5)
- Confirmar que o workflow `canary.yml` aparece na aba Actions do GitHub após push.
- Executar `workflow_dispatch` e verificar que `STATUS.md` é commitado no sucesso.
- Confirmar que `cross_mapping.v1.json` é gerado após `npm run sync`.

### Rollback (Fase 5)
- `canary.yml` pode ser deletado sem afetar funcionalidade core.
- `cross_mapping.v1.json` não está no `.gitignore` — se gerado com dados errados, deletar e re-executar `npm run sync`.

---

## Implementação Fase 6 — Testes Domain + Documentação Final

### Objetivo
Adicionar suite `tests/domain/` (4 arquivos), atualizar README com disclaimer CBHPM e rebrand, bump de versão para `1.1.0`.

### Passos

**6.1 — Criar `tests/domain/tuss-repository.test.ts`**

Casos obrigatórios (mínimo):
- `findByCodigo("10101012")` retorna `_meta.terminologia === "TUSS"`
- `findByCodigo("99999999")` retorna `data: null` com `_meta` válido
- `searchByText` retorna `_meta.terminologia === "TUSS"`
- `_meta.defasagem_dias` é número ≥ 0
- `_meta.status` é `"stale"` quando `defasagem_dias > 90`

**6.2 — Criar `tests/domain/rol-repository.test.ts`**

Casos:
- `getCobertura("10101012")` retorna `_meta.terminologia === "Rol ANS"`
- `listObrigatorios` retorna `_meta.terminologia === "Rol ANS"` com paginação correta

**6.3 — Criar `tests/domain/cbhpm-repository.test.ts`**

Casos:
- `getHierarquia("10101012")` retorna `_meta.terminologia === "CBHPM"`
- `getHierarquia("99999999")` retorna `data: null` com `_meta` válido
- `_meta.versao === CBHPM_EDICAO`

**6.4 — Criar `tests/domain/terminologia-repository.test.ts`**

Casos:
- `buscarPorCodigo("10101012")` retorna `_meta` array com 2 entradas (TUSS + Rol ANS)
- Para código da Tab. 22: `_meta` array com 3 entradas (TUSS + Rol ANS + CBHPM)
- Para código da Tab. 19: `_meta` array com 1 entrada (TUSS apenas — sem cobertura Rol/CBHPM)
- `buscarPorCodigo("99999999")` retorna `data: null` com `_meta` array com ≥ 1 entrada

**6.5 — Atualizar README.md**

Seções a acrescentar/modificar:
- Disclaimer CBHPM explícito: "A CBHPM (6ª edição, AMB) é uma publicação com restrições autorais. Esta ferramenta inclui apenas dados hierárquicos públicos derivados da correlação ANS. Avalie parecer jurídico antes de uso comercial pesado."
- Seção "Arquitetura" breve (1 parágrafo sobre adapter pattern + _meta)
- Referências atualizadas para `@mcpassure/mcp-tuss`

**6.6 — Bump de versão**
- `package.json`: `"version": "1.1.0"`
- Adicionar entrada em `CHANGELOG.md` (ou criar se não existir)

### Automated Verification (Fase 6)
```bash
npm run typecheck
npm test   # unitários originais + domain tests — todos passando
# Contagem esperada: 82 (v1.0) + ~30 (domain) = ~112 casos
```

### Manual Verification (Fase 6)
- Revisar README: disclaimers CBHPM presentes, config MCPAssure correto, sem referências a Vetrum.
- Confirmar total de testes no output do vitest.

---

## Testing Strategy

### Estrutura após v1.1

```
     [Evals — 12 casos reais, atualizados para _meta[]]
   [Integração — banco SQLite real, testes domain]
 [Unitários — banco in-memory: 82 existentes + ~30 domain]
```

### Testes que quebram com v1.1 (precisam de atualização antes de passar)

| Arquivo | Assertion que muda |
|---------|-------------------|
| Todos os `tests/tools/*.test.ts` | `metadata` → `_meta[0]` (ou slice correto) |
| `evals/evals.test.ts` | `metadata.sincronizado_em` → `_meta[0].data_da_base` |

### Regra: sem regressão

Todos os 82 casos existentes devem passar após as atualizações. Nenhum caso pode ser deletado — apenas adaptado à nova assinatura.

---

## Performance Considerations

| Cenário | Meta | Impacto v1.1 |
|---------|------|-------------|
| Overhead do domain layer | < 1ms | Apenas wrapping de chamadas existentes; sem query extra |
| `buildTussMeta` | < 1ms | Reusa row já lida de `sincronizacao_versoes` |
| Canário diário | < 60s | Baixa apenas amostras (não datasets completos) |
| Geração de `cross_mapping.v1.json` | < 5s | Agregação em memória após ingestão |

Sem impacto em performance nas queries do servidor (nenhum SQL novo na path crítica de resposta).

---

## Migration Notes

### Breaking changes da v1.0 para v1.1

| Campo | v1.0 | v1.1 | Impacto |
|-------|------|------|---------|
| Output `metadata` | `SyncMetadata` (objeto único) | removido | Clientes que leiam `metadata` quebram |
| Output `_meta` | inexistente | `TerminologiaMeta[]` | Novo campo obrigatório |
| DB path default | `~/.vetrum/tuss.db` | `~/.mcpassure/tuss.db` | Usuários v1.0 precisam re-sincronizar |
| Env var | `VETRUM_DB_PATH` | `MCPASSURE_DB_PATH` | Configs existentes precisam ser atualizadas |
| Package name | `vetrum-tuss-mcp` | `@mcpassure/mcp-tuss` | `claude_desktop_config.json` precisa ser atualizado |

### Migração de banco para usuários existentes

Não há migração automática de `~/.vetrum/tuss.db` para `~/.mcpassure/tuss.db`. O usuário deve:
1. Deletar a config antiga e instalar `@mcpassure/mcp-tuss`
2. Na primeira execução, o banco vazio aciona `ingestAll()` automaticamente

Documentar no README como nota de upgrade.

---

## References

| Recurso | URL |
|---------|-----|
| Portal TISS da ANS | `https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss` |
| Página Rol de Procedimentos ANS | `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos` |
| Correlação TUSS-ROL (última identificada) | `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos/CorrelaoTUSS.202409Rol.2021_TUSS202603_RN652.2025_RN654.2025.xlsx` |
| CodeSystem FHIR BRCBHPMTUSS | `https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS` |
| MCP SDK TypeScript | `https://github.com/modelcontextprotocol/typescript-sdk` |
| Spec técnica v1.1 | `02_modelos_variaveis_do_projeto/4-spec.md` |
| Plano v1.0 (referência) | `02_modelos_variaveis_do_projeto/5-plano_execucao.md` |
