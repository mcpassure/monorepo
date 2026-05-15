> ## ⚠️ NOTA HISTÓRICA — DECISÃO REVISADA EM 2026-05-15
>
> Esta Spec foi escrita quando o escopo planejado incluía **TUSS + CBHPM + Rol ANS**. Em **2026-05-15**, o escopo foi revisado:
>
> - **CBHPM removida permanentemente.** Propriedade intelectual da AMB, vendida em https://amb.org.br/adquirir-cbhpm. Não é base aberta; distribuir via MCP público viola direito autoral.
> - Toda menção a CBHPM nesta Spec está **anulada**: `ICbhpmSubRepository`, `consultar-hierarquia-cbhpm.ts`, `cbhpm_amb.v1.json`, tabela `cbhpm_hierarquia`, adapter `cbhpm_amb/`, terminologia `"CBHPM"` no `_meta`, runbook AMB — nada disso existe no produto nem vai existir.
> - **Rol ANS** entra no mesmo MCP TUSS como v0.2.0 (era "MCP separado Onda 2").
> - **Nome final:** "MCP TUSS / Rol ANS".
> - Os artefatos de código CBHPM vestigiais foram movidos para `_REMOVED_CBHPM_2026-05-15/` na raiz do MCP em 2026-05-15.
>
> Referência arquitetural vigente: `arquitetura/arquitetura_mcp_tuss.md`.
>
> ---

# Spec Técnica — MCP TUSS / CBHPM / Rol ANS

**Versão:** 1.1
**Última atualização:** 2026-05-13
**Histórico:** rebrand Vetrum→MCPAssure + incorporação do adendo de resiliência (formalização de adapter pattern por terminologia, `_meta` granular por terminologia, fallback chain, canário diário)

---

## Resumo da solução

Servidor MCP em TypeScript que expõe 7 tools de consulta a **três terminologias** da saúde suplementar brasileira agregadas: TUSS (4 tabelas), Rol ANS e CBHPM. O banco local SQLite é populado a partir de arquivos oficiais (XLSX/ZIP do portal ANS, FHIR CodeSystem do terminologia.saude.gov.br, publicação anual da CBHPM via AMB), processados por pipelines de ingestão específicos por terminologia.

**Arquitetura como contrato estável sobre múltiplas fontes instáveis** — diferente dos outros MCPs MCPAssure, aqui há agregação de três terminologias distintas, cada uma com:
- Ciclo de atualização próprio (TUSS mensal, Rol ANS esporádico, CBHPM anual)
- Fonte oficial própria (terminologia.saude.gov.br, ans.gov.br, amb.org.br/cfm)
- Formato distinto (FHIR JSON, XLSX, PDF/XLSX)
- Schema baseline próprio (versionado para canário detectar drift)

Cada response inclui `_meta` específico da(s) terminologia(s) envolvida(s) na consulta. O servidor é distribuído via npm e instalável com `npx`.

**Estrutura de alto nível do repositório:**

