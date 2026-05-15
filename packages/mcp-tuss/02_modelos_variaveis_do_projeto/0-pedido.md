# Pedido

## Objetivo
Criar um servidor MCP (Model Context Protocol) que exponha consultas integradas às três terminologias 
obrigatórias da saúde suplementar brasileira: **TUSS** (Terminologia Unificada da Saúde Suplementar), 
**CBHPM** (Classificação Brasileira Hierarquizada de Procedimentos Médicos) e **Rol de Procedimentos da ANS**, 
permitindo a agentes de IA buscar, validar e cruzar códigos de procedimentos médicos, materiais, 
medicamentos, OPME, taxas, diárias e cobertura mínima obrigatória — com selo Vetrum de compliance.

## Contexto
O padrão TUSS é obrigatório para todas as operadoras de planos de saúde no Brasil desde 2010 
(RN ANS 153/2007 e atualizações), e padroniza códigos e nomenclaturas de procedimentos médicos 
com base na CBHPM (atualmente 6ª edição). O Rol da ANS define a cobertura mínima obrigatória 
dos planos de saúde a partir de 02/01/1999.

As três tabelas funcionam de forma integrada, mas têm funções distintas — TUSS organiza nomenclaturas, 
CBHPM dá a base hierárquica com porte anestésico e UCO, Rol determina o que é cobertura mínima. 
Hoje cada operadora, prestador, hospital e auditor trabalha com versões locais dessas tabelas, 
muitas vezes desatualizadas, em planilhas Excel ou PDFs baixados manualmente. 
Isso gera glosa, retrabalho e disputas de faturamento que somam **bilhões em ineficiência operacional** 
no mercado de saúde suplementar brasileiro (R$ 250+ bi/ano).

O Ministério da Saúde já mantém terminologia FHIR oficial em terminologia.saude.gov.br/fhir 
incluindo o code system BRCBHPMTUSS, mas o acesso ainda é técnico demais para uso direto 
em agentes de IA, faturistas e auditores médicos.

Este MCP nasce como **terceiro MCP do catálogo Vetrum Brasil** e é o de **maior alavanca comercial** 
da Onda 1: atende diretamente operadoras, hospitais, clínicas, auditores, advogados de saúde 
e desenvolvedores de soluções de faturamento. Quem fizer primeiro um MCP TUSS confiável, 
atualizado e bem documentado vira referência do setor.

## O que eu quero
- Servidor MCP funcional, instalável via npx/uvx em 1 comando, mantendo total consistência 
de stack, estilo e padrões com os MCPs 1 (Bulário) e 2 (CNES).

- Tools expostas: busca por código TUSS (8 dígitos), busca por descrição/nome de procedimento, 
listagem por categoria (procedimentos médicos, taxas, diárias, materiais, medicamentos, OPME, 
itens não contemplados na CBHPM mas reconhecidos pela ANS), validação de código contra Rol ANS 
vigente, consulta CBHPM com porte anestésico e UCO, identificação de procedimentos 
com cobertura obrigatória.

- Cruzamento com CNES (MCP 2): qual estabelecimento de saúde oferece qual procedimento, 
quando essa informação estiver disponível.

- Sincronização periódica com fontes oficiais: terminologia.saude.gov.br/fhir (Ministério da Saúde), 
portal da ANS (Rol vigente), AMB (CBHPM).

- Documentação em PT-BR direcionada a faturistas, auditores médicos, devs de healthtech, 
advogados de saúde suplementar.

- Selo Vetrum: compliance LGPD documentado (dados públicos, sem PHI), versionamento semântico, 
política explícita de atualização vinculada às publicações oficiais ANS/AMB.

- Conjunto de evals (mínimo 10 perguntas reais), incluindo cenários típicos de auditoria 
de glosa, validação de faturamento e busca de cobertura obrigatória.

- Publicação no registry oficial MCP, Smithery e Glama desde o primeiro release.

## Restrições
Stack obrigatoriamente igual aos MCPs 1 e 2.

Nenhum dado pessoal identificável (PHI/PII) deve ser tratado em nenhum momento — 
terminologias TUSS/CBHPM/Rol são listas de códigos, não dados clínicos.

Implementar conformidade com FHIR R4 conforme o padrão BRCBHPMTUSS oficial 
(terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS) — estruturas de output 
devem ser FHIR-friendly quando aplicável.

Documentar explicitamente a versão da CBHPM utilizada (atualmente 6ª edição) e a versão 
do Rol ANS de referência, com data de última sincronização visível em toda resposta.

Atualizar automaticamente quando ANS publicar nova versão de Rol ou quando AMB liberar 
nova edição da CBHPM — política de versionamento clara.

Implementar análise estática, testes e CI desde o primeiro commit.

Output schemas estruturados (`structuredContent`) em todas as tools.

Annotations corretas: `readOnlyHint: true`, `idempotentHint: true`, `destructiveHint: false`, 
`openWorldHint: true` (tabelas evoluem ao longo do tempo).

Documentação inclui aviso explícito de que a ferramenta é fonte de consulta técnica 
e não substitui análise jurídica de glosa ou parecer de auditoria médica.

Repositório aberto sob mesma licença dos MCPs 1 e 2.

Compatibilidade com MCP 2 (CNES): chave de estabelecimento sempre via CNES quando aplicável.

## Resultado esperado
Ao final, espera-se um servidor MCP publicado e instalável em 1 comando, com:

resposta confiável, estruturada e atualizada para qualquer consulta às terminologias TUSS, CBHPM 
e Rol ANS;

sincronização automatizada com fontes oficiais (Ministério da Saúde via FHIR, ANS, AMB);

documentação em PT-BR clara para públicos não técnicos (faturistas, auditores) 
e técnicos (devs healthtech);

evals passando em CI;

primeira tração mensurável, com adoção por pelo menos uma operadora ou hospital em piloto 
nos 90 dias após lançamento (meta de validação comercial);

posicionamento como **MCP comercialmente estratégico** do catálogo Vetrum Brasil — 
o que tem maior valor direto pra operadoras e hospitais, e que justifica o caminho 
de monetização B2B do roadmap;

consolidação do padrão técnico Vetrum (stack, schemas, doc, testes, evals) após o terceiro MCP, 
encerrando a Onda 1 do roadmap e validando definitivamente a tese do catálogo Vetrum Brasil 
de saúde antes de atacar a Onda 2.

O resultado esperado não é apenas um wrapper das tabelas oficiais, mas a **ferramenta de referência 
operacional** para tudo que envolve códigos de procedimentos médicos no Brasil — auditoria, 
faturamento, glosa, regulação. Com qualidade, atualização garantida e selo de compliance documentado, 
algo que hoje simplesmente não existe no mercado.
