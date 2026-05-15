**[🇧🇷 Português (BR)](./README.md) · 🇺🇸 English**

---

# @mcpassure/mcp-anvisa-bulario

**MCPAssure Catalog — Wave 1** — MCP server for querying the ANVISA Electronic Drug Information Database (Bulário Eletrônico).

Enables AI agents (Claude, GPT, Copilot) to query drug leaflets (bulas), active ingredients, therapeutic classes, and other metadata for medications registered in Brazil, with structured responses and efficient caching.

[![CI](https://github.com/mcpassure/mcp-anvisa-bulario/actions/workflows/ci.yml/badge.svg)](https://github.com/mcpassure/mcp-anvisa-bulario/actions)
[![npm](https://img.shields.io/npm/v/@mcpassure/mcp-anvisa-bulario)](https://www.npmjs.com/package/@mcpassure/mcp-anvisa-bulario)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Quick install

```bash
npx -y @mcpassure/mcp-anvisa-bulario
```

On first install, `postinstall` downloads the Playwright Chromium browser (~150MB). This is required by the HTTP transport (see [Requirements](#requirements)).

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "anvisa-bulario": {
      "command": "npx",
      "args": ["-y", "@mcpassure/mcp-anvisa-bulario"]
    }
  }
}
```

### VS Code / Claude Code

```json
{
  "mcp": {
    "servers": {
      "anvisa-bulario": {
        "command": "npx",
        "args": ["-y", "@mcpassure/mcp-anvisa-bulario"]
      }
    }
  }
}
```

---

## Available Tools

| Tool | Description |
|---|---|
| `buscar_por_nome` | Search by trade name (nome comercial) |
| `buscar_por_principio_ativo` | Search by INN/DCB active ingredient (princípio ativo) |
| `buscar_por_classe_terapeutica` | Search by therapeutic class |
| `filtrar_por_tarja` | Filter by controlled-substance tier (LIVRE/OTC, VERMELHA/Rx, PRETA/special-control) |
| `consultar_bula` | Retrieve full drug data + leaflet PDF links (bula) |
| `listar_apresentacoes` | List commercial presentations/packaging of a medication |

---

## Available Prompts

| Prompt | Description |
|---|---|
| `verificar_medicamento_completo` | Consolidates trade name, active ingredient, class, controlled-substance tier, presentations, and (optionally) leaflet for a search term |
| `comparar_tarjas_por_classe` | Groups medications of a therapeutic class by controlled-substance tier |
| `analisar_apresentacoes` | Groups a medication's presentations by dosage strength, pharmaceutical form, or manufacturer |

---

## Available Resources

| URI | Type | Description |
|---|---|---|
| `bulario://tarjas` | `application/json` | Regulatory taxonomy of controlled-substance tiers (RDC 357/2020, Ordinance 344/98) |
| `bulario://classes_terapeuticas` | `application/json` | List of main indexed therapeutic classes |
| `bulario://scope` | `text/markdown` | MCP scope (PT/EN): what it does/doesn't do, regulatory disclaimer |

---

## Demo

![Demo](./.github/assets/demo.gif)

To run locally:

```bash
npm run demo
```

---

## Understanding Brazilian drug tiers (Tarja)

Brazil uses a **tarja** (literally "stripe/band") system to classify medication control requirements — there is no direct English equivalent:

| Tarja | English equivalent | Control level |
|---|---|---|
| **Sem Tarja** | OTC / Over-the-counter | No prescription required |
| **Tarja Amarela** (Yellow-banded) | Prescription-only (mild control) | Antibiotics and similar — prescription required, receipt not retained |
| **Tarja Vermelha** (Red-banded) | Prescription-only (standard) | Receipt retained by pharmacy |
| **Tarja Preta** (Black-banded) | **Controlled substance** — Brazilian Ordinance SVS/MS 344/1998 | Special-control prescription; covers psychotropics, narcotics, precursors |

> ⚠️ **Tarja Preta** is the strictest tier. Medications in this category include benzodiazepines, opioids, barbiturates, and other substances under Brazil's controlled substance ordinance (Portaria 344/98). Misuse is a criminal offense under Brazilian law.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `MCPASSURE_CACHE_PATH` | `~/.cache/mcpassure-anvisa/cache.db` | SQLite cache file path |
| `MCPASSURE_MAX_RETRIES` | `3` | Retry attempts on API failure |
| `MCPASSURE_BASE_DELAY_MS` | `1000` | Base delay for exponential backoff (ms) |
| `MCPASSURE_REQUEST_TIMEOUT_MS` | `10000` | HTTP request timeout (ms) |
| `MCPASSURE_ANVISA_BASE_URL` | `https://consultas.anvisa.gov.br` | ANVISA API base URL |
| `MCPASSURE_DEGRADED_THRESHOLD_DAYS` | `30` | Days after which cached data is flagged as degraded |
| `MCPASSURE_STATUS_HEARTBEAT` | `false` | Enable heartbeat for status page |
| `MCPASSURE_STATUS_PAGE_URL` | `https://status.mcpassure.com.br/api/v1/heartbeat/anvisa-bulario` | Heartbeat endpoint URL |

---

## Requirements

- **Node.js >= 22.0.0**
- **Playwright Chromium** (~150MB) — installed automatically by `postinstall`. Required because the ANVISA API is behind Cloudflare since 2026, blocking Node's native fetch.
- **+150-250MB RAM** at runtime (Chromium in background). First call has ~2-3s overhead (Chromium boot + warm-up). Subsequent calls: ~100-300ms.

If the Chromium postinstall fails (firewall, corporate policy, etc.), install manually:

```bash
npx playwright install chromium
```

---

## Development

```bash
nvm use            # uses Node 22 as per .nvmrc
npm install        # installs deps and downloads Playwright Chromium

# Run in dev mode (stdio)
npm run dev

# Validate
npm run typecheck
npm run lint
npm run test
npm run test:integration:offline
npm run canary
```

## Architecture

- **Local SQLite** (`better-sqlite3`) as primary cache with 24h TTL
- **Source pattern** with cascading sources: `anvisa-api` → `anvisa-dados-abertos` (v1.1+) → `anvisa-portal` (v1.2+)
- **Repository pattern** decoupling domain from sources
- **HTTP transport via Playwright** — real headless Chromium with clean UA and webdriver masking. Lazy-initialized browser singleton, page reused between requests. Required to bypass ANVISA's Cloudflare barrier.
- **Optional status page hook** via `MCPASSURE_STATUS_HEARTBEAT`
- **Daily canary** validates source accessibility and data patterns

---

## ⚠️ Medical disclaimer

This MCP server is a **pharmaceutical reference tool** based on public ANVISA data. **It does not replace evaluation, diagnosis, or prescription by a licensed healthcare professional.** Drug information should always be used under professional supervision.

Data comes from the ANVISA Electronic Drug Information Database (`consultas.anvisa.gov.br`), an official public source. This server does not store personal data and never processes PHI/PII.

---

## Dependencies

This release uses current versions (audited 2026-05-13). For history or exceptions, see `DEPS.md`.

Automated audit runs every Monday at 09:00 UTC (`deps-audit` workflow).

## License

MIT — see [LICENSE](LICENSE)

Maintained by [MCPAssure Brasil](https://github.com/mcpassure). See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

Part of the [MCPAssure](https://github.com/mcpassure) catalog — curated MCP examples for Brazilian healthcare.
