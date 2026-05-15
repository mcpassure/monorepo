**🇧🇷 Português (BR) · [🇺🇸 English](./README.en.md)**

---

# @mcpassure/mcp-tuss

**MCP server para consulta das tabelas TUSS da ANS (procedimentos, medicamentos, diárias/taxas)**

[![npm](https://img.shields.io/npm/v/@mcpassure/mcp-tuss)](https://www.npmjs.com/package/@mcpassure/mcp-tuss)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![OSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/mcpassure/monorepo/badge)](https://securityscorecards.dev/viewer/?uri=github.com/mcpassure/monorepo)
[![SAFE-MCP](https://img.shields.io/badge/SAFE--MCP-mapped-green)](#safe-mcp-mapping)

Permite que agentes de IA (Claude Desktop, Cursor, VS Code, etc.) consultem as tabelas TUSS da ANS — procedimentos médicos (Tab. 22), medicamentos (Tab. 20) e diárias/taxas hospitalares (Tab. 18) — com cache local SQLite e latência < 5ms.

> **Aviso:** Os dados refletem a última sincronização local. Execute `npm run sync` antes do primeiro uso para baixar os dados oficiais da ANS (~552 MB, ~5-10 min).

---

## Parte do catálogo MCPAssure

Este MCP faz parte do catálogo **[MCPAssure](https://github.com/mcpassure)** — curadoria de MCPs de saúde brasileiros com selos de qualidade.

---

## Instalação

### Claude Desktop / Cursor / VS Code

```json
{
  "mcpServers": {
    "mcp-tuss": {
      "command": "node",
      "args": ["/caminho/para/mcp-tuss/dist/index.js"],
      "env": {
        "MCPASSURE_DB_PATH": "/caminho/para/tuss.db"
      }
    }
  }
}
```

### Primeira sincronização (obrigatória)

```bash
# Linux / Mac / CI
npm run sync

# Dev Windows com proxy SSL (Norton, Zscaler, etc.)
MCPASSURE_INSECURE_TLS=1 npm run sync
```

Tempo estimado: 5–10 minutos. Banco resultante: ~17 MB SQLite com 53.250 registros ANS 202603.

---

## Tools disponíveis

| Tool | Descrição |
|------|-----------|
| `buscar_procedimento_tuss` | Busca procedimentos médicos na Tabela 22 do TUSS. Aceita código TUSS ou termo livre. |
| `buscar_medicamento_tuss` | Busca medicamentos na Tabela 20 do TUSS. Aceita código ou termo livre. |
| `buscar_diaria_taxa_tuss` | Busca diárias e taxas hospitalares na Tabela 18 do TUSS. Aceita código ou termo livre. |
| `status_sincronizacao_tuss` | Retorna o status do cache local: versão, total de registros e data da última sync. |

---

## Exemplos de uso

```
"Qual o código TUSS de consulta médica em consultório?"
→ buscar_procedimento_tuss(query="consulta") → código 10101012

"Existe código TUSS para Dipirona Sódica?"
→ buscar_medicamento_tuss(codigo="90282680") → DIPIRONA SÓDICA

"Qual o código de diária de UTI adulto?"
→ buscar_diaria_taxa_tuss(query="UTI") → DIÁRIA COMPACTA DE ISOLAMENTO DE UTI ADULTO GERAL

"Os dados TUSS estão atualizados?"
→ status_sincronizacao_tuss() → versão 202603, 53.250 registros, data sync
```

---

## Prompts disponíveis

| Prompt | Argumentos | Descrição |
|--------|------------|-----------|
| `verificar_codigo_tuss` | `codigo`, `tabela?` | Verifica um código TUSS e retorna descrição, vigência e tabela de origem. |
| `mapear_categoria_procedimentos` | `termo`, `limite?` | Busca por termo livre nas 3 tabelas, agrupando resultados por tabela. |
| `analisar_compatibilidade_codigos` | `codigos` (vírgulas) | Valida lista de códigos TUSS (ex: `10101012,90010012`) e mapeia cada um à sua tabela. |

**Exemplos:**
```
Prompt: verificar_codigo_tuss
Args: { "codigo": "30602165" }
→ "Código 30602165 (Tabela 22 — Procedimentos): Consulta em consultório. Vigência: 2009-02-13 até atual."

Prompt: analisar_compatibilidade_codigos
Args: { "codigos": "30602165,00000000,90010012" }
→ ✅ 30602165: Tab. 22 | ❌ 00000000: não localizado | ✅ 90010012: Tab. 20
```

---

## Resources disponíveis

| URI | MIME | Descrição |
|-----|------|-----------|
| `tuss://tabelas_disponiveis` | `application/json` | Lista das 3 tabelas TUSS cobertas com periodicidade de atualização. |
| `tuss://categorias` | `application/json` | Categorias principais por tabela TUSS (curadoria). |
| `tuss://scope` | `text/markdown` | Escopo do MCP em PT-BR e EN-US, com disclaimer e limitações. |

---

## Demo

🚧 Demo GIF em breve.

---

## Desenvolvimento

```bash
npm install
npm run typecheck    # tsc --noEmit
npm run lint         # biome check
npm test             # vitest run (59 testes)
npm run dev          # tsx src/index.ts
npm run build        # tsc -p tsconfig.build.json
npm run canary       # verifica disponibilidade da fonte ANS
```

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `MCPASSURE_DB_PATH` | `%APPDATA%/mcpassure/tuss/tuss.db` (Win) / `~/.local/share/mcpassure/tuss/tuss.db` (Linux) | Caminho do banco SQLite |
| `MCPASSURE_DEGRADED_THRESHOLD_DAYS` | `120` | Dias de defasagem para status `stale` |
| `MCPASSURE_RATE_LIMIT_MS` | `2000` | Delay entre requests durante sync |
| `MCPASSURE_INSECURE_TLS` | — | Defina `1` em dev com proxy SSL interceptador |

---

## Limitações v0.1.x

- **Rol ANS** — entrará no escopo na v0.2.0 (sai do status "não implementado" e vai pro produto)
- **CBHPM — removida permanentemente do escopo (2026-05-15).** A CBHPM é propriedade intelectual da AMB (Associação Médica Brasileira), vendida em livro impresso/digital, **não é base aberta**. Distribuí-la via MCP público violaria direito autoral. CBHPM **não entra em versão nenhuma**.
- **TUSS Tab. 19 OPME** não implementada (XLSX 105MB — performance, em estudo)
- Busca usa LIKE com índice B-tree (FTS5 é melhoria v2)

---

## SAFE-MCP Mapping

Avaliação contra o framework SAFE-MCP (OpenSSF + LF + OpenID Foundation).

### Ataques mitigados

| ID | Ataque | Status | Como mitigamos |
|----|--------|--------|----------------|
| SAFE-T001 | Tool Poisoning | ✓ Mitigado | Tools com schema Zod estrito, validação de input em runtime |
| SAFE-T002 | Indirect Prompt Injection via tool output | ✓ Mitigado | Output estruturado (`structuredContent`), sem texto livre de fonte externa |
| SAFE-T003 | Credential exposure | ✓ Mitigado | Sem credenciais em runtime client — dados públicos ANS sem auth |
| SAFE-T004 | Data exfiltration | ✓ Mitigado | Tools read-only sobre dados públicos; sem acesso a dados do usuário |
| SAFE-T005 | Resource exhaustion | ✓ Mitigado | Cache SQLite local, rate limit configurável, sem loops de download em runtime |

### Ataques NÃO mitigados (declaração honesta)

| ID | Ataque | Por que não mitigado |
|----|--------|---------------------|
| SAFE-T010 | Supply-chain attack via npm deps | Confiamos em `pnpm audit` + Renovate; sem SBOM gerado ainda |
| SAFE-T015 | Side-channel timing analysis | Não relevante para dados públicos tabelados |

### Lethal Trifecta Declaration (Willison, 2025)

1. **Acesso a dados privados** — ✗ **Ausente.** TUSS são tabelas públicas ANS; nenhum dado de usuário é acessado.
2. **Exposição a conteúdo não-confiável** — ⚠ **Parcial.** Inputs validados por Zod; dados retornados são do banco local, não de fontes externas em tempo real.
3. **Capacidade de comunicação externa** — ✗ **Ausente.** MCP comunica apenas com banco SQLite local; sync é operação separada, não em runtime.

**Conclusão:** este MCP **não combina os 3 fatores simultaneamente**. Diferencial arquitetural declarado por design.

---

## Aviso legal

Dados TUSS extraídos das tabelas publicadas pela ANS (ans.gov.br). Caráter exclusivamente informativo. Consulte sempre a versão vigente no portal oficial da ANS. Este MCP não substitui orientação médica, farmacêutica ou jurídica especializada.

---

## Licença

MIT — Copyright MCPAssure Brasil 2026