```
@mcpassure/mcp-tuss/
├── src/
│   ├── index.ts              ← entrypoint do servidor MCP
│   ├── server.ts             ← instância McpServer + registro de tools
│   ├── tools/
│   │   ├── buscar-por-codigo.ts
│   │   ├── buscar-por-descricao.ts
│   │   ├── listar-por-categoria.ts
│   │   ├── validar-cobertura-rol.ts
│   │   ├── consultar-hierarquia-cbhpm.ts
│   │   ├── listar-cobertura-obrigatoria.ts
│   │   └── status-sincronizacao.ts
│   ├── domain/                       ← v1.1
│   │   ├── repository.ts             ← ITerminologiaRepository (orquestrador)
│   │   ├── tuss-repository.ts        ← ITussSubRepository
│   │   ├── rol-repository.ts         ← IRolAnsSubRepository
│   │   ├── cbhpm-repository.ts       ← ICbhpmSubRepository
│   │   └── types.ts                  ← Procedimento, MapeamentoTUSS, RolANS canônicos
│   ├── sources/
│   │   ├── tuss_fhir/                ← adapter terminologia.saude.gov.br/fhir
│   │   ├── rol_ans/                  ← adapter planilhas ANS
│   │   ├── cbhpm_amb/                ← adapter CBHPM publicação AMB
│   │   ├── ans_padrao_tiss/          ← tabelas de domínio TISS (auxiliar)
│   │   └── schemas/                  ← v1.1 — schemas baseline para canário
│   │       ├── tuss_codesystem.v1.json
│   │       ├── rol_ans_planilha.v1.json
│   │       └── cbhpm_amb.v1.json
│   ├── db/
│   │   ├── schema.ts                 ← DDL e tipos das tabelas
│   │   ├── client.ts                 ← singleton better-sqlite3
│   │   └── queries.ts                ← funções de query por entidade
│   ├── sync/
│   │   ├── downloader.ts             ← download de arquivos ZIP/XLSX do portal ANS
│   │   ├── parser.ts                 ← parse de XLSX com exceljs
│   │   ├── ingestor.ts               ← transforma linhas Excel → registros SQLite
│   │   └── scheduler.ts              ← verifica nova versão e dispara sincronização
│   ├── utils/
│   │   └── meta.ts                   ← v1.1 — geração do _meta block
│   ├── types.ts                      ← tipos compartilhados (TussRecord, RolEntry, etc.)
│   └── constants.ts                  ← URLs das fontes ANS, versão CBHPM, disclaimer
├── data/
│   ├── tuss.db                       ← banco SQLite gerado
│   └── cross_mapping.v1.json         ← v1.1 — mapeamento cruzado TUSS↔CBHPM↔Rol ANS versionado
├── scripts/
│   ├── sync.ts                       ← CLI: `npx tsx scripts/sync.ts`
│   └── canary.ts                     ← v1.1 — validação diária de schema upstream
├── evals/
│   └── evals.test.ts                 ← 12 casos de eval
├── tests/
│   ├── tools/                        ← testes unitários por tool
│   ├── sync/                         ← testes de parser e ingestor
│   └── domain/                       ← v1.1 — testes dos repositories
├── .github/
│   └── workflows/
│       ├── ci.yml                    ← lint + type-check + testes em PR
│       ├── sync.yml                  ← sync semanal (cron job)
│       └── canary.yml                ← v1.1 — canário diário
├── STATUS.md                          ← v1.1 — atualizado pelo canário
├── docs/pt-br/
│   ├── README.md
│   ├── casos-de-uso.md
│   └── runbook-fonte.md              ← v1.1 — "o que fazer se ANS/MS/AMB mudar publicação"
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.json
├── CONTRIBUTING.md
├── SECURITY.md
└── CODE_OF_CONDUCT.md
```

---

## Adapter pattern por terminologia (v1.1)

Diferente dos outros MCPs do MCPAssure, o TUSS agrega três terminologias com ciclos próprios. A formalização v1.1 introduz **um repository por terminologia + um orquestrador top-level**:

```typescript
// src/domain/repository.ts

export interface ITerminologiaRepository {
  tuss: ITussSubRepository;
  rolAns: IRolAnsSubRepository;
  cbhpm: ICbhpmSubRepository;

  // operações cruzadas (lookup combinado)
  buscarPorCodigo(codigo: string): Promise<ResponseWithMultiMeta<CombinedRecord>>;
}

export interface ITussSubRepository {
  findByCodigo(codigo: string): Promise<ResponseWithMeta<TussRecord | null>>;
  searchByText(params: SearchParams): Promise<ResponseWithMeta<TussRecord[]>>;
  listByCategoria(params: ListParams): Promise<ResponseWithMeta<TussRecord[]>>;
}

export interface IRolAnsSubRepository {
  getCobertura(codigo: string, segmento?: Segmento): Promise<ResponseWithMeta<CoberturaRol[]>>;
  listObrigatorios(params: ListObrigatoriosParams): Promise<ResponseWithMeta<CoberturaRol[]>>;
}

export interface ICbhpmSubRepository {
  getHierarquia(codigo: string): Promise<ResponseWithMeta<HierarquiaCbhpm | null>>;
}

export type ResponseWithMeta<T> = {
  data: T;
  _meta: TerminologiaMeta;
};

export type ResponseWithMultiMeta<T> = {
  data: T;
  _meta: TerminologiaMeta[];  // array porque consulta cruza múltiplas terminologias
};

export type TerminologiaMeta = {
  terminologia: "TUSS" | "Rol ANS" | "CBHPM";
  versao: string;              // ex: "202604" (TUSS), "RN 668/2026" (Rol), "6ª edição 2022" (CBHPM)
  data_da_base: string;        // ISO 8601
  fonte: string;
  defasagem_dias: number;
  modo: "cache_local" | "online";
  status?: "ok" | "stale";     // stale quando defasagem > 90 dias
};
```

