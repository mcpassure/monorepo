**[🇧🇷 Português (BR)](./README.md) · 🇺🇸 English**

---

# @mcpassure/mcp-cnes

**MCP server for querying CNES — Brazilian National Registry of Healthcare Establishments (Cadastro Nacional de Estabelecimentos de Saúde)**

[![CI](https://github.com/mcpassure/mcp-cnes/actions/workflows/ci.yml/badge.svg)](https://github.com/mcpassure/mcp-cnes/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@mcpassure/mcp-cnes)](https://www.npmjs.com/package/@mcpassure/mcp-cnes)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Enables AI agents (Claude, GPT, Copilot, etc.) to query official CNES/DATASUS (Brazilian Public Health Data Department) data: healthcare establishments, hospital beds, equipment, professionals, and specialized services across all ~5,570 Brazilian municipalities.

> **Notice:** Data reflects the CNES registry from the last synchronization reference month and may not correspond to the current operational status of the establishment. Run `mcp-cnes sync` to update.

---

## Installation in 1 command

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cnes": {
      "command": "npx",
      "args": ["-y", "@mcpassure/mcp-cnes"]
    }
  }
}
```

### Claude Code / Cursor / VS Code

```bash
npx -y @mcpassure/mcp-cnes
```

---

## Available Tools

| Tool | Description | Main Input |
|------|-------------|------------|
| `buscar_por_codigo_cnes` | Find establishment by CNES code (7 digits) | `codigoCnes` |
| `buscar_por_nome` | Search by trade name or legal name | `nome`, `uf?` |
| `buscar_por_municipio` | List establishments in a municipality by IBGE code | `codigoIbge`, `tipo?` |
| `buscar_por_tipo` | Filter by type (hospital, UBS/Basic Health Unit, UPA/Emergency Care Unit, etc.) | `tipo`, `uf?` |
| `listar_profissionais` | Professionals linked to an establishment | `codigoCnes` |
| `listar_leitos` | Beds by type (adult/pediatric/neonatal ICU, clinical, etc.) | `codigoCnes` |
| `listar_equipamentos` | Registered equipment at the establishment | `codigoCnes` |
| `listar_servicos` | Specialized services offered | `codigoCnes` |

All tools return `structuredContent` with a validatable schema.

---

## Prompts

Structured MCP prompts for CNES data analysis:

| Prompt | Description | Main Parameters |
|--------|-------------|-----------------|
| `perfil_estabelecimento` | Consolidates complete profile of an establishment | `codigo_cnes`, section flags |
| `mapear_rede_municipio` | Maps healthcare network of a municipality | `municipio` (IBGE code), `uf?`, `tipo?` |
| `analisar_cobertura_uf` | Analyzes establishment coverage by state (UF) | `uf`, `agrupar_por` |

---

## Resources

MCP resources with CNES domain reference data:

| URI | MIME | Content |
|-----|------|---------|
| `cnes://tipos_estabelecimento` | `application/json` | Official establishment type taxonomy with code and description |
| `cnes://categorias_servicos` | `application/json` | Specialized service categories |
| `cnes://scope` | `text/markdown` | MCP scope, limitations, and disclaimer (PT/EN) |

---

## Demo

![Demo](./.github/assets/demo.gif)

---

## Dataset Synchronization

Data comes from DATASUS FTP (official source). To synchronize:

```bash
# Requires: blast (DATASUS proprietary DBC converter)
# macOS: brew install blast-datasus
# Ubuntu: apt install blast
# Windows: see documentation

# Sync São Paulo (ST, LT, EQ, PF, SR)
npx @mcpassure/mcp-cnes sync --uf SP --grupos ST,LT,EQ,PF,SR

# Sync all states (long operation, ~30min per state)
npx @mcpassure/mcp-cnes sync

# Force re-download even if already synced
npx @mcpassure/mcp-cnes sync --uf SP --force
```

Without synchronization, the beds/equipment/professionals/services tools return a "dataset not synchronized" warning.

---

## Real-world Use Cases

**Healthcare network mapping:**
> "Which hospitals with adult ICU exist in Campinas/SP?"
→ `buscar_por_municipio("350950", "hospital")` + `listar_leitos` per establishment

**ICU bed capacity by region:**
> "What is the neonatal ICU capacity in hospitals in Recife/PE?"
→ `buscar_por_municipio("261160", "hospital")` + `listar_leitos` filtering neonatal ICU

**Equipment identification:**
> "Which establishments have MRI in Fortaleza/CE?"
→ `buscar_por_municipio("230440")` + `listar_equipamentos` per establishment

**Establishment verification:**
> "Is CNES 2077485 active? What services does it offer?"
→ `buscar_por_codigo_cnes("2077485")` + `listar_servicos("2077485")`

---

## Professional Data

Professional data registered in CNES is **public** and includes name, CBO (Brazilian Occupational Classification) and employment type. Tax IDs (CPFs) are always masked in the response.

> **Responsible use:** This data must not be used to identify patients or for purposes that violate professionals' privacy beyond the care context for which it was published.

---

## LGPD (Data Privacy) Compliance

- No identifiable personal patient data is processed at any layer
- Professional data is public in CNES/DATASUS by legal obligation
- Open repository with no usage data collection
- See [SECURITY.md](SECURITY.md) for vulnerability reporting

---

## MCPAssure Brasil Catalog

This is part of the **MCPAssure Brasil catalog**, providing quality MCPs for the Brazilian health ecosystem:

1. [@mcpassure/mcp-anvisa-bulario](https://github.com/mcpassure/mcp-anvisa-bulario) — ANVISA Electronic Drug Database
2. **@mcpassure/mcp-cnes** — Brazilian National Registry of Healthcare Establishments ← you are here
3. @mcpassure/mcp-tuss — TUSS / CBHPM / ANS Table *(in development)*

---

## Development

```bash
git clone https://github.com/mcpassure/mcp-cnes
cd mcp-cnes
npm install
npm run dev       # MCP server in development mode
npm run test      # unit and integration tests
npm run lint      # lint + format check
npm run typecheck # type checking
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution guide.
