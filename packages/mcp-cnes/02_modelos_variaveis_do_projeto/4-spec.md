# Spec Técnica — MCP CNES

**Versão:** 1.1.1
**Última atualização:** 2026-05-13
**Histórico:** v1.1 (rebrand + adapter pattern + _meta + canário) + v1.1.1 (remoção do fallback REST TCU + adição de `extra_json` para resiliência contra drift).

---

## Resumo da solução

`@mcpassure/mcp-cnes` é um servidor MCP TypeScript que expõe 8 tools de consulta ao CNES. O sistema tem duas camadas: (1) **tools MCP** — validação Zod + structuredContent + `_meta` em todos os outputs; (2) **queries SQLite** — `better-sqlite3` síncrono com schema fixo de 5 tabelas (cada tabela tem coluna `extra_json` preservando o registro DATASUS bruto). Uma camada de sincronização FTP DATASUS → blast → CSV → SQLite opera offline (CLI separado).

**Arquitetura como contrato estável sobre fonte instável:** a interface MCP é imutável dentro de uma major version; a fonte oficial única (FTP DATASUS) é abstrada pelo `ICnesRepository`, com canário diário detectando drift de formato.

A v1.0 implementou o caminho FTP + REST TCU. A v1.1 formalizou adapter pattern + `_meta` + canário. A v1.1.1 removeu o fallback REST TCU (endpoint upstream descontinuado — usa `codUnidade` ≠ CNES, nunca funcionou de verdade) e adicionou resiliência via `extra_json`.

---

## Decisões de arquitetura (v1.1.1)

### 1. Fonte oficial única

**Decisão:** o MCP CNES depende exclusivamente do FTP DATASUS (`ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/`) como fonte oficial. Sem fallback REST online.

**Por que:**
- O fallback REST TCU (`mobile-aceite.tcu.gov.br/mapa-da-saude/rest`) usa `codUnidade` (ID interno TCU), não o código CNES. Nunca funcionou de verdade — só passava nos testes porque `t03-fallback` rodava em modo `skip` em ambientes offline.
- A alternativa moderna oficial — API DEMAS (`apidadosabertos.saude.gov.br`) — exige autenticação login+senha com cadastro de IP, incompatível com a UX `npx -y @mcpassure/mcp-cnes` zero-config.
- Sem fallback, o modelo mental fica mais simples: **rode sync uma vez, use depois**.

**Quando o cache local está vazio:** todas as 8 tools retornam mensagem clara orientando o usuário a executar `npx -y @mcpassure/mcp-cnes sync --uf <UF> --grupos <GRUPO>`, com `_meta.modo = "cache_vazio"` e `_meta.status = "empty"`.

### 2. Resiliência contra drift via `extra_json`

**Decisão:** cada uma das 5 tabelas SQLite tem coluna `extra_json TEXT` preservando o registro DATASUS bruto (linha CSV inteira) como JSON serializado.

**Por que:**
- Quando o DATASUS adicionar/renomear colunas (drift de schema), o dado bruto continua disponível enquanto o mapper tipado é atualizado.
- Casos de uso futuros (ex: consultas adhoc que não foram previstas no mapper) podem ler de `extra_json` sem mudar schema.
- Custo mínimo: ~30-40% a mais de storage no SQLite, sem impacto em performance de query indexada.

**Inspiração:** padrão `extra jsonb` em sistemas Postgres maduros (e.g. pipelines analíticos do autor com dumps governamentais).

### 3. Adapter Pattern formalizado (mantido de v1.1)

A interface `ICnesRepository` orquestra todas as queries. Tools nunca importam de `db/queries/` diretamente — consomem `ICnesRepository`. Injeção via construtor permite mocks em testes.

---

## Arquivos a criar / alterar

### Arquivos da v1.1.1

**Mudanças no schema SQLite:**
- `src/db/schema.ts` — adicionada coluna `extra_json TEXT` nas 5 tabelas (estabelecimentos, leitos, equipamentos, profissionais, servicos_especializados)

**Mappers atualizados:**
- `src/sync/mappers/ST.ts`, `LT.ts`, `EQ.ts`, `PF.ts`, `SR.ts` — adicionado campo `extra_json: JSON.stringify(row)` no retorno de cada mapper. Em `PF.ts`, CPFs são mascarados antes da serialização.

