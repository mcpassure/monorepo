# Fluxo autônomo das 8 etapas

Você é um agente autônomo. Quando o usuário disser "executar" (ou abrir esta sessão), faça o fluxo abaixo do começo ao fim, sem parar entre etapas, sem pedir confirmação.

## Antes de cada etapa
Verifique se o arquivo de saída esperado já existe. Se existir, pule a etapa. Se não, execute.

## As 8 etapas

Sempre ler `01_regras_permanentes/1_regras_gerais.md` ANTES de cada etapa.

| # | Etapa | Prompt | Entrada principal | Saída |
|---|---|---|---|---|
| 1 | Pesquisa | `01_regras_permanentes/2_prompt_pesquisa.md` | `02_modelos_variaveis_do_projeto/0-pedido.md` | `02_modelos_variaveis_do_projeto/2-pesquisa.md` |
| 2 | PRD | `01_regras_permanentes/3_prompt_prd.md` | `02_modelos_variaveis_do_projeto/2-pesquisa.md` | `02_modelos_variaveis_do_projeto/3-prd.md` |
| 3 | Spec | `01_regras_permanentes/4_prompt_spec.md` | `02_modelos_variaveis_do_projeto/3-prd.md` | `02_modelos_variaveis_do_projeto/4-spec.md` |
| 4 | Plano | `01_regras_permanentes/5_prompt_plano_execucao.md` | `02_modelos_variaveis_do_projeto/4-spec.md` | `02_modelos_variaveis_do_projeto/5-plano_execucao.md` |
| 5 | Implementação | `01_regras_permanentes/6_prompt_implementacao.md` | `02_modelos_variaveis_do_projeto/4-spec.md` + `5-plano_execucao.md` | código-fonte |
| 6 | Validação | `01_regras_permanentes/7_prompt_validacao.md` | spec + plano + código | `02_modelos_variaveis_do_projeto/6-validacao.md` |
| 7 | Entrega | `01_regras_permanentes/8_prompt_entrega.md` | `02_modelos_variaveis_do_projeto/6-validacao.md` + estado final | `02_modelos_variaveis_do_projeto/7-entrega.md` |
| 8 | Testes Integrados | `01_regras_permanentes/9_prompt_testes_integrados.md` | `02_modelos_variaveis_do_projeto/4-spec.md` + `7-entrega.md` + código | `08_testes_integrados/plano.md` + `08_testes_integrados/resultados/run_*/relatorio.md` |

## Regras
- Decisão técnica em aberto: decida, justifique no artefato, prossiga.
- Stack padrão: TypeScript + @modelcontextprotocol/sdk + better-sqlite3 + Zod.
- Dataset pago/indisponível: use alternativa documentada, marque como out-of-scope da v1.
- Pare apenas em bloqueio crítico real (algo que falsificaria a saída). Nesse caso, escreva `02_modelos_variaveis_do_projeto/STATUS_BLOQUEIO.md` e pare.
- Ao terminar a Etapa 7, gere `02_modelos_variaveis_do_projeto/STATUS_FINAL.md` com artefatos, decisões importantes e riscos remanescentes.
- Ao terminar a Etapa 8, gere bloco final conforme descrito no `9_prompt_testes_integrados.md`.

## Comece agora.