**Regra:** tools nunca importam de `db/queries.ts` ou `sources/` diretamente. Tools consomem `ITerminologiaRepository` e os sub-repositories via injeção.

---

## Arquivos novos / alterados (v1.1)

### Novos
```
src/domain/                   ← 5 arquivos
src/sources/schemas/          ← 3 schemas baseline JSON
src/utils/meta.ts
src/sources/tuss_fhir/        ← adapter dedicado FHIR (separado de sync atual)
src/sources/rol_ans/          ← adapter dedicado planilha (extraído de sync)
src/sources/cbhpm_amb/        ← adapter dedicado CBHPM
scripts/canary.ts
.github/workflows/canary.yml
data/cross_mapping.v1.json    ← mapeamento cruzado versionado
STATUS.md
docs/pt-br/runbook-fonte.md
tests/domain/
```

### Repath / renomeação (rebrand)

| De | Para |
|---|---|
| package name `vetrum-tuss-mcp` | `@mcpassure/mcp-tuss` |
| db path padrão `~/.vetrum/tuss.db` | `~/.mcpassure/tuss.db` |
| env var `VETRUM_DB_PATH` | `MCPASSURE_DB_PATH` |
| GitHub repo `github.com/vetrum/mcp-tuss` | `github.com/mcpassure/mcp-tuss` |
| bin name `vetrum-tuss-mcp` | `mcpassure-mcp-tuss` |

---

## Tools (mantidas da v1.0, output estendido com `_meta` na v1.1)

### `buscar_tuss_por_codigo`

```
Annotations: readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: true
Input:  { codigo: string }  — regex /^\d{8}$/
Output (v1.1): {
  data: {
    codigo, descricao_tuss, tabela_origem, sistema_fhir,
    coberturas: CoberturaRol[],
    hierarquia_cbhpm: HierarquiaCbhpm | null
  },
  _meta: [
    { terminologia: "TUSS", versao, data_da_base, ... },
    { terminologia: "Rol ANS", versao, ... },
    { terminologia: "CBHPM", versao, ... }   // apenas se tabela_origem = 22
  ],
  disclaimer: string
}
Erro:   { error: "CODIGO_NAO_ENCONTRADO", codigo, _meta, disclaimer }
```

Quando a consulta cruza terminologias, o response declara `_meta` para **cada terminologia envolvida**, com defasagens independentes.

### `buscar_tuss_por_descricao`

```
Input:  { texto: string(min:3), tabelas?: string[], pagina?, por_pagina? }
Output: { data: { total, pagina, por_pagina, resultados: TussRecord[] }, _meta: [TerminologiaMeta], disclaimer }
```

### `listar_por_categoria`

```
Input:  { categoria: enum, pagina?, por_pagina? }
Output: { data: { total, pagina, por_pagina, resultados: TussRecord[] }, _meta: [TerminologiaMeta], disclaimer }
```

### `validar_cobertura_rol`

```
Input:  { codigo: string, segmento?: enum }
Output: { data: { codigo, descricao_tuss, no_rol_ans, coberturas }, _meta: [TUSS, Rol ANS], disclaimer }
```

### `consultar_hierarquia_cbhpm`

```
Input:  { codigo: string }
Output: {
  data: { codigo, descricao_tuss, capitulo, grupo, subgrupo, nota_limitacao, cbhpm_edicao },
  _meta: [TUSS, CBHPM],
  disclaimer
}
```

### `listar_procedimentos_com_cobertura_obrigatoria`

```
Input:  { segmento?: enum, com_dut?: boolean, pagina?, por_pagina? }
Output: { data: { total, pagina, por_pagina, resultados: ValidacaoRol[] }, _meta: [TUSS, Rol ANS], disclaimer }
```

### `status_sincronizacao`

```
Input:  {}
Output: {
  data: { tabelas: SyncStatus[], cbhpm_edicao },
  _meta: [TUSS, Rol ANS, CBHPM],
  disclaimer
}
```

---

## Schema SQLite (mantido da v1.0)

