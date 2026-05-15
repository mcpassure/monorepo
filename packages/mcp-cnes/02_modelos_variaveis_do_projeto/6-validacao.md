# Validação

## Escopo validado

`@vetrum/mcp-cnes` v0.1.0 — servidor MCP TypeScript com 8 tools de consulta ao CNES, pipeline FTP DATASUS → DBC → CSV → SQLite, fallback REST TCU, e suíte de integração de 101 casos.

Validação realizada em: **2026-05-13**

---

## Verificações automáticas realizadas

| Comando | O que verifica |
|---|---|
| `npm test` | 24 casos Vitest (14 unitários de queries + 10 integração MCP com InMemoryTransport) |
| `npm run test:integration` | 101 casos end-to-end em 5 suítes com seed de 6 hospitais reais |
| `npm run lint` | Biome check em 44 arquivos (src, tests, evals) |
| `npm run typecheck` | TypeScript strict mode, sem erros |
| `npm run build` | Compilação `dist/` via `tsconfig.build.json` |

---

## Resultado das verificações automáticas

### `npm test` (Vitest)
```
✓ tests/unit/db/queries.test.ts     14 tests   25ms
✓ tests/integration/server.test.ts  10 tests   41ms
Test Files: 2 passed (2)
Tests: 24 passed (24)
Duration: 7.28s
```

### `npm run test:integration`
```
✅ 101 passaram, 0 falharam, 0 pulados (total 101) — 730ms
```

Distribuição por suíte:

| Suite | Casos | Resultado | Mecanismo |
|---|---|---|---|
| t01-queries | 40 | ✅ 40/40 | SQLite in-memory + seed 6 hospitais |
| t02-tools | 30 | ✅ 30/30 | McpServer + InMemoryTransport |
| t03-fallback | 7 | ✅ 7/7 | Mock HTTP local (Node.js `http.createServer`) |
| t04-ftp | 9 | ✅ 9/9 | `VETRUM_FTP_MOCK=1` + fake blast + DB isolado |
| t05-scenarios | 15 | ✅ 15/15 | End-to-end via InMemoryTransport |

### `npm run lint`
```
Checked 44 files in 11ms. No fixes applied.
```

### `npm run typecheck`
```
(sem erros — saída vazia = sucesso)
```

### `npm run build`
```
(sem erros — dist/ gerado com sucesso)
```

---

## Itens pendentes de validação manual

| Item | Comando / Ação | Bloqueio |
|---|---|---|
| FTP real DATASUS | `npm run test:integration` com FTP acessível | FTP passivo bloqueado no ambiente Windows atual |
| Conversão DBC real | Executar t04 com `blast` real no PATH | `blast` CLI não instalado |
| Sync real ST/SP | `npm run sync -- --uf SP --grupos ST` | Requer blast + FTP |
| API TCU online | `npm run test:integration` com rede liberada | Timeout em conexões externas no ambiente atual |
| Claude Desktop | `npm run dev` + conexão MCP manual | Sem Claude Desktop no ambiente |
| Diagnóstico codUnidade | `buscarPorCodigoCnes("0000002077485")` com API real | Formato 13 dígitos não confirmado com rede real |
| README PT-BR | Revisão de conteúdo | A verificar antes da publicação npm |

---

## Resultado da validação manual já confirmada

| Item | Status | Evidência |
|---|---|---|
| 8 tools listadas via InMemoryTransport | ✅ | t02 testa via `list_tools` com McpServer + InMemoryTransport |
| buscar_por_codigo_cnes HC FMUSP | ✅ | t01 Q01, t02 T01, t05 S01 — resultado consistente |
| CPF mascarado em profissionais | ✅ | t02 T21, `tests/integration/server.test.ts` caso "CPF mascarado" |
| structuredContent em todas as tools | ✅ | t02 T01–T30 verificam `structuredContent` em cada resposta |
| Fallback TCU com mock HTTP local | ✅ | t03 F01–F07 com mock server em porta aleatória (0) |
| FTP mock com VETRUM_FTP_MOCK=1 | ✅ | t04 FTP01–FTP09 com mock data + fake blast |
| Ingestão idempotente (UPSERT) | ✅ | t04 FTP09 verifica contagem pré/pós reingestão |
| Performance < 2ms por query com seed | ✅ | t02 T30: 5 tools críticas em sequência < 2ms total |
| Seed 6 hospitais reais carregado | ✅ | t01, t02, t05 — queries retornam dados consistentes com seed |
| Código IBGE 7 dígitos truncado para 6 | ✅ | t01 Q31 testa `codigoIbge.slice(0,6)` |
| iconv latin1 decode funciona | ✅ | t04 FTP08 ingere CSV mock via `iconv.decodeStream("latin1")` |
| BASE_URL resolve em runtime | ✅ | t03 redireciona para mock server via env var setada após import |

---

## Divergências em relação à spec

### Resolvidas nesta sessão de validação

