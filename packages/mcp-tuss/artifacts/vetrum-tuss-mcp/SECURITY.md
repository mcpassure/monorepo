# Política de Segurança

## Escopo

O vetrum-tuss-mcp processa **exclusivamente** terminologias públicas da saúde suplementar brasileira (TUSS, CBHPM, Rol ANS). Estas são listas de códigos públicos — **nenhum dado pessoal identificável (PHI/PII) é tratado** por este servidor.

## Versões suportadas

| Versão | Suporte de segurança |
|--------|---------------------|
| 1.x    | ✅ Ativo             |

## Reportar uma vulnerabilidade

Se você identificar uma vulnerabilidade de segurança:

1. **Não abra um GitHub Issue público** para vulnerabilidades de segurança.
2. Envie um relatório privado via **GitHub Security Advisories** (aba "Security" → "Report a vulnerability").
3. Inclua: descrição do problema, passos para reproduzir, impacto potencial.

Você receberá uma resposta em até 72 horas. Se confirmada, a correção será publicada em até 14 dias.

## Considerações de segurança ao usar este MCP

- O servidor tem acesso **apenas de leitura** às tabelas TUSS/ANS.
- O banco SQLite local (`~/.vetrum/tuss.db`) contém apenas dados públicos — sem dados clínicos.
- As sincronizações fazem requisições HTTP para o portal gov.br (ANS). Verifique sua política de firewall se necessário.
- Nenhuma credencial, token ou dado de paciente é transmitido.
