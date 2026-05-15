# Pesquisa Técnica

## Pergunta ou objetivo do pedido

Documentar o estado atual completo do `@vetrum/mcp-cnes` — servidor MCP TypeScript para consulta ao CNES (Cadastro Nacional de Estabelecimentos de Saúde), segundo MCP do catálogo Vetrum Brasil, com sincronização DATASUS e papel de camada de identidade canônica de estabelecimentos para os demais MCPs do catálogo.

---

## Resumo executivo do que existe hoje

O `@vetrum/mcp-cnes` v0.1.0 está **integralmente implementado e funcional**. O projeto entrega:

- **8 MCP tools** cobrindo busca de estabelecimentos (por código, nome, município, tipo) e listagem de recursos por CNES (profissionais, leitos, equipamentos, serviços);
- **SQLite embarcado** (`better-sqlite3`) com 5 tabelas normalizadas e índices para < 500ms;
- **Fallback REST** via API TCU (`http://mobile-aceite.tcu.gov.br/mapa-da-saude/rest/`) quando dataset local está vazio;
- **Pipeline de sincronização** FTP DATASUS → DBC → CSV (via `blast` CLI) → SQLite com ingestão por lote de 1.000 registros;
- **Suíte de testes integrados** com 101 casos: 85 passaram / 0 falharam / 16 pulados (rede externa inacessível);
- **Vitest** para testes unitários e de integração MCP (`tests/`);
- **Biome** para lint e formatação;
- **TypeScript** strict com `tsconfig.build.json` separado.

---

## Arquivos e diretórios relevantes

```
2-mcp-CNES/
├── src/
│   ├── index.ts                         # entrypoint; chama startServer()
│   ├── server.ts                        # createServer() + startServer() via StdioServerTransport
│   ├── db/
│   │   ├── connection.ts                # getDb(), getInMemoryDb(), isDatasetEmpty()
│   │   ├── schema.ts                    # DDL das 6 tabelas SQLite
│   │   ├── tipos_unidade.ts             # mapeamento tipo legível → código TP_UNIDADE
│   │   ├── leitos_tipos.ts              # dicionário de tipos de leito
│   │   ├── equipamentos_tipos.ts        # dicionário de tipos de equipamento
│   │   └── queries/
│   │       ├── estabelecimentos.ts      # porCodigo, porNome, porMunicipio, porTipo
│   │       ├── leitos.ts                # porCnes
│   │       ├── equipamentos.ts          # porCnes
│   │       ├── profissionais.ts         # porCnes (CPF mascarado)
│   │       └── servicos.ts              # porCnes
│   ├── tools/
│   │   ├── annotations.ts               # CNES_ANNOTATIONS (readOnly, idempotent, etc.)
│   │   ├── schemas.ts                   # schemas Zod de input + tipos de output TypeScript
│   │   ├── buscar_por_codigo_cnes.ts
│   │   ├── buscar_por_nome.ts
│   │   ├── buscar_por_municipio.ts
│   │   ├── buscar_por_tipo.ts
│   │   ├── listar_profissionais.ts
│   │   ├── listar_leitos.ts
│   │   ├── listar_equipamentos.ts
│   │   └── listar_servicos.ts
│   ├── fallback/
│   │   ├── client.ts                    # buscarPorCodigoCnes + buscarPorNomeFallback via REST TCU
│   │   └── types.ts                     # TcuEstabelecimento
│   └── sync/
│       ├── index.ts                     # CLI de sync: --uf, --grupos, --force
│       ├── ftp.ts                       # listarArquivos + downloadArquivo (basic-ftp)
│       ├── convert.ts                   # converterDbcParaCsv (exige blast CLI)
│       ├── ingest.ts                    # ingerirCsv com UPSERT por lotes
│       ├── state.ts                     # jaProcessado + registrarSync (sync_log)
│       └── mappers/
│           ├── ST.ts                    # mapper estabelecimentos
│           ├── LT.ts                    # mapper leitos
│           ├── EQ.ts                    # mapper equipamentos
│           ├── PF.ts                    # mapper profissionais
│           └── SR.ts                    # mapper serviços especializados
├── tests/
│   ├── fixtures/seed.ts                 # seedDatabase() para testes unitários (Vitest)
│   ├── unit/db/queries.test.ts          # 17 testes unitários das queries SQLite
│   └── integration/server.test.ts      # 9 testes MCP via McpServer + InMemoryTransport
├── integration-tests/
│   ├── bin/
│   │   ├── run-all.ts                   # orquestrador; flags --skip-seed, --offline, --no-ftp
│   │   ├── helpers/
│   │   │   ├── assert.ts                # assertEqual, assertGreater, assertContains, etc.
│   │   │   └── reporter.ts             # Reporter (pass/fail/skip), gera JSON + Markdown
│   │   ├── seed/
│   │   │   ├── hospitals.ts             # 6 hospitais de referência com dados realistas
│   │   │   └── seed-api.ts              # seedDatabase(db): insere base + tenta enriquecer via TCU
│   │   └── tests/
│   │       ├── t01-queries.ts           # 40 testes das queries SQLite
│   │       ├── t02-tools.ts             # 30 testes das 8 MCP tools
│   │       ├── t03-fallback.ts          # 7 testes REST TCU fallback (requer rede)
│   │       ├── t04-ftp.ts               # 9 testes FTP + pipeline DBC (requer rede + blast)
│   │       └── t05-scenarios.ts         # 15 cenários de uso real
│   └── results/
│       ├── latest/summary.md            # relatório Markdown mais recente
│       └── {timestamp}/                 # resultados históricos (JSON + MD + .db)
├── evals/
│   └── index.ts                         # 12 eval cases (pergunta + verificação estruturada)
├── package.json
├── tsconfig.json / tsconfig.build.json
└── 02_modelos_variaveis_do_projeto/     # artefatos do fluxo documental Vetrum
```

