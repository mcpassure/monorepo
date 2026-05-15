# Entrega

## Objetivo entregue

Servidor MCP TypeScript (`@vetrum/mcp-cnes`) para consulta ao CNES — Cadastro Nacional de Estabelecimentos de Saúde. Expõe 8 tools que permitem a modelos de linguagem consultar estabelecimentos de saúde, seus leitos, equipamentos, profissionais e serviços especializados, usando SQLite local como fonte primária (populado via FTP DATASUS) e REST API Mapa da Saúde (TCU) como fallback online quando o banco ainda não foi sincronizado.

**Estado de entrega:** implementação completa, 125 testes passando (0 skips, 0 falhas), pronto para publicação npm.

---

## Resumo da solução implementada

- **Protocolo:** MCP (Model Context Protocol) via `@modelcontextprotocol/sdk` v1.29.0, StdioServerTransport
- **Distribuição:** `npx -y @vetrum/mcp-cnes` (pendente `npm publish`)
- **Dados primários:** SQLite local (`better-sqlite3`) populado por `src/sync/` que baixa `.dbc` do FTP DATASUS, converte via CLI `blast` e ingere com upsert idempotente em lotes de 1.000
- **Fallback online:** REST API `http://mobile-aceite.tcu.gov.br/mapa-da-saude/rest/` quando SQLite vazio
- **8 tools** com `readOnlyHint: true`, `idempotentHint: true`, latência <2ms com seed (SQLite local)
- **Privacidade:** CPFs mascarados como `***.XXX.XXX-**` em todas as saídas de profissionais
- **Testes:** 24 Vitest + 101 integração = 125 casos, todos passando sem skips

---

## Arquivos criados

### Configuração raiz

| Arquivo | Descrição |
|---|---|
| `package.json` | `@vetrum/mcp-cnes` v0.1.0, bin: `mcp-cnes`, scripts: build/dev/test/lint/typecheck/sync |
| `tsconfig.json` | target ES2022, module NodeNext, strict: true |
| `tsconfig.build.json` | extends tsconfig, outDir: dist, exclui tests/evals/integration-tests |
| `biome.json` | lint + format (indentWidth: 2, double quotes, organizeImports) |
| `.gitignore` | node_modules, dist, *.db, *.dbc, *.dbf, *.csv |
| `.npmignore` | exclui src/, tests/, integration-tests/, evals/, docs/, tsconfig*, biome.json |
| `LICENSE` | MIT |
| `README.md` | Instalação, tools disponíveis, configuração Claude Desktop/Code, uso do sync |
| `.github/workflows/ci.yml` | CI: lint + typecheck + test + build |
| `.github/workflows/publish.yml` | CD: npm publish em tag `v*` |

### Servidor MCP (`src/`) — 34 arquivos TypeScript

**Entrypoint:**
- `src/index.ts` — shebang `#!/usr/bin/env node`, chama `startServer()`
- `src/server.ts` — `McpServer({name: "vetrum-cnes", version: "0.1.0"})`, registra 8 tools, conecta StdioServerTransport

**Tools (`src/tools/`):**
- `buscar_por_codigo_cnes.ts` — busca por código CNES (7 dígitos); fallback REST TCU se SQLite vazio
- `buscar_por_nome.ts` — busca por nome fantasia/razão social; filtro UF opcional; máx 50 resultados
- `buscar_por_municipio.ts` — lista por código IBGE; filtro tipo opcional; máx 100 resultados
- `buscar_por_tipo.ts` — lista por tipo normalizado (hospital, UBS, UPA, etc.) e UF/município
- `listar_profissionais.ts` — profissionais do estabelecimento com CPF mascarado
- `listar_leitos.ts` — leitos por tipo com quantidade existente/SUS/não-SUS
- `listar_equipamentos.ts` — equipamentos com código DATASUS e quantidade
- `listar_servicos.ts` — serviços especializados cadastrados
- `schemas.ts` — Zod inputSchemas + TypeScript output types (5 tipos de output + 1 tipo de resultado)
- `annotations.ts` — `CNES_ANNOTATIONS` reutilizável por todas as tools

