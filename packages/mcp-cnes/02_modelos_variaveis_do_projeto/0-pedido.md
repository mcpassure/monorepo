# Pedido

## Objetivo
Criar um servidor MCP (Model Context Protocol) que exponha consultas ao CNES — Cadastro Nacional 
de Estabelecimentos de Saúde — para agentes de IA, permitindo busca por estabelecimentos, profissionais, 
leitos, equipamentos e serviços em todos os ~5.570 municípios brasileiros, com sincronização periódica 
do dataset oficial e selo Vetrum de compliance.

## Contexto
O CNES é a espinha dorsal de qualquer integração relevante com o ecossistema de saúde brasileiro. 
Toda startup de healthtech, todo sistema de regulação assistencial, todo BI hospitalar 
e toda análise epidemiológica precisa, em algum ponto, identificar e caracterizar estabelecimentos 
de saúde — públicos, privados, filantrópicos. Sem CNES não há referência canônica.

Hoje o acesso ao CNES é feito por três caminhos, todos imperfeitos: 

- webservice SOAP do DATASUS (antigo, mal documentado);

- API REST parcial (cobre alguns recursos, não todos);

- dataset CSV mensal completo (formato bruto, dimensão gigante, sem facilidade de consulta).

Não existe wrapper MCP do CNES disponível na comunidade. Este MCP nasce como **segundo MCP do catálogo 
Vetrum Brasil** e tem papel duplo: 

- entregar valor direto a quem consulta dados de estabelecimentos;

- servir de **camada de identidade canônica** para todos os demais MCPs do Vetrum — qualquer outro 
MCP (TUSS, ANS, RNDS) que precise referenciar um estabelecimento de saúde fará isso via chave CNES, 
garantindo consistência cruzada no catálogo Vetrum como um todo.

A escolha do CNES como segundo MCP do roadmap se dá pelo efeito de rede: sem ele, os MCPs posteriores 
terão referência fragmentada de estabelecimentos. Com ele, viramos referência de fato 
do ecossistema.

## O que eu quero
- Servidor MCP funcional, instalável via npx/uvx em 1 comando, mantendo total consistência de stack, 
estilo e padrões com o MCP do Bulário (MCP 1).

- Tools expostas: busca por código CNES, busca por nome do estabelecimento, busca por município (IBGE), 
busca por tipo de estabelecimento (hospital, UBS, UPA, clínica, laboratório, etc.), listagem de 
profissionais por estabelecimento, listagem de leitos por tipo (UTI adulto/pediátrico/neonatal, 
clínico, cirúrgico, obstétrico), listagem de equipamentos cadastrados, listagem de serviços 
especializados oferecidos.

- Sincronização automatizada do dataset mensal CNES (download incremental, validação, ingestão 
em banco local).

- Armazenamento eficiente em SQLite ou DuckDB embedded — toda consulta deve responder em <500ms 
após primeira carga.

- Cache de consultas frequentes com invalidação na ingestão de novo dataset.

- Documentação em PT-BR com casos de uso reais (mapeamento de rede assistencial em município, 
identificação de capacidade de leitos UTI por região, integração com sistema de regulação).

- Selo Vetrum: compliance LGPD documentado (dados públicos, sem PHI), versionamento semântico, 
política de atualização sincronizada com o ciclo mensal do CNES.

- Conjunto de evals (mínimo 10 perguntas reais e verificáveis) cobrindo consultas de produção real.

- Publicação no registry oficial MCP, Smithery e Glama desde o primeiro release.

## Restrições
Stack obrigatoriamente igual ao MCP 1 (Bulário) — decisão tomada na fase de PRD do MCP 1 vale para todos.

Nenhum dado pessoal identificável de paciente deve ser tratado em nenhum momento; dados de 
profissionais (nome, CBO, vínculo) são públicos no CNES e podem ser expostos, 
com disclaimer de uso responsável.

Dataset CNES bruto é grande (~GB compactado, dezenas de GB descompactado) — implementar 
download incremental por município/UF quando possível, evitando re-download completo.

Implementar análise estática, testes e CI desde o primeiro commit.

Output schemas estruturados (`structuredContent`) em todas as tools.

Annotations corretas: `readOnlyHint: true`, `idempotentHint: true`, `destructiveHint: false`, 
`openWorldHint: true` (CNES atualiza mensalmente).

Documentação inclui aviso explícito de defasagem possível entre dataset CNES e realidade 
operacional do estabelecimento.

Repositório aberto sob mesma licença do MCP 1, mesma estrutura de `CONTRIBUTING.md`, 
`SECURITY.md`, `CODE_OF_CONDUCT.md`.

Compatibilidade futura com FHIR brasileiro: estruturas de output devem permitir mapeamento 
direto para perfis FHIR de `Organization` e `Location` quando o MCP RNDS for construído.

## Resultado esperado
Ao final, espera-se um servidor MCP publicado e instalável em 1 comando, com:

resposta confiável e estruturada para qualquer consulta sobre estabelecimentos de saúde brasileiros;

dataset CNES sincronizado mensalmente sem intervenção manual;

resposta consistente em <500ms para consultas típicas após carga inicial;

documentação em PT-BR com casos de uso de regulação assistencial, BI hospitalar e healthtech;

evals passando em CI;

primeira tração mensurável (downloads, stars, integrações);

posicionamento como **camada de identidade canônica** do catálogo Vetrum Brasil — toda referência 
a estabelecimento de saúde, em qualquer MCP futuro do Vetrum (TUSS, ANS, RNDS, DATASUS), 
usa o código CNES como chave;

reuso da arquitetura do MCP 1 (Bulário) acelerando entrega em pelo menos 40% do tempo, 
e validação de que o template do Vetrum funciona como esperado.

O resultado esperado não é apenas um wrapper de consulta, mas a **infraestrutura de identidade** 
sobre a qual o resto do catálogo Vetrum se apoia. Sem CNES funcional e bem mantido, 
os MCPs posteriores ficam órfãos de referência canônica.