---

## Componentes e responsabilidades

### Entrada (transport)
- `src/index.ts` → `src/server.ts`: inicia `McpServer` com `StdioServerTransport`. Em produção, o processo comunica via stdin/stdout com o host MCP (Claude Desktop, Claude Code, VS Code).

### Camada de tools (src/tools/)
Cada tool segue o padrão:
```typescript
export function registerXxx(server: McpServer, getDb: () => Database.Database): void {
  server.registerTool("nome_tool", { title, description, inputSchema, annotations }, handler)
}
```
- **`annotations.ts`**: `CNES_ANNOTATIONS = { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: true }` — aplicado uniformemente.
- **`schemas.ts`**: Zod schemas de input (CodigoCnesSchema exige `/^\d{7}$/`; CodigoIbgeSchema aceita 6 ou 7 dígitos; TipoEstabelecimentoEnum valida 12 tipos); tipos de output TypeScript (`EstabelecimentoOutput`, `ProfissionalOutput`, `LeitoOutput`, `EquipamentoOutput`, `ServicoOutput`).
- Todas as tools retornam `{ content: [{type:"text"}], structuredContent: {...} }`.

### Camada de dados (src/db/)
**Schema SQLite** (6 tabelas):
| Tabela | PK | Conteúdo |
|---|---|---|
| `estabelecimentos` | `co_cnes` | dados cadastrais (nome, tipo, município, UF, coords) |
| `leitos` | `(co_cnes, co_leito, competencia)` | tipos e quantidades de leitos |
| `equipamentos` | `(co_cnes, co_equip, competencia)` | equipamentos e quantidades |
| `profissionais` | `(co_cnes, cpf_prof, co_cbo, competencia)` | vínculos com CPF mascarado |
| `servicos_especializados` | `(co_cnes, co_servico, co_class_sr, competencia)` | serviços por CNES |
| `sync_log` | `id AUTOINCREMENT` | histórico de sincronizações |

**Caminho do banco**:
- Padrão: `%APPDATA%/vetrum/cnes/cnes.db` (Windows) ou `~/.local/share/vetrum/cnes/cnes.db` (Linux/Mac)
- Override: `VETRUM_CNES_DB_PATH` env var
- Testes: `:memory:` via `getInMemoryDb()`

**Queries**: todas síncronas (`better-sqlite3`), prepared statements, LIKE case-insensitive. CPF mascarado na query em `profissionais.ts` (formato `***.XXX.XXX-**`).

**Normalização IBGE**: `co_municipio` com 7 dígitos truncado para 6 em `porMunicipio()` e `porTipo()`.

### Fallback online (src/fallback/)
Ativado automaticamente quando `isDatasetEmpty(db)` retorna `true`. Usa `http://mobile-aceite.tcu.gov.br/mapa-da-saude/rest/` com:
- timeout 5s, 3 retries com backoff linear
- endpoints: `/estabelecimentos/unidade/{codUnidade}` e `/estabelecimentos?nomeFantasia=...`
- retorna `source: "online_fallback"` nos campos de output
- `buscar_por_codigo_cnes` passa `codigoCnes.padStart(13, "0")` para o endpoint (formato de 13 dígitos)

