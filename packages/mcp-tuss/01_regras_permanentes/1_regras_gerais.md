# Regras Gerais para Desenvolvimento com IA

Você está trabalhando em um fluxo documental por etapas. Cada etapa tem entradas obrigatórias, uma saída principal e um nome de arquivo obrigatório.

## Ordem obrigatória das etapas
1. Pesquisa
2. PRD
3. Spec técnica
4. Plano de execução
5. Implementação
6. Validação
7. Entrega

## Regras permanentes
- Siga estritamente a metodologia. nada de consolidar nada, não mudar a metodologia, não reinventar nada.
- Não pule etapas.
- Seja caprichoso, não seja preguiçoso
- Não implemente antes de concluir pesquisa, PRD, spec e plano.
- Leia integralmente todos os arquivos explicitamente mencionados na etapa atual.
- Não misture etapas.
- Cada etapa deve produzir apenas seu artefato principal.
- Não invente requisitos não sustentados pelo pedido, pela base de código, pela documentação ou pela investigação.
- Se houver conflito entre fontes, explicite o conflito.
- Se faltar informação crítica, aponte isso objetivamente.
- Não suprimir endereços e urls que foram dados como exemplos, mantenha acessivel, a proxima etapa não pode perder referencias
- Acesse e pesquise as referencias fornecidas.
- Não reclame que não existem codebase anexada, vá e busque nas urls fornecidas.
- Extraia features de jpegs e similares fornecidos

## Regra importante sobre pesquisa
A etapa de pesquisa NÃO deve ficar restrita apenas aos arquivos anexados pelo usuário.
A IA deve investigar a base de código e os documentos relevantes para responder bem à pergunta de pesquisa.
Se existirem código, diretórios, documentação interna, histórico ou material correlato relevante, eles podem e devem ser investigados.

## Contrato de entrada e saída por etapa

### Etapa 1 — Pesquisa
Entradas obrigatórias:
- `1_regras_gerais.md`
- `2_prompt_pesquisa.md`
- `0-pedido.md`
- arquivos e documentos diretamente mencionados
- base de código e documentação relevante ao tema

Saída obrigatória:
- `2-pesquisa.md`

### Etapa 2 — PRD
Entradas obrigatórias:
- `1_regras_gerais.md`
- `3_prompt_prd.md`
- `2-pesquisa.md`

Saída obrigatória:
- `3-prd.md`

### Etapa 3 — Spec técnica
Entradas obrigatórias:
- `1_regras_gerais.md`
- `4_prompt_spec.md`
- `3-prd.md`

Saída obrigatória:
- `4-spec.md`

### Etapa 4 — Plano de execução
Entradas obrigatórias:
- `1_regras_gerais.md`
- `5_prompt_plano_execucao.md`
- `4-spec.md`

Saída obrigatória:
- `5-plano_execucao.md`

### Etapa 5 — Implementação
Entradas obrigatórias:
- `1_regras_gerais.md`
- `6_prompt_implementacao.md`
- `4-spec.md`
- `5-plano_execucao.md`
- código-fonte relevante

Saída obrigatória:
- implementação da fase pedida
- relatório textual da fase executada quando solicitado

### Etapa 6 — Validação
Entradas obrigatórias:
- `1_regras_gerais.md`
- `7_prompt_validacao.md`
- `4-spec.md`
- `5-plano_execucao.md`
- estado implementado do projeto

Saída obrigatória:
- `6-validacao.md`

### Etapa 7 — Entrega
Entradas obrigatórias:
- `1_regras_gerais.md`
- `8_prompt_entrega.md`
- `6-validacao.md`
- estado final do projeto

Saída obrigatória:
- `7-entrega.md`
