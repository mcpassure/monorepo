[🇧🇷 Português (BR)](./README.md) · **🇺🇸 English**

---

# @mcpassure/mcp-tuss

**MCP server for querying official Brazilian TUSS tables from ANS (procedures, medications, hospital fees)**

[![npm](https://img.shields.io/npm/v/@mcpassure/mcp-tuss)](https://www.npmjs.com/package/@mcpassure/mcp-tuss)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Enables AI agents (Claude Desktop, Cursor, VS Code, etc.) to query TUSS (Brazilian Unified Healthcare Terminology) tables from ANS (Brazilian National Supplementary Health Agency) — medical procedures (Tab. 22), medications (Tab. 20), and hospital daily fees/taxes (Tab. 18) — with local SQLite cache and < 5ms latency.

> **Notice:** Data reflects the last local sync. Run `npm run sync` before first use to download official ANS data (~552 MB, ~5-10 min).

---

## Part of the MCPAssure catalog

This MCP is part of the **[MCPAssure](https://github.com/mcpassure)** catalog — curated Brazilian health MCPs with quality seals.

---

## Installation

### Claude Desktop / Cursor / VS Code

```json
{
  "mcpServers": {
    "mcp-tuss": {
      "command": "node",
      "args": ["/path/to/mcp-tuss/dist/index.js"],
      "env": {
        "MCPASSURE_DB_PATH": "/path/to/tuss.db"
      }
    }
  }
}
```

### First sync (required)

```bash
# Linux / Mac / CI
npm run sync

# Windows dev with SSL proxy (Norton, Zscaler, etc.)
MCPASSURE_INSECURE_TLS=1 npm run sync
```

Estimated time: 5–10 minutes. Resulting database: ~17 MB SQLite with 53,250 records from ANS 202603.

---

## Available Tools

| Tool | Description |
|------|-------------|
| `buscar_procedimento_tuss` | Search medical procedures in TUSS Table 22 (Tabela 22). Accepts TUSS code or free-text term. |
| `buscar_medicamento_tuss` | Search medications in TUSS Table 20 (Tabela 20). Accepts code or free-text term. |
| `buscar_diaria_taxa_tuss` | Search hospital daily rates and fees in TUSS Table 18 (Tabela 18). Accepts code or free-text term. |
| `status_sincronizacao_tuss` | Returns local cache status: version, total records, and last sync date. |

---

## Usage Examples

```
"What is the TUSS code for a regular office consultation?"
→ buscar_procedimento_tuss(query="consulta") → code 10101012

"Is there a TUSS code for Dipyrone?"
→ buscar_medicamento_tuss(codigo="90282680") → DIPIRONA SÓDICA

"What is the TUSS code for adult ICU daily rate?"
→ buscar_diaria_taxa_tuss(query="UTI") → DIÁRIA COMPACTA DE ISOLAMENTO DE UTI ADULTO GERAL

"Is TUSS data up to date?"
→ status_sincronizacao_tuss() → version 202603, 53,250 records, sync date
```

---

## Available Prompts

| Prompt | Arguments | Description |
|--------|-----------|-------------|
| `verificar_codigo_tuss` | `codigo`, `tabela?` | Verifies a TUSS code and returns description, validity dates, and source table. |
| `mapear_categoria_procedimentos` | `termo`, `limite?` | Free-text search across all 3 tables, grouped by table. |
| `analisar_compatibilidade_codigos` | `codigos` (comma-separated) | Validates a list of TUSS codes (e.g., `10101012,90010012`) and maps each to its table. |

**Examples:**
```
Prompt: verificar_codigo_tuss
Args: { "codigo": "30602165" }
→ "Code 30602165 (Table 22 — Procedures): Office consultation. Valid: 2009-02-13 to present."

Prompt: analisar_compatibilidade_codigos
Args: { "codigos": "30602165,00000000,90010012" }
→ ✅ 30602165: Tab. 22 | ❌ 00000000: not found | ✅ 90010012: Tab. 20
```

---

## Available Resources

| URI | MIME | Description |
|-----|------|-------------|
| `tuss://tabelas_disponiveis` | `application/json` | List of the 3 covered TUSS tables with update frequency. |
| `tuss://categorias` | `application/json` | Main categories per TUSS table (curated). |
| `tuss://scope` | `text/markdown` | MCP scope in PT-BR and EN-US, with disclaimer and limitations. |

---

## Demo

![Demo](./.github/assets/demo.gif)

---

## Development

```bash
npm install
npm run typecheck    # tsc --noEmit
npm run lint         # biome check
npm test             # vitest run
npm run dev          # tsx src/index.ts
npm run build        # tsc -p tsconfig.build.json
npm run canary       # checks ANS source availability
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCPASSURE_DB_PATH` | `%APPDATA%/mcpassure/tuss/tuss.db` (Win) / `~/.local/share/mcpassure/tuss/tuss.db` (Linux) | SQLite database path |
| `MCPASSURE_DEGRADED_THRESHOLD_DAYS` | `120` | Days of lag before status becomes `stale` |
| `MCPASSURE_RATE_LIMIT_MS` | `2000` | Delay between requests during sync |
| `MCPASSURE_INSECURE_TLS` | — | Set to `1` in dev with SSL-intercepting proxy |

---

## Limitations v0.1.x

- **ANS Rol** — entering scope in v0.2.0 (moving out of "not implemented" status into the product)
- **CBHPM — permanently removed from scope (2026-05-15).** CBHPM is intellectual property of AMB (Brazilian Medical Association), sold as a printed/digital book, **not an open dataset**. Distributing it via a public MCP would violate copyright. CBHPM **will not be included in any version**.
- **TUSS Tab. 19 OPME** not implemented (105MB XLSX — performance concern, under study)
- Search uses LIKE with B-tree index (FTS5 is a v2 improvement)

---

## Legal Disclaimer

TUSS (Brazilian Unified Healthcare Terminology) data extracted from official tables published by ANS (Brazilian National Supplementary Health Agency, ans.gov.br). For informational purposes only. Always consult the current version at the official ANS portal. This MCP does not replace medical, pharmaceutical, or specialized legal advice.

---

## License

MIT — Copyright MCPAssure Brasil 2026

---

[🇧🇷 Leia em Português (BR)](./README.md)
