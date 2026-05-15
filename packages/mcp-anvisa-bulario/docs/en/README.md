# ANVISA Bulário Eletrônico MCP — Documentation

## What is it

`@vetrum/mcp-anvisa-bulario` is an MCP server that allows AI agents to query the ANVISA Electronic Drug Bulletin — Brazil's official database of registered medication package inserts.

**Data source:** ANVISA (`consultas.anvisa.gov.br`) — public data, no PHI/PII.

## Installation

```bash
npx -y @vetrum/mcp-anvisa-bulario
```

Compatible with Claude Desktop, Claude Code, VS Code Copilot, Cursor, and any MCP-compliant client.

## Available Tools

| Tool | Description |
|---|---|
| `buscar_por_nome` | Search by brand name |
| `buscar_por_principio_ativo` | Search by active ingredient (DCB/DCI) |
| `buscar_por_classe_terapeutica` | Search by therapeutic class |
| `filtrar_por_tarja` | Filter by prescription type (LIVRE/VERMELHA/PRETA) |
| `consultar_bula` | Get full medication details + PDF links |
| `listar_apresentacoes` | List available presentations/forms |

## Quick Example

```json
// buscar_por_nome
{ "nome": "novalgina" }

// consultar_bula (using numProcesso from search result)
{ "numProcesso": "25351.929286/2003-37" }
```

## ⚠️ Medical Disclaimer

This MCP server is a **pharmaceutical information reference** based on public ANVISA data. **It does not replace assessment, diagnosis, or prescription by a licensed healthcare professional.** Always use medication information under professional supervision.
