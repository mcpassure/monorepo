# Dependências — auditoria e justificativas

Este documento registra decisões conscientes sobre versões de dependências.

**Atualizado em:** 2026-05-13

## Stack core (locked a versões correntes)

| Pacote | Versão | Notas |
|---|---|---|
| `@modelcontextprotocol/sdk` | `^1.29.0` | v2 ainda em alpha (Q1 2026) — manter v1 até v2 estabilizar |
| `better-sqlite3` | `^12.10.0` | Requer Node 22+ (substituiu `node:sqlite` experimental usado em versões anteriores) |
| `zod` | `^4.4.3` | Zod 4 estável desde mai/2025 |
| `@biomejs/biome` | `^2.4.15` | Substituiu ESLint em mai/2026 (alinhamento com padrão MCPAssure) |
| `typescript` | `^5.9.3` | Conservador — TS 6.0 é bridge para TS 7 (native) com vários breaks |
| `vitest` | `^4.1.6` | Requer Node 20+ |
| `tsx` | `^4.21.0` | |
| `@types/node` | `^22.10.0` | Alinhado com Node 22 LTS |
| `@types/better-sqlite3` | `^7.6.13` | |

## Histórico de mudanças relevantes

### 2026-05-13 — Modernização completa
- ESLint → Biome 2.4 (consistência com padrão MCPAssure)
- `node:sqlite` (experimental) → `better-sqlite3` (estável, prebuilds)
- vitest 2.x → 4.1.6
- typescript 5.5 → 5.9.3
- tsx sem version pinning → 4.21.0
- @types/node 22.0 → 22.10
- Rebrand: `@vetrum/` → `@mcpassure/`
- Variáveis env: `ANVISA_*` → `MCPASSURE_*`

## Deps específicas deste MCP

Nenhuma adicional além do core. A fonte ANVISA é consumida via `fetch` nativo do Node 22.

Se for necessário adicionar parser HTML futuramente (para `anvisa-portal.ts`):
- Sugestão: `linkedom` ou `cheerio` (verificar versão atual em npm antes de adicionar)

## Node engines

- `.nvmrc`: `22`
- `engines.node`: `>=22.0.0`
- Razão: Node 18 EOL abril/2025; better-sqlite3 v12 não tem prebuild para Node 20.

## Exceções (deps abaixo da última major)

Nenhuma exceção ativa.

## Política de bumps

1. **Toda segunda** o workflow `deps-audit.yml` checa drift.
2. Major version atrás → bumpar OU justificar nesta seção, em até 7 dias.
3. Security vulnerability → bumpar imediatamente (mesmo dia).
4. Coerência com posicionamento MCPAssure: "referência de curadoria" não pode ter deps majors atrás sem justificativa pública.