**Banco de dados (`src/db/`):**
- `connection.ts` — singleton SQLite; `getDb()` (arquivo) + `getInMemoryDb()` (testes); WAL mode, foreign_keys ON
- `schema.ts` — CREATE TABLE IF NOT EXISTS para 5 tabelas + sync_log + índices
- `tipos_unidade.ts` — mapeamento TP_UNIDADE → nome legível + `tipoParaCodigos()`
- `leitos_tipos.ts` — mapeamento código leito → descrição + detecção de UTI
- `equipamentos_tipos.ts` — mapeamento código equipamento → descrição
- `queries/estabelecimentos.ts` — `porCodigo`, `porNome`, `porMunicipio`, `porTipo`
- `queries/profissionais.ts`, `queries/leitos.ts`, `queries/equipamentos.ts`, `queries/servicos.ts` — `porCnes`

**Fallback REST TCU (`src/fallback/`):**
- `client.ts` — `getBaseUrl()` (lê env var em runtime), timeout 5s, 3 retries, backoff linear
- `types.ts` — `TcuEstabelecimento` type

**Sync FTP→SQLite (`src/sync/`):**
- `index.ts` — CLI: `--uf`, `--grupos`, `--force`; orquestra FTP→convert→ingest por (grupo, uf)
- `ftp.ts` — `listarArquivos(grupo, uf)` + `downloadArquivo()` via `basic-ftp`; mock mode via `VETRUM_FTP_MOCK=1`
- `convert.ts` — `converterDbcParaCsv()` via `blast` CLI + `BlastNaoEncontradoError`
- `ingest.ts` — stream CSV, decode latin1→UTF-8 via `iconv-lite` (default import), upsert em batch 1.000
- `state.ts` — `jaProcessado()`, `registrarSync()`, `ultimaCompetenciaSincronizada()` via `sync_log`
- `mappers/ST.ts`, `LT.ts`, `EQ.ts`, `PF.ts`, `SR.ts` — colunas DBC → schema SQLite

### Testes unitários e fixtures (`tests/`)

| Arquivo | Conteúdo |
|---|---|
| `tests/fixtures/seed.ts` | `seedDatabase(db)` — insere 6 hospitais com leitos, equipamentos, profissionais, serviços |
| `tests/unit/db/queries.test.ts` | 14 testes das queries SQLite isoladas |
| `tests/integration/server.test.ts` | 10 testes de integração de todas as 8 tools via InMemoryTransport |

### Suíte de integração (`integration-tests/`)

| Arquivo | Conteúdo |
|---|---|
| `bin/helpers/assert.ts` | `assertTrue`, `assertNotNull`, `assertGreater`, `assertMatch` |
| `bin/helpers/reporter.ts` | `pass()`, `fail()`, geração de JSON + MD |
| `bin/seed/hospitals.ts` | 6 hospitais reais: HC FMUSP, InCor, HU UFSC, INCA, Hospital Base DF, HCPA |
| `bin/seed/seed-api.ts` | seed-api com enriquecimento de dados |
| `bin/tests/t01-queries.ts` | 40 casos — todas as queries SQLite |
| `bin/tests/t02-tools.ts` | 30 casos — todas as 8 tools via InMemoryTransport |
| `bin/tests/t03-fallback.ts` | 7 casos — REST TCU com mock HTTP local |
| `bin/tests/t04-ftp.ts` | 9 casos — FTP+blast com mock FTP + fake blast + DB isolado |
| `bin/tests/t05-scenarios.ts` | 15 casos — cenários end-to-end de usuário real |
| `bin/run-all.ts` | Orquestrador com flags e geração de relatórios |

### Evals (`evals/`)

- `evals/runner.ts` — infraestrutura: seed + McpServer + InMemoryTransport + verificação latência
- `evals/index.ts` — 12 eval cases cobrindo todos os tools e edge cases

---

## Arquivos alterados

Correções realizadas durante desenvolvimento e validação:

| Arquivo | Alteração | Motivo |
|---|---|---|
| `src/fallback/client.ts` | `const BASE_URL` → `function getBaseUrl()` | Env var precisava ser lida em runtime, não no import |
| `src/sync/ftp.ts` | Adicionado mock mode `VETRUM_FTP_MOCK=1` + `MOCK_ARQUIVOS` + `MOCK_CSV_ST` | FTP passivo bloqueado no ambiente de testes; testes não podiam ser skipped |
| `src/sync/ingest.ts` | `import * as iconv` → `import iconv from "iconv-lite"` | ESM só expõe default export; named exports (`decodeStream`) não disponíveis com `import *` |
| `integration-tests/bin/tests/t04-ftp.ts` | Reescrita completa: `checkFtp()` real, `criarFakeBlast()`, `getInMemoryDb()` isolado | `checkFtp()` era TCP-only; testes pulavam por falta de blast; DB compartilhado corrompía seed |
| `integration-tests/bin/tests/t03-fallback.ts` | Reescrita completa: `startMockServer()` Node.js HTTP + `VETRUM_TCU_BASE_URL` override | Testes pulavam quando API TCU offline; zero skips é requisito |
| `integration-tests/bin/tests/t01-queries.ts` | `descricaoServico` → `descricao` em `ServicoOutput` | Campo renomeado durante implementação |
| `integration-tests/bin/tests/t02-tools.ts` | `descricaoServico` → `descricao` em `ServicoOutput` | Idem |
| `integration-tests/bin/tests/t05-scenarios.ts` | `descricaoServico` → `descricao` em `ServicoOutput` | Idem |
| `evals/index.ts` | Biome organizeImports (type before value) | Biome lint gate |
| `tests/unit/db/queries.test.ts` | Formatação Biome (line-length em find callback) | Biome lint gate |

---

## Testes executados

| Suite | Arquivo | Casos | Resultado |
|---|---|---|---|
| Vitest unit | `tests/unit/db/queries.test.ts` | 14 | ✅ 14/14 |
| Vitest integration | `tests/integration/server.test.ts` | 10 | ✅ 10/10 |
| t01-queries | `integration-tests/bin/tests/t01-queries.ts` | 40 | ✅ 40/40 |
| t02-tools | `integration-tests/bin/tests/t02-tools.ts` | 30 | ✅ 30/30 |
| t03-fallback | `integration-tests/bin/tests/t03-fallback.ts` | 7 | ✅ 7/7 |
| t04-ftp | `integration-tests/bin/tests/t04-ftp.ts` | 9 | ✅ 9/9 |
| t05-scenarios | `integration-tests/bin/tests/t05-scenarios.ts` | 15 | ✅ 15/15 |
| **Total** | | **125** | **✅ 125/125 — 0 skips** |

Verificações de qualidade:
- `npm run lint` → 44 arquivos verificados, 0 erros (Biome)
- `npm run typecheck` → 0 erros TypeScript strict
- `npm run build` → `dist/` gerado com sucesso

---

## Limitações atuais

1. **Script de sync não validado com dados reais.** Requer `blast` CLI e FTP DATASUS passivo acessível. Os mappers foram construídos conforme dicionário de dados DATASUS mas podem precisar ajuste na primeira execução real.

2. **Fallback REST TCU não testado contra servidor real.** Testado apenas com mock HTTP local; formato do campo `codUnidade` (7 vs 13 dígitos) não confirmado com API TCU online.

3. **Sem testes unitários de sync.** `tests/unit/sync/` não existe. Lógica de `src/sync/` coberta apenas pelos testes de integração com mocks.

4. **Performance com dataset nacional não medida.** Com seed de 6 estabelecimentos, latência <2ms. Com dataset nacional (~1M registros), latência deve manter-se <500ms via índices SQLite — não confirmado empiricamente.

5. **Publicação npm pendente.** `npx -y @vetrum/mcp-cnes` não funciona até `npm publish`.

---

## Pendências futuras

### Pré-publicação (v0.1.0 — bloqueantes)

- [ ] `git init` + commit inicial
- [ ] `npm login` + `npm publish --access public`
- [ ] Validar `npx -y @vetrum/mcp-cnes` em terminal limpo
- [ ] Testar integração Claude Desktop com `claude_desktop_config.json`
- [ ] Verificar README.md PT-BR (conteúdo e aviso LGPD/defasagem)