```sql
-- Procedimentos (Tab. 22)
CREATE TABLE IF NOT EXISTS tuss_procedimentos (
  codigo TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  tabela_versao TEXT,
  criado_em TEXT DEFAULT (datetime('now'))
);
CREATE VIRTUAL TABLE IF NOT EXISTS tuss_procedimentos_fts
  USING fts5(codigo, descricao, content='tuss_procedimentos', content_rowid='rowid');

-- Materiais/OPME (Tab. 19)
CREATE TABLE IF NOT EXISTS tuss_materiais (
  codigo TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  tipo TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  tabela_versao TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS tuss_materiais_fts
  USING fts5(codigo, descricao, content='tuss_materiais', content_rowid='rowid');

-- Medicamentos (Tab. 20)
CREATE TABLE IF NOT EXISTS tuss_medicamentos (
  codigo TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  tabela_versao TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS tuss_medicamentos_fts
  USING fts5(codigo, descricao, content='tuss_medicamentos', content_rowid='rowid');

-- Diárias/Taxas (Tab. 18)
CREATE TABLE IF NOT EXISTS tuss_taxas_diarias (
  codigo TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  tipo TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  tabela_versao TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS tuss_taxas_diarias_fts
  USING fts5(codigo, descricao, content='tuss_taxas_diarias', content_rowid='rowid');

-- Cobertura Rol ANS
CREATE TABLE IF NOT EXISTS rol_cobertura (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_tuss TEXT NOT NULL,
  procedimento_rol TEXT,
  correlacao TEXT,
  rn_origem TEXT,
  vigencia TEXT,
  od INTEGER, amb INTEGER, hco INTEGER, hso INTEGER, pac INTEGER,
  tem_dut INTEGER,
  FOREIGN KEY (codigo_tuss) REFERENCES tuss_procedimentos(codigo)
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS idx_rol_codigo ON rol_cobertura(codigo_tuss);

-- Hierarquia CBHPM
CREATE TABLE IF NOT EXISTS cbhpm_hierarquia (
  codigo_tuss TEXT PRIMARY KEY,
  subgrupo TEXT, grupo TEXT, capitulo TEXT
);

-- Metadado de sincronização
CREATE TABLE IF NOT EXISTS sincronizacao_versoes (
  tabela TEXT PRIMARY KEY,
  versao TEXT,
  data_sincronizacao TEXT,
  rn_referencia TEXT,
  url_fonte TEXT
);
```

---

## Fluxo de execução e dados

### Inicialização

```
npx -y @mcpassure/mcp-tuss
  → src/index.ts
       ├─ db/client.ts → abre ~/.mcpassure/tuss.db
       ├─ db/schema.ts → CREATE TABLE IF NOT EXISTS
       ├─ if (banco_vazio):
       │    └─ sync/ingestor.ts → ingestAll()
       │         ├─ AnsDownloader.downloadCorrelacao()
       │         ├─ TerminologiaSaudeDownloader.downloadCodeSystem()
       │         └─ parser → upsert → atualiza sincronizacao_versoes
       ├─ instancia ITussSubRepository, IRolAnsSubRepository, ICbhpmSubRepository
       ├─ instancia TerminologiaRepository(tuss, rolAns, cbhpm)
       └─ server.ts → McpServer.connect(StdioTransport)
```

### Tool call (ex: buscar_tuss_por_codigo)

```
Client (Claude Desktop / Cursor)
  → tools/call "buscar_tuss_por_codigo" { codigo: "10101012" }
  → server.ts: handler validado por Zod
  → ITerminologiaRepository.buscarPorCodigo("10101012")
       ├─ tuss.findByCodigo() → SELECT tuss_procedimentos
       ├─ rolAns.getCobertura(codigo) → JOIN rol_cobertura
       └─ cbhpm.getHierarquia(codigo) → JOIN cbhpm_hierarquia
  → constrói _meta array: [tussMeta, rolMeta, cbhpmMeta]
  → monta structuredContent com data + _meta[] + disclaimer
```

### Fallback chain (por terminologia)

**TUSS:**
1. Cache local SQLite
2. terminologia.saude.gov.br/fhir (CodeSystem BRCBHPMTUSS)
3. ans.gov.br (versão histórica em planilha)
4. Fallback: erro estruturado

**Rol ANS:**
1. Cache local SQLite
2. Portal ANS — área de Rol de Procedimentos (XLSX/PDF)
3. Dados abertos do governo federal
4. Fallback: erro estruturado

**CBHPM:**
1. Cache local SQLite
2. Site AMB/CFM (publicação oficial)
3. Fallback: erro estruturado (CBHPM tem menos opções de redundância pública)

