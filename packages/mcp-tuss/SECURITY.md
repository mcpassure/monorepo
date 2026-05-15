# Política de Segurança

**🇧🇷 Português (BR) · [🇺🇸 English](./SECURITY.en.md)**

---

## Versões suportadas

Apenas a última minor de cada major recebe correções de segurança.

| Versão | Suportada |
|--------|-----------|
| 0.x.x latest | ✓ |
| < latest    | ✗ |

## Reportar vulnerabilidade

**Não abra Issue pública para problemas de segurança.**

Envie um e-mail para: `security@mcpassure.com.br`

Inclua:
- Descrição da vulnerabilidade
- Passos para reprodução
- Impacto potencial
- Versão afetada

## Tempo de resposta esperado

- HIGH/CRITICAL: 7 dias
- MEDIUM: 30 dias
- LOW: best-effort

## Escopo

Este MCP não processa dados de pacientes (PHI/PII). Os dados expostos são tabelas públicas da ANS (TUSS).

Vulnerabilidades em escopo:
- Injeção SQL via inputs das tools
- Path traversal no script de sync
- Dependências com CVEs conhecidos

## Disclosure responsável

Após mitigação, divulgamos publicamente via CVE quando aplicável.
