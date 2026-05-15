---
description: Plano e execução de testes integrados pós-entrega — simulação de uso real, bases baixadas localmente, resultados versionados
baseado_em: research_codebase + dados oficiais brasileiros
saida_obrigatoria: 08_testes_integrados/plano.md + resultados em 08_testes_integrados/resultados/run_YYYY-MM-DD_HHMMSS/
---

# Prompt de Testes Integrados (Etapa 8)

Você foi encarregado de validar o MCP implementado contra cenários reais de uso, garantindo cobertura funcional, conformidade com a spec MCP, e robustez sob condições adversas.

## PRINCÍPIO CRÍTICO

Esta etapa NÃO é unit test (já feito na Etapa 5). É TESTE INTEGRADO de ponta-a-ponta:
- Cada tool exposta pelo MCP é exercitada contra dados reais baixados localmente
- Cenários replicam consultas que usuários reais (médico, farmacêutico, faturista, dev healthtech) fariam em linguagem natural
- Bordas, falhas e degradações são exercitadas explicitamente
- Resultados são versionados, datados e auditáveis

NÃO faça unit test redundante. NÃO mock APIs externas exceto pra simular falhas. NÃO pule cenários de borda. NÃO use dados sintéticos quando há dados oficiais públicos disponíveis.

## Entradas obrigatórias

- `01_regras_permanentes/1_regras_gerais.md`
- este arquivo `9_prompt_testes_integrados.md`
- `02_modelos_variaveis_do_projeto/4-spec.md`
- `02_modelos_variaveis_do_projeto/5-plano_execucao.md`
- `02_modelos_variaveis_do_projeto/7-entrega.md`
- Código-fonte implementado nos `artifacts/`

## Saída obrigatória

- `08_testes_integrados/plano.md` — documento do plano de testes (gerado primeiro, atualizado ao final com resultados)
- `08_testes_integrados/binarios/dados_locais/` — bases brutas oficiais baixadas para uso offline
- `08_testes_integrados/binarios/dados_locais/README.md` — origem, versão, data e checksum de cada base
- `08_testes_integrados/binarios/fixtures/<cenario>.json` — payloads de teste pré-definidos
- `08_testes_integrados/binarios/scripts/` — scripts executáveis dos testes
- `08_testes_integrados/resultados/run_YYYY-MM-DD_HHMMSS/relatorio.md` — relatório consolidado
- `08_testes_integrados/resultados/run_YYYY-MM-DD_HHMMSS/logs/` — logs detalhados por cenário

## Etapas obrigatórias (executar nesta ordem)

### Etapa 8.1 — Gerar plano de testes
Criar `08_testes_integrados/plano.md` com:
- Lista de tools do MCP cobertas
- Para cada tool: casos felizes, bordas, falhas (mínimo 5 casos por tool)
- Mínimo 10 cenários de simulação de uso real (consultas em linguagem natural traduzidas pra chamadas da(s) tool(s))
- Critérios de aprovação por cenário
- Estratégia: offline-first usando bases locais; rede só pra validar conectividade

### Etapa 8.2 — Baixar bases localmente
- Identificar fontes oficiais usadas pelo MCP (definidas no spec)
- Baixar dataset bruto para `08_testes_integrados/binarios/dados_locais/`
- Documentar em `dados_locais/README.md`: origem (URL), versão/data do dataset, data do download, hash SHA-256
- Implementar shim de leitura local que substitui chamadas HTTP nos testes

### Etapa 8.3 — Gerar fixtures
- Para cada cenário do plano, criar fixture com input + output esperado
- Salvar em `08_testes_integrados/binarios/fixtures/<cenario>.json`
- Formato padronizado: `{ "scenario": "...", "tool": "...", "input": {...}, "expected_output": {...}, "assertions": [...] }`

### Etapa 8.4 — Implementar scripts de execução
- Scripts em `08_testes_integrados/binarios/scripts/`
- TypeScript com vitest, OU node puro, alinhado à stack do projeto
- Cada script tem nome falando o que testa (ex: `test_busca_por_nome.ts`, `test_borda_input_vazio.ts`)
- Saída padronizada: PASS/FAIL + duração + diff esperado vs obtido + stacktrace em falhas
- Script `run_all.ts` (ou `.sh`) executa toda a suíte em sequência

