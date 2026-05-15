**🇧🇷 Português (BR) · [🇺🇸 English](./README.en.md)**

---

# @mcpassure/mcp-cnes

**MCP server para consulta ao CNES — Cadastro Nacional de Estabelecimentos de Saúde**

[![npm](https://img.shields.io/npm/v/@mcpassure/mcp-cnes)](https://www.npmjs.com/package/@mcpassure/mcp-cnes)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![OSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/mcpassure/monorepo/badge)](https://securityscorecards.dev/viewer/?uri=github.com/mcpassure/monorepo)
[![SAFE-MCP](https://img.shields.io/badge/SAFE--MCP-mapped-green)](#safe-mcp-mapping)

Permite que agentes de IA (Claude, GPT, Copilot, etc.) consultem dados oficiais do CNES/DATASUS: estabelecimentos de saúde, leitos, equipamentos, profissionais e serviços especializados em todos os ~5.570 municípios brasileiros.

> **Aviso:** Os dados refletem o cadastro CNES do mês de referência da última sincronização e podem não corresponder à realidade operacional atual do estabelecimento. Execute `mcp-cnes sync` para atualizar.

---

## Instalação em 1 comando

### Claude Desktop

Adicione ao seu `claude_desktop_config.json`:

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

## Tools disponíveis

| Tool | Descrição | Input principal |
|------|-----------|-----------------|
| `buscar_por_codigo_cnes` | Estabelecimento pelo código CNES (7 dígitos) | `codigoCnes` |
| `buscar_por_nome` | Busca por nome fantasia ou razão social | `nome`, `uf?` |
| `buscar_por_municipio` | Lista estabelecimentos de um município IBGE | `codigoIbge`, `tipo?` |
| `buscar_por_tipo` | Filtra por tipo (hospital, UBS, UPA, etc.) | `tipo`, `uf?` |
| `listar_profissionais` | Profissionais vinculados a um estabelecimento | `codigoCnes` |
| `listar_leitos` | Leitos por tipo (UTI adulto/pediátrico/neonatal, clínico, etc.) | `codigoCnes` |
| `listar_equipamentos` | Equipamentos cadastrados no estabelecimento | `codigoCnes` |
| `listar_servicos` | Serviços especializados oferecidos | `codigoCnes` |

Todas as tools retornam `structuredContent` com schema validável.

---

## Prompts

Prompts MCP estruturados para análise de dados CNES:

| Prompt | Descrição | Parâmetros principais |
|--------|-----------|----------------------|
| `perfil_estabelecimento` | Consolida perfil completo de um estabelecimento | `codigo_cnes`, flags de seções |
| `mapear_rede_municipio` | Mapeia rede de saúde de um município | `municipio` (código IBGE), `uf?`, `tipo?` |
| `analisar_cobertura_uf` | Analisa cobertura de estabelecimentos por UF | `uf`, `agrupar_por` |

---

## Resources

Resources MCP com dados de referência do domínio CNES:

| URI | MIME | Conteúdo |
|-----|------|---------|
| `cnes://tipos_estabelecimento` | `application/json` | Taxonomia oficial de tipos com código e descrição |
| `cnes://categorias_servicos` | `application/json` | Categorias de serviços especializados |
| `cnes://scope` | `text/markdown` | Escopo do MCP, limitações e disclaimer (PT/EN) |

---

## Demo

🚧 Demo GIF em breve.

---

## Sincronização do dataset

Os dados vêm do FTP DATASUS (fonte oficial). Para sincronizar:

```bash
# Requer: blast (conversor DBC proprietário DATASUS)
# macOS: brew install blast-datasus
# Ubuntu: apt install blast
# Windows: ver documentação

# Sincronizar São Paulo (ST, LT, EQ, PF, SR)
npx @mcpassure/mcp-cnes sync --uf SP --grupos ST,LT,EQ,PF,SR

# Sincronizar todos os estados (operação longa, ~30min por estado)
npx @mcpassure/mcp-cnes sync

# Forçar re-download mesmo se já sincronizado
npx @mcpassure/mcp-cnes sync --uf SP --force
```

Sem sincronização, as tools de leitos/equipamentos/profissionais/serviços retornam aviso de "dataset não sincronizado". A tool `buscar_por_codigo_cnes` usa fallback online (REST API Mapa da Saúde/TCU).

---

## Casos de uso reais

**Mapeamento de rede assistencial:**
> "Quais hospitais com UTI adulto existem em Campinas/SP?"
→ `buscar_por_municipio("350950", "hospital")` + `listar_leitos` por estabelecimento

**Capacidade de leitos UTI por região:**
> "Qual a capacidade de UTI neonatal nos hospitais de Recife/PE?"
→ `buscar_por_municipio("261160", "hospital")` + `listar_leitos` filtrando UTI neonatal

**Identificação de equipamentos:**
> "Quais estabelecimentos têm ressonância magnética em Fortaleza/CE?"
→ `buscar_por_municipio("230440")` + `listar_equipamentos` por estabelecimento

**Verificação de estabelecimento:**
> "O CNES 2077485 é ativo? Que serviços oferece?"
→ `buscar_por_codigo_cnes("2077485")` + `listar_servicos("2077485")`

---

## Dados de profissionais

Os dados de profissionais cadastrados no CNES são **públicos** e incluem nome, CBO (Classificação Brasileira de Ocupações) e tipo de vínculo. CPFs são sempre mascarados na resposta.

> **Uso responsável:** Estes dados não devem ser usados para identificar pacientes ou para fins que violem a privacidade dos profissionais além do contexto assistencial para o qual foram publicados.

---

## Compliance LGPD

- Nenhum dado pessoal identificável de pacientes é tratado em nenhuma camada
- Dados de profissionais são públicos no CNES/DATASUS por obrigação legal
- Repositório aberto, sem coleta de dados de uso
- Consulte [SECURITY.md](SECURITY.md) para reporte de vulnerabilidades

### Masking de CPF (opt-in PII)

Por padrão, CPFs de profissionais são mascarados no formato `***.***.XXX-**`, preservando apenas os dígitos 7–9. Este é o comportamento padrão (privacy-first).

Para ambientes internos que necessitem do CPF completo (ex: auditoria, reconciliação de cadastro):

```bash
MCPASSURE_LGPD_ALLOW_PII=cnes npx @mcpassure/mcp-cnes
```

Ou no `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cnes": {
      "command": "npx",
      "args": ["-y", "@mcpassure/mcp-cnes"],
      "env": {
        "MCPASSURE_LGPD_ALLOW_PII": "cnes"
      }
    }
  }
}
```

**Atenção:** Ao habilitar `MCPASSURE_LGPD_ALLOW_PII=cnes`, certifique-se de que o ambiente de execução tem controles de acesso adequados e que o uso está em conformidade com a LGPD (Lei 13.709/2018).

---

## Catálogo MCPAssure Brasil

Este é parte do **catálogo MCPAssure Brasil**, que disponibiliza MCPs de qualidade para o ecossistema de saúde brasileiro:

1. [@mcpassure/mcp-anvisa-bulario](https://www.npmjs.com/package/@mcpassure/mcp-anvisa-bulario) — Bulário Eletrônico ANVISA
2. **@mcpassure/mcp-cnes** — Cadastro Nacional de Estabelecimentos de Saúde ← você está aqui
3. [@mcpassure/mcp-tuss](https://www.npmjs.com/package/@mcpassure/mcp-tuss) — Tabela TUSS / Rol ANS

---

## Desenvolvimento

```bash
git clone https://github.com/mcpassure/monorepo
cd monorepo
pnpm install
pnpm --filter @mcpassure/mcp-cnes dev       # servidor MCP em modo desenvolvimento
pnpm --filter @mcpassure/mcp-cnes test      # testes unitários e de integração
pnpm --filter @mcpassure/mcp-cnes lint      # lint + format check
pnpm --filter @mcpassure/mcp-cnes typecheck # verificação de tipos
```

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para guia de contribuição.

---

## SAFE-MCP Mapping

Avaliação contra o framework SAFE-MCP (OpenSSF + LF + OpenID Foundation).

### Ataques mitigados

| ID | Ataque | Status | Como mitigamos |
|----|--------|--------|----------------|
| SAFE-T001 | Tool Poisoning | ✓ Mitigado | Schema Zod estrito em todos os inputs; parâmetros tipados |
| SAFE-T002 | Indirect Prompt Injection | ✓ Mitigado | `structuredContent` separado do texto livre; dados do DATASUS não contêm markup |
| SAFE-T003 | Credential exposure | ✓ Mitigado | Credenciais R2 apenas em Worker server-side; client não armazena secrets |
| SAFE-T004 | PII leakage | ✓ Mitigado | CPF mascarado por padrão (`privacy-first`); opt-in explícito para PII |
| SAFE-T005 | Resource exhaustion | ✓ Mitigado | Cache SQLite local, sem requests em runtime ao FTP DATASUS |

### Ataques NÃO mitigados (declaração honesta)

| ID | Ataque | Por que não mitigado |
|----|--------|---------------------|
| SAFE-T010 | Supply-chain attack | `pnpm audit` + Renovate; sem SBOM gerado ainda |
| SAFE-T011 | LGPD violation por misconfiguration | `MCPASSURE_LGPD_ALLOW_PII=cnes` requer configuração consciente do usuário |

### Lethal Trifecta Declaration (Willison, 2025)

1. **Acesso a dados privados** — ⚠ **Parcial.** Dados de profissionais CNES são públicos por lei, mas CPFs são dados pessoais. Mitigados com masking por default + opt-in explícito.
2. **Exposição a conteúdo não-confiável** — ⚠ **Parcial.** Inputs validados por Zod; dados DATASUS são governamentais e considerados confiáveis.
3. **Capacidade de comunicação externa** — ✗ **Ausente.** MCP opera apenas sobre DB local; sem chamadas externas em runtime.

**Conclusão:** Fator #1 é parcial e gerenciado — não completa o trifecta. CNES é o MCP com maior atenção à privacidade da suíte MCPAssure.