**Fallback removido:**
- `src/fallback/client.ts` — virou deprecation stub. Funções `buscarPorCodigoCnes` e `buscarPorNomeFallback` lançam `CacheVazioError` com mensagem orientando sync. Mantém-se o módulo para retro-compatibilidade de imports.
- `src/fallback/types.ts` — mantido (não afeta nada, deprecated).

**Repository:**
- `src/domain/repository.ts` — removidas chamadas a `fallbackBuscarCodigo` e `buscarPorNomeFallback`. Quando `isDatasetEmpty(db)`, retorna estrutura com mensagem clara e `_meta` com `modo: "cache_vazio"`.
- `src/domain/types.ts` — `Meta.modo` agora é `"cache_local" | "cache_vazio"` (era `"cache_local" | "online_fallback"`). `Meta.status` ganha valor `"empty"`.
- `src/utils/meta.ts` — `buildFallbackMeta` substituído por `buildEmptyMeta` (retorna `modo: "cache_vazio"`).

**Tools/schemas:**
- `src/tools/schemas.ts` — `EstabelecimentoOutput.source` agora é union `"local"` apenas (era `"local" | "online_fallback"`).

**Canário simplificado:**
- `scripts/canary.ts` — removido check REST TCU. Mantém apenas validação de FTP DATASUS (3 regex candidatas em cascata para tolerar variações de formato).

**Testes:**
- `tests/domain/repository.test.ts` — caso "online_fallback quando dataset vazio" substituído por "cache_vazio quando dataset vazio". Novo caso valida que todas as 8 ops retornam `cache_vazio`.
- `tests/integration/server.test.ts` — atualizado para `modo: "cache_local"` ou `"cache_vazio"` apenas.
- `integration-tests/bin/tests/t03-cache-vazio.ts` — substitui `t03-fallback.ts`. 7 casos validando comportamento correto com cache vazio (lança `CacheVazioError`, retorna mensagem, _meta correto).
- `integration-tests/bin/tests/t06-meta.ts` — `assertMetaShape` agora valida `modo ∈ {"cache_local", "cache_vazio"}`.
- `integration-tests/bin/run-all.ts` — importa `runCacheVazioTests` (sempre executa, mesmo em `--offline`).

**Documentação:**
- `STATUS.md` — atualizada, marca TCU como descontinuado.
- `docs/pt-br/runbook-fonte.md` — atualizado: removida seção "REST TCU degradado", adicionada seção "Cache local vazio na máquina do usuário".
- `TODO.md` — novo, documentando dívidas v1.2 (pre-built database, SCD Type 2, mark_missing_inactive).

---

## Adapter Pattern (formalizado v1.1, mantido)

```typescript
// src/domain/repository.ts
export interface ICnesRepository {
  buscarPorCodigoCnes(codigo: string): Promise<ResponseWithMeta<{
    encontrado: boolean;
    estabelecimento?: EstabelecimentoOutput;
    mensagem?: string;
  }>>;
  buscarPorNome(params): Promise<ResponseWithMeta<BuscarEstabelecimentosResult & { aviso?: string }>>;
  buscarPorMunicipio(params): Promise<ResponseWithMeta<BuscarEstabelecimentosResult & { aviso?: string }>>;
  buscarPorTipo(params): Promise<ResponseWithMeta<BuscarEstabelecimentosResult & { aviso?: string }>>;
  listarProfissionais(codigo: string): Promise<ResponseWithMeta<{ ... }>>;
  listarLeitos(codigo: string): Promise<ResponseWithMeta<{ ... }>>;
  listarEquipamentos(codigo: string): Promise<ResponseWithMeta<{ ... }>>;
  listarServicos(codigo: string): Promise<ResponseWithMeta<{ ... }>>;
}

export type Meta = {
  data_da_base: string;       // ISO 8601 da competência cacheada
  competencia: string;        // AAAAMM — verdade canônica do CNES
  fonte: string;              // "DATASUS FTP CNES"
  defasagem_dias: number;
  modo: "cache_local" | "cache_vazio";   // v1.1.1: cache_vazio substitui online_fallback
  status?: "ok" | "stale" | "empty";     // v1.1.1: "empty" quando cache_vazio
};
```

A implementação `CnesRepository`:
1. Verifica se dataset SQLite tem dados (`isDatasetEmpty()`)
2. Se sim → executa query SQLite, monta `_meta` via `buildMeta(db)` lendo `competencia` de `sync_log`
3. Se não → retorna estrutura com mensagem clara, monta `_meta` via `buildEmptyMeta()` com `modo: "cache_vazio"`