Cada falha gera log estruturado com adapter, status HTTP/erro, latência.

### Sincronização (v1.0 mantida)

```
sync/scheduler.ts: checkAndSync()
  ├─ GET pagina ANS → detecta nome de arquivo mais recente
  ├─ GET terminologia.saude.gov.br → detecta versão FHIR
  ├─ se nova versão (em qualquer terminologia):
  │    └─ sync/ingestor.ts: ingestAll() (transação atômica)
  │         ├─ download correlacao TUSS-ROL (.xlsx)
  │         ├─ download Tab. 22 / 19 / 20 / 18 ZIPs
  │         ├─ BEGIN TRANSACTION
  │         │    ├─ DELETE FROM tabelas existentes
  │         │    ├─ INSERT rows (Tab. 22, 19, 20, 18)
  │         │    ├─ INSERT rol_cobertura
  │         │    ├─ INSERT cbhpm_hierarquia
  │         │    └─ UPDATE sincronizacao_versoes
  │         └─ COMMIT
  └─ reconstrói índices FTS5
```

---

## Mapeamento cruzado versionado (v1.1)

O arquivo `data/cross_mapping.v1.json` versiona as relações TUSS↔CBHPM↔Rol ANS derivadas da correlação oficial ANS. Mudanças exigem PR review (não auto-gerado).

```json
{
  "version": "v1",
  "generated_at": "2026-05-13T...",
  "source_files": [
    { "name": "correlacao_tuss_rol", "version": "RN 668/2026", "hash": "sha256:..." }
  ],
  "mappings": [
    { "tuss": "10101012", "cbhpm": null, "rol_ans": "consulta_consultorio" }
  ]
}
```

Quando a ANS publica nova correlação, o canário detecta, ingestor propõe nova versão `cross_mapping.v2.json` via PR.

---

## Regras de negócio envolvidas

1. **Código TUSS tem 8 dígitos**: validado por Zod.
2. **Múltiplas coberturas por código**: o mesmo TUSS pode cobrir múltiplos segmentos. Correlação TUSS-ROL tem múltiplas linhas por código — todas retornadas.
3. **Correlação ≠ cobertura por segmento**: `correlacao = 'SIM'` indica presença no Rol; cobertura efetiva por segmento usa colunas OD/AMB/HCO/HSO/PAC.
4. **Hierarquia CBHPM só para Tab. 22**: tabelas 18/19/20 não têm hierarquia CBHPM no arquivo de correlação.
5. **CBHPM porte anestésico ausente**: MCP não retorna porte anestésico nem UCO. Nota de limitação obrigatória.
6. **Disclaimer obrigatório**: toda resposta inclui `DISCLAIMER` de `constants.ts`.
7. **`_meta` granular por terminologia (v1.1)**: toda resposta inclui array `_meta`, uma entrada por terminologia consultada, cada uma com versão e defasagem próprias.
8. **Banco vazio na primeira execução**: `src/index.ts` dispara ingestão automática.
9. **Ingestão atômica**: toda ingestão usa transação SQLite.
10. **FTS5 requer reconstrução**: após DELETE + INSERT, `INSERT INTO tabela_fts(tabela_fts) VALUES('rebuild')`.
11. **Código não encontrado**: retorna erro estruturado (campo `error`), não lança exceção.
12. **`openWorldHint: true`**: dados evoluem ao longo do tempo.
13. **CBHPM licenciamento autoral**: README inclui disclaimer explícito sobre CBHPM ser publicação com restrições autorais maiores que TUSS/Rol. Avaliar parecer jurídico antes de uso comercial pesado.
14. **Status `stale` por terminologia**: quando `defasagem_dias > 90` para qualquer terminologia consultada, `_meta[i].status = "stale"`.

---

## Canário diário (v1.1)

Workflow `.github/workflows/canary.yml`:

```yaml
name: Upstream Canary
on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:
jobs:
  canary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc }
      - run: npm ci
      - run: npm run canary
      - name: Open issue on drift
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[upstream-drift] Terminologia mudou em ${new Date().toISOString().slice(0,10)}`,
              body: 'Canário detectou divergência. Ver logs.',
              labels: ['upstream-drift']
            });
      - name: Update STATUS.md on success
        if: success()
        run: |
          echo "Last canary OK: $(date -u +%FT%TZ)" > STATUS.md
          git config user.name "mcpassure-bot"
          git config user.email "bot@mcpassure.com.br"
          git add STATUS.md
          git commit -m "chore: update STATUS.md after canary" || echo "no changes"
          git push