### Pipeline de sincronização (src/sync/)
Fluxo: FTP DATASUS → `.dbc` → `blast` → `.csv` (latin1) → SQLite
- `ftp.ts`: `listarArquivos(grupo, uf)` lista e filtra por regex `^{GRUPO}{UF}(\d{4})(\d{2})\.dbc$`; `downloadArquivo()` faz download para dir temporário
- `convert.ts`: `converterDbcParaCsv(dbc, csv)` executa `blast "{dbc}" "{csv}"` via `execSync`
- `ingest.ts`: `ingerirCsv(db, csv, grupo, competencia)` lê CSV latin1 linha a linha, aplica mapper, UPSERT em lotes de 1.000
- `state.ts`: `jaProcessado(db, grupo, uf, comp)` verifica `sync_log`; `registrarSync()` grava resultado
- CLI `sync/index.ts`: aceita `--uf SP,RJ`, `--grupos ST,LT,EQ,PF,SR`, `--force`; itera todas as 27 UFs por padrão
- Grupos disponíveis: ST (estabelecimentos), LT (leitos), EQ (equipamentos), PF (profissionais), SR (serviços)
- FTP: `ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/{GRUPO}/`

### Testes
**Vitest (`npm test`)**:
- `tests/unit/db/queries.test.ts`: 17 casos cobrindo todas as 5 funções de query
- `tests/integration/server.test.ts`: 9 casos MCP via InMemoryTransport

**Integração (`npm run test:integration`)**:
- `integration-tests/`: 101 casos em 5 suítes
- Seed: 6 hospitais de referência hardcoded (HC FMUSP/2077485, InCor/2079046, HU UFSC/3467485, INCA/2270295, Hospital Base DF/2237076, HCPA/4049869)
- Resultado mais recente: **85 pass / 0 fail / 16 skip** (skips são todos de rede externa inacessível neste ambiente)

---

## Fluxos atuais relacionados

### Fluxo de consulta — dataset populado
```
Host MCP → StdioTransport → McpServer → registerXxx handler
  → getDb() [singleton, WAL, auto-schema]
  → isDatasetEmpty() → false
  → query SQLite (prepared stmt)
  → structuredContent + content[text]
```

### Fluxo de consulta — dataset vazio (fallback)
```
Host MCP → McpServer → buscar_por_codigo_cnes handler
  → isDatasetEmpty() → true
  → buscarPorCodigoCnes(cnes.padStart(13, "0"))
  → fetch TCU REST → tcuToOutput()
  → structuredContent { source: "online_fallback" }
```

### Fluxo de sincronização
```
CLI: npx @vetrum/mcp-cnes sync --uf SP --grupos ST,LT,EQ,PF,SR
  → listarArquivos(grupo, uf) [FTP]
  → arquivos[0] (mais recente por competência)
  → jaProcessado() → false
  → downloadArquivo() [FTP]
  → converterDbcParaCsv() [blast]
  → ingerirCsv(db, csv, grupo, competencia) [UPSERT lotes]
  → registrarSync(db, ...)
```

---

## Contratos, integrações e dependências encontradas

### Dependências de produção
| Pacote | Versão | Uso |
|---|---|---|
| `@modelcontextprotocol/sdk` | ^1.29.0 | McpServer, StdioServerTransport, InMemoryTransport |
| `better-sqlite3` | ^9.6.0 | SQLite síncrono, WAL, prepared stmts |
| `zod` | ^3.23.8 | Validação de inputs das tools |
| `basic-ftp` | ^5.0.5 | Cliente FTP para DATASUS |
| `iconv-lite` | ^0.6.3 | Decodificação latin1 dos CSVs DATASUS |

### Dependências externas (runtime)
- **`blast` CLI** (não-npm): executável externo obrigatório para conversão DBC→CSV
  - macOS: `brew install blast-datasus`
  - Ubuntu: `sudo apt install blast`
  - Windows: binário em `https://github.com/datasus/blast/releases`
- **FTP DATASUS**: `ftp.datasus.gov.br` (modo passivo; pode ser bloqueado em redes corporativas/Windows)
- **API REST TCU** (fallback): `http://mobile-aceite.tcu.gov.br/mapa-da-saude/rest/` (HTTP simples)

### Contrato MCP (ToolAnnotations)
Todas as 8 tools declaram: `readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: true`