---

## Fluxo de execução e dados

### Consulta MCP (dataset populado)
```
stdin → StdioServerTransport → McpServer.callTool()
  → Zod.parse(input)
  → ICnesRepository.buscarPorXxx(input)
       → getDb() singleton [WAL, foreign_keys ON]
       → isDatasetEmpty() → false
       → query SQLite prepared stmt
       → rowToOutput(row) — extra_json não exposto no output, mas disponível no DB
       → constrói _meta via buildMeta(db) → { competencia, data_da_base, defasagem_dias, modo: "cache_local", status }
  → { content: [...], structuredContent: { data, _meta } }
```

### Consulta MCP (dataset vazio — v1.1.1)
```
  → isDatasetEmpty() → true
  → retorna estrutura: {
      data: { encontrado: false, mensagem: "Cache local vazio. Execute primeiro: npx -y @mcpassure/mcp-cnes sync --uf <UF> --grupos ST" },
      _meta: { modo: "cache_vazio", status: "empty", fonte: "DATASUS FTP CNES", ... }
    }
```

### Sincronização (CLI)
```
npx @mcpassure/mcp-cnes sync [--uf UFs] [--grupos GRUPOS] [--force]
  → para cada (grupo, uf):
      listarArquivos(grupo, uf) via FTP passive mode
      → filtra por regex: ^{GRUPO}{UF}(\d{4})\.dbc$ (formato real AAMM)
      → ordena por competência DESC → arquivos[0]
      downloadArquivo() → dbcPath
      converterDbcParaCsv(dbcPath, csvPath) via blast CLI
      ingerirCsv():
        → readline latin1
        → cada linha: mapXxx(row, competencia) → Record (inclui extra_json: JSON.stringify(row))
        → INSERT OR REPLACE em lotes de 1.000 via db.transaction()
      registrarSync(db, grupo, uf, competencia, rows, "ok")
```

---

## Contratos e interfaces

### Input schemas (Zod) — mantidos da v1.0

```typescript
CodigoCnesSchema: z.string().regex(/^\d{7}$/)
CodigoIbgeSchema: z.string().regex(/^\d{6,7}$/)
TipoEstabelecimentoEnum: z.enum(["hospital","UBS","UPA","clinica","laboratorio",
  "farmacia","SAMU","consultorio","apoio_saude","atencao_especifica","domiciliar","outro"])

BuscarPorCodigoCnesInput: { codigoCnes: CodigoCnesSchema }
BuscarPorNomeInput: { nome: min(3), uf?: length(2), limit: 1-50 default 10 }
BuscarPorMunicipioInput: { codigoIbge, tipo?: Enum, limit: 1-100 default 20 }
BuscarPorTipoInput: { tipo: Enum, uf?: length(2), codigoIbge?: optional, limit: 1-100 default 20 }
```

### Output types (v1.1.1)

```typescript
EstabelecimentoOutput: {
  codigoCnes, nomeFantasia, razaoSocial, cnpj|null,
  tipo, naturezaJuridica, municipio, uf, codigoIbge,
  endereco, latitude|null, longitude|null, telefone|null,
  vinculoSus: boolean, gestao, competencia,
  source: "local"   // v1.1.1: "online_fallback" removido
}

// Toda tool retorna:
{
  data: <output do tipo correspondente>,
  _meta: {
    data_da_base: "2026-04-01T00:00:00Z" | "",
    competencia: "202604" | "",
    fonte: "DATASUS FTP CNES",
    defasagem_dias: 42,
    modo: "cache_local" | "cache_vazio",
    status: "ok" | "stale" | "empty"
  }
}
```

### Schema SQLite (v1.1.1)