```

O script `scripts/canary.ts`:
- Para cada terminologia: baixa amostra pequena, valida schema contra baseline JSON, compara hash de estrutura
- Detecta especificamente:
  - **TUSS**: mudanças no CodeSystem FHIR (campos, properties, version)
  - **Rol ANS**: mudança de estrutura da planilha (colunas, sheets, header rows)
  - **CBHPM**: mudança na publicação anual ou suplementos
- Em divergência: exit code != 0 → issue automática com label `upstream-drift` + terminologia afetada + diff
- Em falha de rede: issue com label `upstream-down`
- Notificação especial quando nova versão de qualquer terminologia é publicada

---

## Status page heartbeat (opcional v1.1)

Quando `MCPASSURE_STATUS_HEARTBEAT=true`:

```
POST https://status.mcpassure.com.br/api/v1/heartbeat/tuss
Body: {
  "version": "1.1.0",
  "uptime_seconds": ...,
  "terminologias": {
    "tuss":   { "versao": "202604", "data_da_base": "2026-04-15T...", "defasagem_dias": 28 },
    "rolAns": { "versao": "RN 668/2026", "data_da_base": "...", "defasagem_dias": 92, "status": "stale" },
    "cbhpm":  { "versao": "6ª edição 2022", "data_da_base": "...", "defasagem_dias": 1490, "status": "stale" }
  }
}
```

Default `false` na v1 stdio.

---

## Configuração (env vars)

| Env Var | Default | Descrição |
|---|---|---|
| `MCPASSURE_DB_PATH` | `~/.mcpassure/tuss.db` | Caminho SQLite |
| `MCPASSURE_DEGRADED_THRESHOLD_DAYS` | `90` | Acima disso, `_meta[i].status = "stale"` |
| `MCPASSURE_STATUS_HEARTBEAT` | `false` | Liga heartbeat para status page |
| `MCPASSURE_STATUS_HEARTBEAT_URL` | `https://status.mcpassure.com.br/api/v1/heartbeat/tuss` | Endpoint |
| `MCPASSURE_SYNC_AUTO_ON_BOOT` | `true` | Roda sync automático se banco vazio |

---

## Estratégia de testes

### Testes unitários (`tests/`)

| Arquivo | O que testa |
|---|---|
| `tests/tools/buscar-por-codigo.test.ts` | Retorno correto para código existente; erro estruturado para código inexistente; validação regex; `_meta` array com 3 entradas |
| `tests/tools/validar-cobertura-rol.test.ts` | `no_rol_ans: true` para código do Rol; `false` para código fora; filtragem por segmento; `_meta` com 2 entradas (TUSS, Rol) |
| `tests/tools/buscar-por-descricao.test.ts` | Paginação; busca sem resultados; texto curto demais |
| `tests/tools/listar-por-categoria.test.ts` | Cada enum de categoria retorna registros da tabela correta |
| `tests/tools/status-sincronizacao.test.ts` | Retorna metadado de todas as terminologias |
| `tests/sync/parser.test.ts` | Parse de linha real da correlação TUSS-ROL; mapeamento correto de colunas A-O |
| `tests/sync/ingestor.test.ts` | Ingestão de dataset mínimo (fixture); idempotência |
| `tests/domain/tuss-repository.test.ts` (v1.1) | Sub-repository TUSS isolado |
| `tests/domain/rol-repository.test.ts` (v1.1) | Sub-repository Rol ANS isolado |
| `tests/domain/cbhpm-repository.test.ts` (v1.1) | Sub-repository CBHPM isolado |
| `tests/domain/terminologia-repository.test.ts` (v1.1) | Orquestrador combinando sub-repositories; `_meta` array construído corretamente |

### Banco de teste

Testes usam banco SQLite em memória (`:memory:`). Fixtures com 10-20 registros reais extraídos das tabelas ANS para validar mapeamento.

### Evals (`evals/evals.test.ts`)

12 casos executados com `vitest run --reporter=verbose`. Cada eval usa o handler da tool diretamente contra banco populado com dados reais (pré-gerado no CI via script de ingestão). **Evals não mockam o banco** — usam dados reais do ANS baixados durante o CI.