### Contrato FHIR futuro
`EstabelecimentoOutput` tem campos suficientes para mapeamento a `Organization` e `Location` FHIR: `codigoCnes`, `nomeFantasia`, `razaoSocial`, `municipio`, `uf`, `codigoIbge`, `latitude`, `longitude`, `endereco`, `vinculoSus`.

---

## Padrões existentes reutilizáveis

1. **Padrão register/getDb**: cada tool é um módulo `register*(server, getDb)` — getDb como factory injetada permite testes com `:memory:`.
2. **structuredContent obrigatório**: `{ content: [{type:"text", text: JSON.stringify(r)}], structuredContent: r }` — todas as tools.
3. **UPSERT idempotente**: `INSERT OR REPLACE` garante re-ingestão sem duplicatas.
4. **Seed realista**: `integration-tests/bin/seed/hospitals.ts` com dados hardcoded verificáveis — padrão exportável para MCPs futuros do catálogo Vetrum.
5. **Reporter de integração**: `reporter.ts` produz JSON + Markdown estruturado — reutilizável.
6. **Graceful degradation por skip**: t03 e t04 verificam disponibilidade antes de executar; retornam skip em vez de fail quando dependência externa ausente.
7. **Annotations uniformes**: `CNES_ANNOTATIONS` exportado de um único arquivo — padrão para MCPs read-only do catálogo.

---

## Contexto histórico ou documental relevante

- O projeto segue a metodologia de 7 etapas do catálogo Vetrum Brasil, documentada em `01_regras_permanentes/`.
- É o **segundo MCP do catálogo Vetrum**, seguindo os padrões do MCP 1 (Bulário Eletrônico).
- A suíte de testes de integração foi criada após a implementação inicial e revelou um bug de nomenclatura de campo (`descricaoServico` → `descricao` em `ServicoOutput`), corrigido.
- O `checkFtp()` foi corrigido de verificação TCP-only para verificação de listagem real, eliminando 6 falsos negativos que mascaravam inacessibilidade real do FTP em modo passivo.

---

## Metadados da pesquisa

### Branch atual
Repositório local sem git inicializado.

### Commit atual
N/A

### Repositório
`D:\ambiente_github\projetos pessoais\mcp_vetrum\2-mcp-CNES`
URL futura: `https://github.com/vetrum/mcp-cnes`

### Data da pesquisa
2026-05-13

---

## Referências objetivas de arquivos

| Arquivo | Linha(s) | Relevância |
|---|---|---|
| `src/server.ts` | 13-29 | registro das 8 tools no McpServer |
| `src/db/connection.ts` | 7-15 | resolução do caminho do banco (APPDATA/XDG) |
| `src/db/schema.ts` | 4-98 | DDL completo das 6 tabelas |
| `src/tools/schemas.ts` | 3-127 | todos os contratos de input/output |
| `src/tools/annotations.ts` | 3-8 | CNES_ANNOTATIONS uniforme |
| `src/fallback/client.ts` | 54 | `padStart(13, "0")` no fallback — formato a verificar |
| `src/sync/ftp.ts` | 21 | regex de detecção de arquivo DBC |
| `src/sync/ingest.ts` | 55 | transação de UPSERT por lote |
| `src/db/queries/estabelecimentos.ts` | 83 | normalização IBGE 7→6 dígitos |
| `integration-tests/bin/tests/t04-ftp.ts` | 25-35 | checkFtp() via listarArquivos() |
| `integration-tests/results/latest/summary.md` | — | 85/0/16 resultado mais recente |

---

## Pontos que devem seguir para o PRD

1. **Testes de rede externa (16 pulados)**: F01-F07 (API TCU) e FTP01-FTP09 (FTP + blast) nunca executaram neste ambiente — funcionalidades implementadas mas não validadas em produção.
2. **Formato `codUnidade` no fallback**: `buscar_por_codigo_cnes` passa 13 dígitos para o endpoint TCU, mas o formato real não foi confirmado (teste diagnóstico F07 foi pulado).
3. **`blast` CLI não disponível**: as etapas de conversão DBC→CSV e ingestão de dados reais nunca foram testadas — dependência crítica para uso em produção.
4. **Dataset nunca sincronizado**: o banco de produção não contém dados reais DATASUS — apenas os 6 hospitais do seed de integração.
5. **Publicação npm pendente**: `@vetrum/mcp-cnes` não foi publicado no registry (sem `.npmignore`, sem `npm publish`).
6. **README.md**: documentação PT-BR com casos de uso, instruções e aviso LGPD/defasagem deve ser verificada como completa.
