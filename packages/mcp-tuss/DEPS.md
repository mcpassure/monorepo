# Dependências — auditoria e justificativas

Este documento registra decisões conscientes sobre versões de dependências.

**Atualizado em:** 2026-05-13

## Stack core (locked a versões correntes)

| Pacote | Versão | Notas |
|--------|--------|-------|
| `@modelcontextprotocol/sdk` | `^1.29.0` | v2 ainda em alpha (Q1 2026) — manter v1 até v2 estabilizar |
| `better-sqlite3` | `^12.10.0` | Requer Node 22+ — v12 é a versão estável com prebuilds para Node 22 |
| `zod` | `^4.4.3` | Zod 4 estável desde mai/2025 |
| `@biomejs/biome` | `^2.4.15` | Substitui ESLint — padrão MCPAssure desde mai/2026 |
| `typescript` | `^5.9.3` | Conservador — TS 6.0 é bridge para TS 7 (native) com breaking changes |
| `vitest` | `^4.1.6` | Requer Node 20+; v4 é a versão corrente estável |
| `tsx` | `^4.21.0` | Executor TypeScript para scripts e dev |
| `@types/node` | `^22.10.0` | Alinhado com Node 22 LTS |
| `@types/better-sqlite3` | `^7.6.13` | |
| `unzipper` | `^0.12.3` | Extração do ZIP 552MB da ANS (Open.file para leitura lazy) |
| `@types/unzipper` | `^0.10.11` | |

## Node engines

- `.nvmrc`: `22`
- `engines.node`: `>=22.0.0`
- Razão: Node 18 EOL abril/2025; better-sqlite3 v12 não tem prebuild para Node 20; Node 22 é LTS estável.

## Decisões sobre parsers (Etapa 2 concluída)

Avaliação feita após confirmar formato real das fontes ANS (ZIP 552MB com XLSX internos):

| Pacote | Decisão | Motivo |
|--------|---------|--------|
| `xlsx` (SheetJS) | ❌ Rejeitado | Licença SSPL pós v0.18.5 — incompatível com MIT. Parser customizado implementado em `src/sync/xlsx-parser.ts` via ZIP Central Directory + `inflateRawSync` + regex XML. |
| `unzipper` | ✅ Adotado | Extração lazy do ZIP 552MB da ANS sem carregar tudo em memória. Ver stack core acima. |
| `csv-parse` | ❌ Não necessário | ANS publica XLSX, não CSV. |
| `iconv-lite` | ❌ Não necessário | ANS XLSX usa UTF-8 nos shared strings XML. |
| `playwright` | ❌ Não necessário | ANS não usa Cloudflare; download direto via `https.get()` funciona. |

## Histórico

### 2026-05-13 — Setup inicial v0.1.0
- Projeto criado do zero com deps modernas (Node 22, Biome 2, Zod 4, MCP SDK 1.29)
- Arquitetura baseada em mcp-cnes v1.1.2 e mcp-anvisa-bulario v1.0.0
- Playwright ainda não incluído — decisão pós-Etapa 2 (detecção de Cloudflare R7)

## Exceções (deps abaixo da última major)

Nenhuma exceção ativa.

## Política de bumps

Ao bumpar uma dep:
1. Verificar changelog e breaking changes
2. Rodar `npm run typecheck && npm run test`
3. Atualizar este arquivo com a justificativa
4. Daniel faz a decisão final de merge
