**🇧🇷 Português (BR) · [🇺🇸 English](./README.en.md)**

---

# @mcpassure/mcp-anvisa-bulario

**Catálogo MCPAssure — Onda 1** — MCP server para consulta ao Bulário Eletrônico da ANVISA.

Permite que agentes de IA (Claude, GPT, Copilot) consultem bulas, princípios ativos, classes terapêuticas e demais metadados de medicamentos registrados no Brasil com resposta estruturada e cache eficiente.

[![CI](https://github.com/mcpassure/mcp-anvisa-bulario/actions/workflows/ci.yml/badge.svg)](https://github.com/mcpassure/mcp-anvisa-bulario/actions)
[![npm](https://img.shields.io/npm/v/@mcpassure/mcp-anvisa-bulario)](https://www.npmjs.com/package/@mcpassure/mcp-anvisa-bulario)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Instalação rápida

```bash
npx -y @mcpassure/mcp-anvisa-bulario
```

Na primeira instalação, o `postinstall` baixa o Chromium do Playwright
(~150MB). Isso é requerido pelo transport HTTP (ver [Requisitos](#requisitos)).

### Claude Desktop

Adicione ao `claude_desktop_config.json`:

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

## Tools disponíveis

| Tool | Descrição |
|---|---|
| `buscar_por_nome` | Busca por nome comercial do medicamento |
| `buscar_por_principio_ativo` | Busca por DCB/DCI (princípio ativo) |
| `buscar_por_classe_terapeutica` | Busca por classe terapêutica |
| `filtrar_por_tarja` | Lista medicamentos por tipo de tarja (LIVRE, VERMELHA, PRETA) |
| `consultar_bula` | Retorna dados completos + links da bula (PDF) |
| `listar_apresentacoes` | Lista apresentações/embalagens de um medicamento |

---

## Prompts disponíveis

| Prompt | Descrição |
|---|---|
| `verificar_medicamento_completo` | Consolida nome, princípio ativo, classe, tarja, apresentações e (opcional) bula para um termo de busca |
| `comparar_tarjas_por_classe` | Agrupa medicamentos de uma classe terapêutica por tarja regulatória |
| `analisar_apresentacoes` | Agrupa apresentações de um medicamento por concentração, forma farmacêutica ou fabricante |

---

## Resources disponíveis

| URI | Tipo | Descrição |
|---|---|---|
| `bulario://tarjas` | `application/json` | Taxonomia regulatória de tarjas (RDC 357/2020, Portaria 344/98) |
| `bulario://classes_terapeuticas` | `application/json` | Lista das principais classes terapêuticas indexadas |
| `bulario://scope` | `text/markdown` | Escopo do MCP (PT/EN), o que faz/não faz, disclaimer regulatório |

---

## Demo

![Demo](./.github/assets/demo.gif)

Para rodar localmente:

```bash
npm run demo
```

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `MCPASSURE_CACHE_PATH` | `~/.cache/mcpassure-anvisa/cache.db` | Caminho do banco SQLite de cache |
| `MCPASSURE_MAX_RETRIES` | `3` | Tentativas em caso de falha da API |
| `MCPASSURE_BASE_DELAY_MS` | `1000` | Delay base para backoff exponencial (ms) |
| `MCPASSURE_REQUEST_TIMEOUT_MS` | `10000` | Timeout de requisição HTTP (ms) |
| `MCPASSURE_ANVISA_BASE_URL` | `https://consultas.anvisa.gov.br` | Base URL da API ANVISA |
| `MCPASSURE_DEGRADED_THRESHOLD_DAYS` | `30` | Dias após os quais dados são considerados degradados |
| `MCPASSURE_STATUS_HEARTBEAT` | `false` | Habilita heartbeat para status page |
| `MCPASSURE_STATUS_PAGE_URL` | `https://status.mcpassure.com.br/api/v1/heartbeat/anvisa-bulario` | URL do heartbeat |

---

## Requisitos

- **Node.js >= 22.0.0**
- **Chromium do Playwright** (~150MB) — instalado automaticamente pelo
  `postinstall`. Requerido porque a API ANVISA está atrás de Cloudflare desde
  2026, bloqueando fetch nativo do Node. Ver
  [`DIAGNOSTICO_ANVISA_CLOUDFLARE_2026-05-13.md`](DIAGNOSTICO_ANVISA_CLOUDFLARE_2026-05-13.md)
  para detalhes técnicos.
- **+150-250MB de RAM** em runtime (Chromium em background quando o MCP
  estiver ativo). Primeira chamada tem ~2-3s de overhead (boot do Chromium
  + warm-up). Chamadas subsequentes: ~100-300ms.

Se o postinstall do Chromium falhar (firewall, política corporativa, etc.),
rode manualmente:

```bash
npx playwright install chromium
```

---

## Desenvolvimento

```bash
nvm use            # usa Node 22 conforme .nvmrc
npm install        # instala deps e baixa Chromium do Playwright

# Rodar em modo dev (stdio)
npm run dev

# Validar
npm run typecheck
npm run lint
npm run test
npm run test:integration:offline
npm run canary
```

## Arquitetura

- **SQLite local** (`better-sqlite3`) como cache primário com TTL 24h
- **Source pattern** com cascata de fontes: `anvisa-api` → `anvisa-dados-abertos` (v1.1+) → `anvisa-portal` (v1.2+)
- **Repository pattern** desacoplando domínio das fontes
- **HTTP transport via Playwright** — Chromium real (headless) com UA limpo
  e mascaramento de webdriver. Browser singleton lazy-initialized, page
  reutilizada entre requests. Necessário para contornar a barreira Cloudflare
  da ANVISA (ver diagnóstico).
- **Status page hook** opcional via `MCPASSURE_STATUS_HEARTBEAT`
- **Canário diário** valida acessibilidade e padrões da fonte oficial

---

## ⚠️ Disclaimer médico

Este servidor MCP é uma **fonte de consulta farmacêutica** baseada em dados públicos da ANVISA. **Não substitui avaliação, diagnóstico ou prescrição por profissional de saúde habilitado.** Informações sobre medicamentos devem ser utilizadas com acompanhamento profissional.

Os dados são provenientes do Bulário Eletrônico da ANVISA (`consultas.anvisa.gov.br`), que é fonte pública oficial. Este servidor não armazena dados pessoais e não processa PHI/PII em nenhum momento.

---

## Dependências

Esta versão usa versões correntes (auditadas em 2026-05-13). Para histórico ou exceções, ver `DEPS.md`.

Auditoria automática roda toda segunda às 09:00 UTC (`deps-audit` workflow).

## Licença

MIT — veja [LICENSE](LICENSE)

Mantido pela [MCPAssure Brasil](https://github.com/mcpassure). Consulte [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) e [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

Parte do catálogo [MCPAssure](https://github.com/mcpassure) — exemplos de curadoria de MCPs para saúde brasileira.