```sql
estabelecimentos(co_cnes PK, no_fantasia, no_razao_social, nu_cnpj, tp_unidade,
  co_natureza_jur, no_municipio, sg_uf, co_municipio, no_logradouro,
  nu_latitude REAL, nu_longitude REAL, nu_telefone, vinculo_sus INTEGER,
  tp_gestao, competencia, updated_at, extra_json TEXT)

leitos(co_cnes, tp_leito, co_leito, qt_exist, qt_sus, qt_nsus, competencia, extra_json TEXT
  PK: co_cnes + co_leito + competencia)

equipamentos(co_cnes, co_equip, ds_equip, qt_exist, qt_uso, competencia, extra_json TEXT
  PK: co_cnes + co_equip + competencia)

profissionais(co_cnes, cpf_prof, nm_prof, co_cbo, ds_cbo, tp_vinculo, competencia, extra_json TEXT
  PK: co_cnes + cpf_prof + co_cbo + competencia)
  -- CPFs no extra_json também são mascarados (não expõe PII bruto)

servicos_especializados(co_cnes, co_servico, ds_servico, co_class_sr, ds_class_sr,
  competencia, extra_json TEXT
  PK: co_cnes + co_servico + co_class_sr + competencia)

sync_log(id AUTOINCREMENT, grupo, uf, competencia, rows_upserted, status, error_msg, synced_at)
```

---

## Regras de negócio

1. **Código CNES**: sempre 7 dígitos numéricos. Rejeitado se diferente (Zod).
2. **Código IBGE**: 6 ou 7 dígitos; se 7, truncado para 6 nas queries.
3. **CPF mascarado**: todos os CPFs de profissionais (incluindo dentro de `extra_json`) são armazenados no formato `***.XXX.XXX-**`. Nunca exposto em texto limpo.
4. **Cache vazio = orientação clara**: sem fallback online, todas as 8 tools retornam mensagem orientando `sync` com `_meta.modo = "cache_vazio"`.
5. **UPSERT idempotente**: `INSERT OR REPLACE` — re-ingestão do mesmo CSV não duplica.
6. **Competência como versão**: todas as tabelas têm `competencia` (AAMM ou AAAAMM). Verdade canônica de "data da base".
7. **`extra_json` para resiliência**: preserva registro DATASUS bruto. Não é exposto no output normal mas disponível para consultas adhoc e diagnóstico de drift.
8. **Tipo de estabelecimento normalizado**: `tp_unidade` é código DATASUS; `CODIGO_PARA_DESCRICAO` mapeia para texto legível.
9. **Limite de resultados**: `buscar_por_nome` máx 50; outros máx 100.
10. **source field**: `EstabelecimentoOutput.source` = `"local"` sempre (v1.1.1).
11. **Transparência de defasagem (`_meta`)**: `_meta.status = "stale"` quando `defasagem_dias > 75`; `"empty"` quando cache vazio.

---

## Canário diário (v1.1.1)

Workflow `.github/workflows/canary.yml`:

```yaml
name: Upstream Canary
on:
  schedule: [{ cron: "0 3 * * *" }]
  workflow_dispatch:
permissions:
  contents: write    # commitar STATUS.md
  issues: write      # abrir issues de drift
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
              owner: context.repo.owner, repo: context.repo.repo,
              title: `[upstream-drift] DATASUS schema mudou em ${new Date().toISOString().slice(0,10)}`,
              body: 'Canário detectou divergência. Ver logs.',
              labels: ['upstream-drift']
            });
      - name: Update STATUS.md
        if: success()
        run: |
          echo "Last canary OK: $(date -u +%FT%TZ)" > STATUS.md
          git config user.name "mcpassure-bot"
          git config user.email "bot@mcpassure.com.br"
          git add STATUS.md
          git commit -m "chore: update STATUS.md after canary" || echo "no changes"
          git push
```

O script `npm run canary` (`scripts/canary.ts`) — v1.1.1:
1. Carrega schema baseline (`cnes_dbc_layout.v1.json`)
2. Lista diretórios FTP DATASUS (5 grupos), testa 3 regex candidatas em cascata para detectar mudança de formato:
   - `{GRUPO}{UF}{AAMM}.dbc` (atual confirmado em 2026-05)
   - `{GRUPO}{UF}{AAAAMM}.dbc` (legado)
   - `{GRUPO}{UF}{AAMM}.dbf` (variante extensão)
3. Reporta competência mais recente + cobertura de UFs por grupo
4. Em divergência (0 matches em todos os formatos): exit 1, lista 10 amostras de nomes para diagnóstico
5. Em sucesso: exit 0 → workflow atualiza STATUS.md

**Removido em v1.1.1:** check de REST TCU (endpoint descontinuado upstream).

---

## Configuração (env vars)

| Env Var | Default | Descrição |
|---|---|---|
| `MCPASSURE_DB_PATH` | `~/.mcpassure/cnes.db` | Caminho do SQLite |
| `MCPASSURE_DEGRADED_THRESHOLD_DAYS` | `75` | Acima disso, `_meta.status = "stale"` |
| ~~`MCPASSURE_TCU_*`~~ | — | Removidas em v1.1.1 (fallback removido) |