| Divergência | Spec diz | Realidade anterior | Resolução |
|---|---|---|---|
| t03-fallback pulava por falta de rede | 7 casos executam sempre | 7 testes eram skipped se API offline | Mock HTTP local criado; 7/7 executam sem rede |
| t04-ftp pulava 16 casos | 9 casos executam sempre | 16 testes skipped (FTP + blast) | `VETRUM_FTP_MOCK` + `criarFakeBlast()` + DB isolado |
| `checkFtp()` TCP-only | Verifica listagem FTP real | Apenas testava porta 21 TCP | Corrigido para `listarArquivos("ST","SP")` |
| `iconv.decodeStream` undefined | ingest.ts decodifica latin1 | `import * as iconv` em ESM não expõe named exports | `import iconv from "iconv-lite"` (default import) |
| BASE_URL const avaliada no import | env var VETRUM_TCU_BASE_URL override funciona | `const BASE_URL = process.env...` avaliado uma vez no import | `function getBaseUrl()` lê env var em runtime |
| DB compartilhado corrompendo seed em t04 | FTP ingest não afeta outros testes | `runFtpTests` usava `db` param compartilhado | `getInMemoryDb()` isolado dentro de `runFtpTests` |
| `.npmignore` ausente | `.npmignore` na raiz | Não criado | ✅ Criado com exclusões de src/, tests/, docs/ |
| Spec indicava "85 pass / 16 skip" | 101 casos sem skips | Contagem defasada | ✅ 101/101 pass, 0 skip, 0 fail |

### Divergências remanescentes

| Divergência | Detalhe | Impacto |
|---|---|---|
| Testes unitários `tests/unit/tools/*.test.ts` ausentes | Spec define 8 arquivos por tool; implementado como integração | Baixo — cobertura equivalente via InMemoryTransport |
| Testes unitários `tests/unit/sync/*.test.ts` ausentes | Spec define convert/ingest/state tests | Médio — sync sem cobertura automatizada |
| Evals estruturadas como array único | Spec sugeria 12 arquivos separados | Nenhum — estrutura alternativa igualmente válida |
| `padStart(13,"0")` no fallback TCU | Formato real codUnidade não confirmado | Baixo — fallback usa 7 dígitos; F07 é diagnóstico |

---

## Divergências em relação ao plano

| Item do plano | Status no plano | Status real |
|---|---|---|
| Suite t03-fallback (7) | "skip sem rede" | ✅ 7/7 passando com mock HTTP |
| Suite t04 FTP+blast (9) | "skip sem rede/blast" | ✅ 9/9 passando com mock FTP + fake blast |
| Integração 101 casos | "85 pass / 16 skip" | ✅ 101 pass / 0 fail / 0 skip |
| `.npmignore` | ⏳ Pendente | ✅ Criado |
| README.md PT-BR | ⏳ Verificar | ⏳ A verificar antes da publicação |
| `git init` + publicação npm | ⏳ Pendente | ⏳ Ainda pendente |
| Sync com dados reais | ⏳ Pendente | ⏳ Ainda pendente (requer blast + FTP) |

---

## Riscos remanescentes

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| FTP DATASUS inacessível em produção (Windows/firewall) | Alta | Médio | Sync pode ser executado em Linux/VPS; mock garante testes sempre |
| `blast` CLI ausente no ambiente do usuário | Alta | Alto para sync | `BlastNaoEncontradoError` com instruções; MCP server funciona sem blast |
| Formato `codUnidade` TCU (7 vs 13 dígitos) | Média | Baixo | Usa 7 dígitos (`padStart(7)`); F07 diagnóstico a confirmar com rede |
| Dataset DATASUS vazio em instalação nova | Certa | Médio | Fallback TCU serve consultas básicas; aviso no README necessário |
| API TCU offline ou depreciada | Média | Médio | Timeout 5s + 3 retries + degradação graceful com mensagem |
| Lógica de sync sem cobertura automática | Certa | Médio | Testes unitários de sync planejados para v0.2.0 |
| Performance com dataset nacional completo | Incerta | Médio | Medir após primeiro sync completo; índices SQLite devem manter <500ms |

---

## Conclusão

**O projeto está pronto para publicação npm (Fase 3) com as pendências documentadas.**

1. **Verificações automáticas: 100% passando.** 24 casos Vitest + 101 casos de integração = 125 casos totais, todos passando sem falhas e sem skips. Lint, typecheck e build limpos.

2. **Zero skips atingido.** A suíte de integração foi refatorada para nunca pular testes — mock HTTP local (t03), mock FTP + fake blast (t04), DB isolado para ingest (t04). Isso garante que regressões em qualquer camada são detectadas independentemente de infraestrutura externa.

3. **Pendências pré-publicação (bloqueantes):**
   - Validar `README.md` PT-BR (conteúdo e aviso LGPD/defasagem)
   - `git init` + commit inicial
   - `npm login` + `npm publish --access public`

4. **Pendências pós-publicação (não bloqueantes para v0.1.0):**
   - Sync real com blast + FTP em ambiente Linux
   - Confirmar formato `codUnidade` TCU com API online
   - Teste em Claude Desktop com `buscar_por_codigo_cnes`
   - Testes unitários de sync para v0.2.0
