---
description: Pesquisar e documentar a codebase como ela existe hoje, usando arquivos mencionados, base de código, documentação, histórico e contexto correlato quando relevante
baseado_em: research_codebase
saida_obrigatoria: 2-pesquisa.md
---

# Prompt de Pesquisa

Você foi encarregado de conduzir uma pesquisa técnica abrangente para responder à pergunta do usuário e documentar a codebase como ela existe hoje.

## PRINCÍPIO CRÍTICO
SEU ÚNICO TRABALHO NESTA ETAPA É DOCUMENTAR E EXPLICAR O SISTEMA COMO ELE EXISTE HOJE.
- NÃO sugerir melhorias ou mudanças, salvo pedido explícito
- NÃO fazer root cause analysis, salvo pedido explícito
- NÃO propor futuras evoluções, salvo pedido explícito
- NÃO criticar a implementação
- NÃO recomendar refatoração, otimização ou mudanças arquiteturais
- APENAS descrever o que existe, onde existe, como funciona e como os componentes interagem

## Entradas obrigatórias desta etapa
- `1_regras_gerais.md`
- este arquivo `2_prompt_pesquisa.md`
- `0-pedido.md`
- arquivos e documentos diretamente mencionados pelo usuário
- base de código relevante
- documentação relevante
- histórico/contexto correlato quando existir

## Saída obrigatória desta etapa
- gerar exatamente o arquivo `2-pesquisa.md`

## Regra importante
A pesquisa NÃO deve ficar limitada ao que o usuário anexou.
Os anexos e arquivos citados são ponto de partida, não fronteira máxima da investigação.
Você deve investigar também:
- diretórios relevantes da base
- componentes conectados ao tema
- padrões existentes semelhantes
- documentação próxima do assunto
- histórico em git quando isso ajudar a localizar contexto, autoria, evolução ou referências permanentes

## Etapas obrigatórias da pesquisa

### 1. Ler primeiro os arquivos mencionados diretamente
- Se o usuário mencionar arquivos específicos, leia esses arquivos por completo primeiro.
- Não use leitura parcial quando o arquivo foi explicitamente citado.
- Faça isso antes de ampliar a investigação.

### 2. Decompor a pergunta de pesquisa
- Quebre a pergunta em áreas pesquisáveis.
- Identifique componentes, diretórios, fluxos, integrações, contratos e padrões relacionados.
- Defina um plano de investigação antes de sintetizar a resposta.

### 3. Investigar a base de código de forma ampla e relevante
- Descubra onde vivem os componentes principais.
- Entenda como eles funcionam.
- Encontre padrões já existentes no projeto.
- Explore conexões entre arquivos, módulos, serviços e fluxos.
- Priorize a codebase viva como fonte primária da verdade.

### 4. Usar contexto documental e histórico quando relevante
- Use documentos, notas, tickets, ADRs, specs antigas, markdowns ou qualquer material correlato como contexto suplementar.
- Se o repositório tiver histórico em git útil para o tema, isso pode ser usado para enriquecer a pesquisa.
- Se aplicável, colete metadados úteis do repositório, como:
  - branch atual
  - commit atual
  - nome do repositório
- Se fizer sentido, registre referências GitHub/Git permalinks quando disponíveis.

### 5. Sintetizar tudo em um único documento de pesquisa
- Conecte achados entre diferentes partes do sistema.
- Priorize a codebase atual como fonte principal.
- Use contexto histórico apenas como complemento.
- Aponte arquivos, caminhos e, quando aplicável, referências mais precisas.

## Estrutura obrigatória do arquivo de saída `pesquisa.md`

# Pesquisa Técnica

## Pergunta ou objetivo do pedido
## Resumo executivo do que existe hoje
## Arquivos e diretórios relevantes
## Componentes e responsabilidades
## Fluxos atuais relacionados
## Contratos, integrações e dependências encontradas
## Padrões existentes reutilizáveis
## Contexto histórico ou documental relevante
## Metadados da pesquisa
### Branch atual
### Commit atual
### Repositório
### Data da pesquisa
## Referências objetivas de arquivos
## Pontos que devem seguir para o PRD

## Critérios de qualidade
- Cite caminhos de arquivos sempre que possível.
- Documente conexões entre componentes.
- Quando possível, inclua referências precisas.
- Não transformar a pesquisa em PRD, spec ou plano.
- Não incluir recomendações.
- Documentar o que É, não o que DEVERIA SER.
