# Política de Segurança

**🇧🇷 Português (BR) · [🇺🇸 English](./SECURITY.en.md)**

---

## Versões suportadas

| Versão | Suportada |
|--------|-----------|
| 2.x.x latest | ✓ |
| < latest     | ✗ |

## Reportar vulnerabilidade

**Não abra issues públicas para vulnerabilidades de segurança.**

Envie um e-mail para: `security@mcpassure.com.br`

Inclua:
- Descrição da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Versão afetada

## Tempo de resposta esperado

- HIGH/CRITICAL: 7 dias
- MEDIUM: 30 dias
- LOW: best-effort

## Escopo

- Este servidor MCP não processa, armazena ou loga dados pessoais (PHI/PII)
- Consulta apenas dados públicos do Bulário Eletrônico da ANVISA
- O cache SQLite armazena apenas respostas da API pública, sem dados de usuários

Vulnerabilidades em escopo:
- Injeção SQL via inputs das tools
- Dependências com CVEs conhecidos
- Comportamento inesperado do Playwright/Chromium em runtime

## Disclosure responsável

Após mitigação, divulgamos publicamente via CVE quando aplicável.