---

## Estratégia de testes

### Nível 1 — Unitários (Vitest, `npm test`)
- `tests/unit/db/queries.test.ts` (17 casos): cada query SQLite isolada
- `tests/integration/server.test.ts` (9 casos): McpServer completo com `InMemoryTransport`
- `tests/domain/repository.test.ts` (9 casos): orquestrador, `_meta`, comportamento com cache vazio

### Nível 2 — Integração completa (`npm run test:integration`)
5 suítes, ~110 casos, seed de 6 hospitais reais:

| Suite | Casos | Cobertura |
|---|---|---|
| t01-queries | 40 | todas as queries SQLite |
| t02-tools | 30 | todas as 8 tools via InMemoryTransport |
| t03-cache-vazio (v1.1.1) | 7 | comportamento correto com cache vazio + mensagens claras |
| t04-ftp | 9 | FTP + blast (skip se sem rede ou sem blast) |
| t05-scenarios | 15 | cenários end-to-end |
| t06-meta (v1.1) | 8 | `_meta` presente, válido, com modo `cache_local` ou `cache_vazio` |

### Seed de integração — 6 hospitais reais (mantido)
- HC FMUSP (2077485/SP), InCor (2079046/SP), HU UFSC (3467485/SC),
- INCA (2270295/RJ), Hospital Base DF (2237076/DF), HCPA (4049869/RS)

---

## Critério de aceitação (release v1.1.1)

- [x] Fallback REST TCU removido (deprecation stub mantido para retro-compat)
- [x] Coluna `extra_json` adicionada nas 5 tabelas
- [x] Mappers preenchendo `extra_json` com row bruto (CPF mascarado em PF)
- [x] `Meta.modo` agora `cache_local | cache_vazio` (online_fallback removido)
- [x] Repository retorna mensagens claras orientando `sync` quando cache vazio
- [x] Canário simplificado (sem check TCU, apenas FTP DATASUS)
- [x] Testes atualizados (repository, integration, t03-cache-vazio, t06-meta)
- [x] STATUS.md e runbook-fonte.md atualizados
- [x] TODO.md documentando dívidas v1.2 (pre-built database, SCD Type 2, etc.)

---

## Riscos técnicos (v1.1.1)

| Risco | Arquivo afetado | Status |
|---|---|---|
| `blast` CLI não no PATH | `src/sync/convert.ts` | Mitigação: `BlastNaoEncontradoError`. v1.2 prevê pre-built DB |
| FTP passivo bloqueado em Windows | `integration-tests/bin/tests/t04-ftp.ts` | Mitigação: `checkFtp()` detecta e skipa |
| Dataset > espaço disponível | `src/sync/index.ts` | Mitigação: `--uf` por UF |
| Mudança de layout DBC pelo DATASUS | `src/sync/mappers/*.ts` | Mitigação: canário detecta drift via 3 regex candidatas + `extra_json` preserva bruto |
| Mudança de codificação latin1↔utf-8 | `src/sync/ingest.ts` | Mitigação: `extra_json` ajuda diagnóstico |
| Cache vazio na primeira execução | `src/domain/repository.ts` | Tratado: mensagem clara orienta `sync`. Dívida v1.2: pre-built DB |

---

## Fora de escopo

- Dados PHI de pacientes
- Publicação em Smithery / Glama
- FHIR mapper ativo (v2)
- Python FastMCP / uvx
- Endpoint de healthcheck HTTP (v2)
- Streamable HTTP transport hospedado (v2)

---

## Histórico de versões

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | (anterior) | Versão inicial — 3 sources (SQLite + FTP + REST TCU), sem `_meta` formal |
| 1.1 | 2026-05-13 | Rebrand Vetrum→MCPAssure; adapter pattern via `ICnesRepository`; `_meta` em todos outputs; canário diário; schema baseline; runbook de fonte |
| 1.1.1 | 2026-05-13 | Remoção do fallback REST TCU (endpoint descontinuado upstream — `codUnidade` ≠ CNES); coluna `extra_json` nas 5 tabelas (resiliência contra drift DBC); `Meta.modo` agora `cache_local|cache_vazio`; canário simplificado (FTP-only); TODO.md com dívidas v1.2 |