### Pós-publicação (v0.1.0)

- [ ] Executar `sync --uf SP --grupos ST` com dados reais + verificar ~45.000 estabelecimentos
- [ ] Confirmar formato `codUnidade` TCU (7 vs 13 dígitos) com API online
- [ ] Submeter ao MCP Registry, Smithery, Glama

### v0.2.0

- [ ] Testes unitários `tests/unit/sync/` com DBC fixture pequeno
- [ ] Download incremental (comparação com `sync_log` antes de baixar)
- [ ] FTS5 virtual table para busca por nome mais rápida com dataset completo
- [ ] Suporte aos 13 grupos CNES (além dos 5 do MVP: ST, LT, EQ, PF, SR)
- [ ] Busca geolocalizada (lat/lng → raio em km)

---

## Instruções de uso

### Configuração no Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "cnes": {
      "command": "npx",
      "args": ["-y", "@vetrum/mcp-cnes"]
    }
  }
}
```

### Sincronização de dados (requer `blast` CLI)

```bash
# Instalar blast (decoder DBC do DATASUS)
# Linux/macOS: https://github.com/hawesg/blast/releases
# Windows: baixar binário .exe e adicionar ao PATH

# Sincronizar estabelecimentos de São Paulo
npx @vetrum/mcp-cnes sync --uf SP --grupos ST

# Sincronizar todos os grupos de SP
npx @vetrum/mcp-cnes sync --uf SP --grupos ST,LT,EQ,PF,SR

# Forçar re-download mesmo se já processado
npx @vetrum/mcp-cnes sync --uf SP --grupos ST --force
```

### Desenvolvimento local

```bash
npm install
npm run dev              # servidor MCP aguarda stdin
npm test                 # 24 casos Vitest
npm run test:integration # 101 casos integração
npm run lint             # Biome check
npm run typecheck        # tsc --noEmit
npm run build            # dist/
```

---

## Instruções de rollback

### Rollback de publicação npm

```bash
# Disponível em até 72h após publish
npm unpublish @vetrum/mcp-cnes@0.1.0 --force
```

### Rollback de dados (SQLite local)

```bash
# Linux/macOS
rm -f ~/.local/share/vetrum/cnes/cnes.db

# Windows
del %APPDATA%\vetrum\cnes\cnes.db
```

Deletar o SQLite apaga todos os dados sincronizados. Na próxima execução o banco é recriado vazio e o fallback REST TCU é ativado automaticamente.

---

## Changelog resumido

### v0.1.0 (2026-05-13) — entrega inicial

**Adicionado:**
- Servidor MCP com 8 tools de consulta CNES (`buscar_por_codigo_cnes`, `buscar_por_nome`, `buscar_por_municipio`, `buscar_por_tipo`, `listar_profissionais`, `listar_leitos`, `listar_equipamentos`, `listar_servicos`)
- SQLite local como fonte primária; path adaptativo por OS via `VETRUM_CNES_DB_PATH`
- Script CLI de sync: FTP DATASUS → blast → CSV → SQLite (grupos ST, LT, EQ, PF, SR)
- Fallback REST API Mapa da Saúde (TCU) com timeout 5s + 3 retries
- Mascaramento automático de CPF em profissionais
- 125 verificações automatizadas (24 Vitest + 101 integração) — 0 skips
- Mock HTTP local para testes t03 (TCU offline)
- Mock FTP + fake blast para testes t04 (sem rede/blast)
- `.npmignore` excluindo arquivos de desenvolvimento do pacote publicado
- CI GitHub Actions (lint + typecheck + test + build)
- CD GitHub Actions (npm publish em tag `v*`)

**Corrigido:**
- `import iconv from "iconv-lite"` (default import) — ESM não expõe named exports via `import *`
- `function getBaseUrl()` em `src/fallback/client.ts` — env var deve ser lida em runtime, não no import
- `checkFtp()` usa `listarArquivos()` real em vez de TCP-only
- `runFtpTests()` usa `getInMemoryDb()` isolado — evita corrupção do seed compartilhado via INSERT OR REPLACE
- Campo `ServicoOutput.descricao` (não `descricaoServico`) em todos os testes
