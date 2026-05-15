# PRD

## Problema

O CNES (Cadastro Nacional de Estabelecimentos de Saúde) é a referência canônica de estabelecimentos de saúde brasileiros, mas seu acesso é fragmentado: SOAP antigo, API REST parcial, dataset CSV mensal em formato bruto. Não existe wrapper MCP do CNES disponível. Sem o MCP CNES, os demais MCPs do catálogo Vetrum (TUSS, ANS, RNDS, DATASUS) ficarão órfãos de referência canônica de estabelecimento.

## Objetivo

Entregar `@vetrum/mcp-cnes` v0.1.0 — servidor MCP TypeScript instalável em 1 comando que expõe 8 tools de consulta ao CNES com SQLite local, fallback online TCU, pipeline de sincronização DATASUS e suíte de testes completa. Ser o segundo MCP do catálogo Vetrum, seguindo os padrões do MCP 1 (Bulário), e estabelecer-se como camada de identidade canônica de estabelecimentos para todos os MCPs futuros do catálogo.

## Resultado esperado

- Servidor MCP funcional, instalável via `npx @vetrum/mcp-cnes` ou configuração direta em Claude Desktop/Code;
- 8 tools respondendo em < 500ms após sincronização do dataset local;
- Dataset sincronizável mensalmente via `npx @vetrum/mcp-cnes sync`;
- Fallback online via API TCU quando dataset local está vazio;
- Testes passando (unitários Vitest + integração 101 casos);
- Publicação no npm registry sob `@vetrum/mcp-cnes`;
- README PT-BR com casos de uso reais e aviso de defasagem LGPD.

## Escopo incluído

- 8 MCP tools: `buscar_por_codigo_cnes`, `buscar_por_nome`, `buscar_por_municipio`, `buscar_por_tipo`, `listar_profissionais`, `listar_leitos`, `listar_equipamentos`, `listar_servicos`
- SQLite embarcado com 5 tabelas (estabelecimentos, leitos, equipamentos, profissionais, serviços_especializados) + sync_log
- Fallback REST TCU para dataset vazio
- Pipeline de sincronização: FTP DATASUS → DBC → blast → CSV → SQLite
- CPF de profissionais mascarado (`***.XXX.XXX-**`)
- Annotations MCP corretas em todas as tools
- structuredContent em todas as tools
- Vitest unitários (queries + tools via InMemoryTransport)
- Suíte de integração em `integration-tests/` com 101 casos e seed realista
- Evals com 12 casos verificáveis

## Escopo excluído

- Dados de pacientes (PHI) — projeto lida apenas com dados públicos de estabelecimentos e profissionais
- Cache de consultas com invalidação na ingestão — não implementado na v0.1.0
- Publicação em Smithery e Glama — pós-v0.1.0
- CI/CD automatizado
- FHIR mapping ativo — estrutura compatível mas sem mapper dedicado na v0.1.0
- Suporte a uvx/Python FastMCP — stack TypeScript obrigatória

## Contexto técnico relevante

- Stack obrigatória: TypeScript + `@modelcontextprotocol/sdk` ^1.29.0 + `better-sqlite3` + `zod` + Biome, idêntica ao MCP 1 (Bulário)
- Transport produção: `StdioServerTransport`; testes: `InMemoryTransport`
- Banco: singleton WAL, path resolvido por `VETRUM_CNES_DB_PATH` > APPDATA/XDG > `~/.local/share/vetrum/cnes/cnes.db`
- Fallback ativo apenas quando `isDatasetEmpty(db)` = true
- `blast` CLI é dependência externa não-npm para conversão DBC→CSV — necessária para sincronização
- FTP DATASUS usa modo passivo — pode ser bloqueado em redes Windows corporativas
- Formato `codUnidade` no endpoint TCU: implementação atual usa `padStart(13, "0")` mas formato real não confirmado em ambiente com rede

## Dependências e integrações relevantes

| Dependência | Tipo | Versão | Obrigatória para |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | npm | ^1.29.0 | runtime MCP |
| `better-sqlite3` | npm | ^9.6.0 | armazenamento |
| `zod` | npm | ^3.23.8 | validação inputs |
| `basic-ftp` | npm | ^5.0.5 | sync FTP |
| `iconv-lite` | npm | ^0.6.3 | decodificação latin1 |
| `blast` CLI | binário externo | — | sync DBC→CSV |
| FTP DATASUS | externo | — | sync mensal |
| API TCU REST | externo | — | fallback online |

## Restrições

- Sem dados PHI de pacientes em nenhuma camada
- Stack idêntica ao MCP 1 (decisão de catálogo)
- Dataset DATASUS em GB — download incremental por UF obrigatório
- Análise estática (Biome) + testes desde o primeiro commit
- Output schemas estruturados (`structuredContent`) obrigatórios em todas as tools
- Documentação inclui aviso explícito de possível defasagem entre dataset e realidade operacional
- Repositório aberto, mesma licença/estrutura do MCP 1

## Critérios de sucesso

1. `npm run test` passa 100% (Vitest)
2. `npm run test:integration` passa 85/85 testes não-rede (t01 + t02 + t05)
3. Todas as tools respondem em < 500ms com SQLite local (T30 passa)
4. `npm run build` compila sem erros
5. `npm run lint` passa sem warnings
6. `npm run typecheck` passa sem erros
7. `npm run sync --uf SP --grupos ST` completa com sucesso quando FTP + blast disponíveis
8. Servidor aceita conexão MCP via StdioTransport e lista 8 tools
9. CPF mascarado em todos os resultados de `listar_profissionais`
10. Publicação `@vetrum/mcp-cnes` no npm registry

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `blast` CLI indisponível no ambiente do usuário | Média | Alto (sync impossível) | Documentar instalação por plataforma; fallback TCU serve enquanto sync não ocorre |
| FTP DATASUS bloqueado (modo passivo Windows) | Alta em corp. | Alto (sync impossível) | Documentar requisito de rede; considerar modo ativo ou mirror HTTP no futuro |
| API TCU offline ou com formato de URL errado | Média | Médio (fallback falha) | Degradar graciosamente com mensagem de instrução de sync |
| Formato `codUnidade` TCU (7 vs 13 dígitos) | Desconhecido | Médio (fallback silencioso) | Testar em ambiente com rede; F07 cobre diagnóstico |
| Dataset DATASUS > espaço em disco disponível | Baixa | Alto | Sync incremental por UF; limpeza de temp files após ingestão |

## Premissas confirmadas

- TypeScript + MCP SDK v1.29.0 funciona como transport stdio em produção ✓
- `better-sqlite3` WAL atende < 500ms para consultas por CNES ✓ (T30 confirmado)
- `InMemoryTransport` do SDK viabiliza testes sem rede ✓ (t01 + t02 + t05 todos passam)
- CPF mascarado como `***.XXX.XXX-**` é aceito pelos testes ✓
- Seed com 6 hospitais realistas é suficiente para validar todos os fluxos locais ✓
- `structuredContent` retornado corretamente em todas as 8 tools ✓ (T29 passa)
- Biome organizeImports requer `type` imports antes de value imports ✓