```typescript
test("eval-01: buscar código 10101012 retorna consulta em consultório", async () => {
  const result = await buscarPorCodigoHandler({ codigo: "10101012" }, repository);
  expect(result.structuredContent.data.codigo).toBe("10101012");
  expect(result.structuredContent.data.descricao_tuss).toMatch(/consulta/i);
  expect(result.structuredContent.data.coberturas.some(c => c.segmento === "AMB")).toBe(true);
  expect(result.structuredContent._meta).toHaveLength(2);  // TUSS + Rol ANS
  expect(result.structuredContent._meta[0].terminologia).toBe("TUSS");
});
```

### CI (`ci.yml`)

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run sync` (baixa dados reais — necessário para evals)
5. `npm test` (unitários + evals)

---

## Critério de aceitação (release v1.1.0)

- [ ] Rebrand completo (paths, env vars, package name, URLs, bin)
- [ ] `ITerminologiaRepository` + 3 sub-repositories implementados
- [ ] `_meta` array presente em 100% dos responses bem-sucedidos
- [ ] Workflow de canário verde por 7 dias consecutivos
- [ ] `STATUS.md` atualizado diariamente pelo canário
- [ ] `cross_mapping.v1.json` versionado e usado no ingestor
- [ ] 3 schemas baseline (`tuss_codesystem.v1.json`, `rol_ans_planilha.v1.json`, `cbhpm_amb.v1.json`) versionados
- [ ] Runbook "o que fazer se ANS/MS/AMB mudar publicação" em `docs/pt-br/runbook-fonte.md`
- [ ] Disclaimer sobre uso da CBHPM (licenciamento autoral) explícito no README
- [ ] Testes existentes da v1.0 passando sem regressão
- [ ] Suite de testes de `domain/` (v1.1) passando

---

## Riscos técnicos

| Risco | Mitigação técnica |
|---|---|
| ANS muda estrutura das colunas do XLSX de correlação | `parser.ts` usa índice de coluna (A=0…) com validação de header; falha ruidosa com log do header real. v1.1: canário detecta antes do release |
| ANS muda URL ou nome de arquivo | `downloader.ts` faz scraping do href dos links na página; não usa URL hardcoded |
| Tab. 19 (300k+ linhas) causa timeout ou OOM no parse | `exceljs` suporta streaming; ingestor usa batches de 1.000 rows por transação |
| FTS5 rebuild lento em Tab. 19 | Executar rebuild fora da transação principal; medir tempo no CI |
| `better-sqlite3` não suporta WAL em ambientes read-only | Detectar e fallback para journal mode default |
| `structuredContent` ainda experimental no SDK | Fixar versão do SDK; não depender de comportamento não-documentado |
| exceljs parse de XLSX com imagens/macros | Ignorar drawings; parser só lê a sheet de dados |
| CBHPM licenciamento autoral | Disclaimer no README; parecer jurídico antes de uso comercial pesado; v1 não cobre porte anestésico/UCO (dados pagos) |
| Mudança em terminologia.saude.gov.br/fhir (CodeSystem) | v1.1: canário valida hash de estrutura; abre issue automática |

---

## Fora de escopo

- Porte anestésico e UCO (dados pagos AMB)
- Tabelas TUSS 21 e demais (além de 18, 19, 20, 22)
- Histórico de versões de procedimentos (apenas versão atual)
- Integração com MCP CNES — campo `cnes` reservado no schema mas sem lógica
- Interface web ou UI
- Autenticação/autorização (v2)
- Valoração financeira (preços, honorários)
- FHIR passthrough em runtime — apenas campo `sistema_fhir` no output para compatibilidade
- Suporte a múltiplos idiomas (PT-BR apenas)
- Mirror próprio das publicações em CDN (Pro/Enterprise futuro)

---

## Histórico de versões

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | (anterior) | Versão inicial — scheduler com detecção de versão, metadata por resposta, 4 tabelas TUSS + Rol + CBHPM |
| 1.1 | 2026-05-13 | Rebrand Vetrum→MCPAssure; formalização de adapter pattern com `ITerminologiaRepository` + 3 sub-repositories (TUSS, Rol ANS, CBHPM); `_meta` granular como array (uma entrada por terminologia consultada); canário diário GitHub Actions; status page heartbeat opcional; 3 schemas baseline para canário; `cross_mapping.v1.json` versionado; runbook de fonte; disclaimer sobre licenciamento CBHPM |