### Etapa 8.5 — Executar a suíte
- Pasta do run: `08_testes_integrados/resultados/run_YYYY-MM-DD_HHMMSS/`
- Cada cenário gera log em `logs/<cenario>.log`
- Relatório consolidado em `relatorio.md` com:
  - Métricas: cobertura, latência (p50/p95/p99), taxa de falha, tempo total
  - Tabela por cenário: PASS/FAIL/SKIP
  - Bugs/inconsistências encontradas (com sugestão de correção)

### Etapa 8.6 — Atualizar `plano.md` com resultados
- Seção "Resultados consolidados" preenchida
- Status final por cenário
- Issues encontradas
- Próximos passos sugeridos

## Categorias mínimas de cobertura (por tool)

| Categoria | Descrição |
|---|---|
| Happy path | Input válido → output esperado |
| Input inválido | Códigos/formatos errados → erro útil e estruturado (mensagem clara, sem stack trace cru) |
| Borda | Strings vazias, valores extremos, charset não-ASCII, acentos brasileiros |
| Cache | Hit/miss correto, TTL respeitado, invalidação funciona |
| Fonte offline | Sistema responde com graceful degradation, não trava |
| Rate limit | Backoff exponencial respeitado, não derruba a fonte oficial |
| Output schema | `structuredContent` válido vs spec MCP |
| Annotations | `readOnlyHint`, `idempotentHint`, `openWorldHint` corretas |
| Performance | Latência dentro do SLA da spec |
| Compliance | Disclaimer médico presente em response; nenhum PII em logs |
| Segurança | Input sanitization (DNS rebinding, command injection); origin header validation se HTTP |

## Simulação de uso de usuário (mínimo 10 cenários)

Cada cenário é uma consulta em linguagem natural que um usuário real faria, traduzida pra uma ou mais chamadas de tool. Validar o fluxo completo, não apenas tool isolada.

Exemplo de formato:
```
Cenário 7: Faturista buscando código de procedimento
Usuário diz: "Qual o código TUSS de hemograma completo?"
Tool(s) chamada(s): tuss_buscar(termo="hemograma completo")
Output esperado: lista contendo código 4.03.01.13-8 (ou equivalente)
Critério de aprovação: código retornado bate com a base oficial
```

Os cenários devem cobrir os perfis de usuário identificados no PRD.

## Critérios de qualidade

- **Reprodutível:** qualquer pessoa rodando os scripts ré-executa os mesmos testes com os mesmos resultados
- **Offline-first:** testes não dependem de rede após o setup inicial (bases já baixadas)
- **Documentado:** cada falha tem stacktrace + cenário associado + fixture associada
- **Versionável:** resultados ficam no Git com timestamp; histórico preservado, não sobrescrito
- **Auditável:** alguém que nunca viu o projeto consegue rodar `scripts/run_all` e entender o resultado

## Estrutura do `plano.md`

```markdown
# Plano de Testes Integrados — <Nome do MCP>

## Escopo
## Estratégia
## Tools cobertas
| Tool | Casos felizes | Bordas | Falhas | Total |
|------|---|---|---|---|

## Cenários de simulação de uso (10+)
## Bases de dados utilizadas
| Base | Origem | Versão | Data download | SHA-256 |

## Resultados consolidados (preenchido após execução)
### Resumo executivo
### Métricas globais
### Status por tool
### Status por cenário
### Issues encontradas
### Próximos passos
```

## Quando terminar

Avisar com bloco final no formato:
```
ETAPA 8 — TESTES INTEGRADOS CONCLUÍDA
Plano: 08_testes_integrados/plano.md
Resultados: 08_testes_integrados/resultados/run_<TIMESTAMP>/relatorio.md
PASS: X / FAIL: Y / SKIP: Z
Issues abertas: <lista>
```
