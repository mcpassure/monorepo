# Pesquisa Técnica — MCP TUSS / CBHPM / Rol ANS

## Pergunta ou objetivo do pedido

Criar um servidor MCP (Model Context Protocol) que exponha consultas integradas às três terminologias obrigatórias da saúde suplementar brasileira — TUSS, CBHPM e Rol ANS — mantendo total consistência de stack, padrões e estilo com os MCPs 1 (Bulário) e 2 (CNES) do catálogo Vetrum Brasil.

---

## Resumo executivo do que existe hoje

### Fontes de dados existentes

As três terminologias existem e são públicas, mas estão distribuídas em fontes distintas, em formatos heterogêneos, sem uma API unificada de consulta:

1. **TUSS** — disponível como arquivos ZIP com planilhas Excel no portal da ANS (gov.br/ans), atualizados mensalmente. Há pelo menos 63 tabelas de domínio. As mais relevantes: Tabela 18 (Diárias/Taxas/Gasoterapia), Tabela 19 (Materiais/OPME, ~300k+ registros em 05/2025), Tabela 20 (Medicamentos), Tabela 22 (Procedimentos/Eventos em Saúde — a tabela central).

2. **CBHPM** — publicada pela AMB (Associação Médica Brasileira). A 6ª edição (2022, versão ago/2023) é a vigente. **Não existe dataset público estruturado com download livre**: é vendida como livro/publicação. Seus campos de porte anestésico e UCO estão parcialmente espelhados na tabela de correlação TUSS-ROL distribuída pela ANS (colunas SUBGRUPO, GRUPO, CAPÍTULO da planilha de correlação).

3. **Rol de Procedimentos ANS** — documento normativo (RN 465/2021 e atualizações) disponível como PDF e Excel (Anexo I e Anexo II) no portal da ANS. A versão mais recente identificada é RN 668/2026 (Anexo I). Há também uma planilha de correlação TUSS-ROL publicada mensalmente, que é o documento mais rico encontrado — ela correlaciona código TUSS com o procedimento no Rol, modalidades de cobertura e hierarquia CBHPM.

4. **FHIR Terminologias MS** — o Ministério da Saúde mantém um servidor FHIR R4 em `terminologia.saude.gov.br/fhir` com o CodeSystem `BRCBHPMTUSS` (versão 1.0.0, atualizado jul/2025) e o ValueSet `BRProcedimentosNacionais` (1.000 conceitos do CodeSystem `fhir.ans.gov.br/CodeSystem/tuss-22`). O servidor existe mas o HTML documenta que "nenhum código é representado aqui" — os dados reais ficam nas operações FHIR `$expand`, `$lookup` e `$validate-code`, não no HTML.

### Ausência de concorrente direto

Nenhum MCP publicado cobre TUSS/CBHPM/Rol ANS. O servidor `medical-terminologies-mcp` (SidneyBissoli, disponível no Glama/Smithery) cobre ICD-11, SNOMED, LOINC, RxNorm, MeSH, ATC e CID-10 (BR DataSUS V2008), mas **não inclui TUSS, CBHPM nem Rol ANS**.

### MCPs 1 e 2 do catálogo Vetrum

Os MCPs 1 (Bulário) e 2 (CNES) ainda não possuem implementação: existem somente os documentos de pedido (`0-pedido.md`). A stack definitiva não foi formalizada em nenhum artefato — o pedido do MCP 1 diz explicitamente que "decisão de stack deve ser tomada na fase de PRD", e os MCPs 2 e 3 pedem "stack obrigatoriamente igual ao MCP 1". Portanto, a pesquisa identifica o padrão tecnológico planejado a partir dos pedidos, sem implementação de referência confirmada.

---

## Arquivos e diretórios relevantes

### Estrutura local do projeto (sem implementação ainda)

```
D:\ambiente_github\projetos pessoais\mcp_vetrum\
├── 1-mcp-ANVISA Bulário Eletrônico\
│   ├── 01_regras_permanentes\          (prompts de metodologia)
│   ├── 02_modelos_variaveis_do_projeto\
│   │   └── 0-pedido.md                 (pedido do MCP 1 — sem artefatos)
│   └── artifacts\                      (vazio)
├── 2-mcp-CNES\
│   ├── 01_regras_permanentes\
│   ├── 02_modelos_variaveis_do_projeto\
│   │   └── 0-pedido.md                 (pedido do MCP 2 — sem artefatos)
│   └── artifacts\                      (vazio)
└── 3- mcp- TUSS  CBHPM  Rol ANS\       ← este projeto
    ├── 01_regras_permanentes\
    └── 02_modelos_variaveis_do_projeto\
        ├── 0-pedido.md
        └── anexos\                      (vazio)
```

### Arquivos de dados externos identificados (fontes oficiais)

| Arquivo | Fonte | Formato | Versão identificada |
|---|---|---|---|
| Tabela TUSS 18 (Diárias/Taxas) | ANS / gov.br | ZIP+Excel | mai/2025 (sem alterações) |
| Tabela TUSS 19 (Materiais/OPME) | ANS / gov.br | ZIP+Excel | mai/2025 (25.836 inclusões, 2.918 exclusões) |
| Tabela TUSS 20 (Medicamentos) | ANS / gov.br | ZIP+Excel | mai/2025 (334 inclusões) |
| Tabela TUSS 22 (Procedimentos) | ANS / gov.br | ZIP+Excel | 202501/202503/202505 |
| Correlação TUSS-ROL | ANS / gov.br | Excel (.xlsx) | TUSS202603 + RN652/654.2025 |
| Anexo I Rol ANS | ANS / gov.br | PDF + Excel | RN 668/2026 |
| Anexo II DUT | ANS / gov.br | PDF | RN 667/2026 |
| CodeSystem BRCBHPMTUSS (FHIR) | Ministério da Saúde | FHIR R4 | 1.0.0 (jul/2025) |
| CBHPM 6ª edição | AMB | Livro + PDF parcial | 2022 (ago/2023) |

---

## Componentes e responsabilidades

### Terminologia TUSS

- **O que é**: padrão obrigatório desde 2010 (RN ANS 153/2007 e atualizações) para codificação de eventos assistenciais em saúde suplementar. Baseado na CBHPM (5ª edição como base, mas compatível com a 6ª).
- **Tabela principal**: Tabela 22 — Terminologia de Procedimentos e Eventos em Saúde. Atualização mensal pela ANS.
- **Código**: 8 dígitos (ex: `10101012` = Consulta em consultório).
- **Outras tabelas relevantes**: 18 (diárias/taxas), 19 (materiais/OPME), 20 (medicamentos).
- **Fonte primária de download**: portal ANS gov.br (arquivos ZIP com Excel).
- **Fonte secundária FHIR**: `terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS` e `fhir.ans.gov.br/CodeSystem/tuss-22`.

### Rol de Procedimentos ANS

- **O que é**: lista de cobertura mínima obrigatória dos planos de saúde (desde 02/01/1999, RN 465/2021 + atualizações).
- **Versão vigente**: RN 668/2026 (Anexo I), RN 667/2026 (Anexo II/DUT).
- **Campos de cobertura por segmento**:
  - OD = Plano Odontológico
  - AMB = Plano Ambulatorial
  - HCO = Plano Hospitalar com Obstetrícia
  - HSO = Plano Hospitalar sem Obstetrícia
  - PAC = Plano de Atenção Continuada / Referência
- **DUT**: Diretriz de Utilização — indicador se há critério técnico de uso para autorização.
- **Fonte**: PDF e Excel em gov.br/ans.

### Planilha de Correlação TUSS-ROL (artefato-chave identificado)

Este documento é o mais rico e integrador encontrado. Estrutura real da planilha `CorrelaoTUSS.202409Rol.2021_TUSS202603_RN652.2025_RN654.2025.xlsx`:

| Coluna | Campo | Descrição |
|---|---|---|
| A | Código | Código TUSS de 8 dígitos |
| B | Terminologia Tab. 22.202501 | Descrição TUSS oficial (Tabela 22) |
| C | Correlação (Sim/Não) | Se o procedimento TUSS está no Rol ANS |
| D | PROCEDIMENTO | Nome do procedimento no Rol ANS |
| E | Resolução Normativa (alteração) | RN que inseriu/alterou este item |
| F | VIGÊNCIA | Data de vigência |
| G | OD | Cobertura por plano odontológico |
| H | AMB | Cobertura ambulatorial |
| I | HCO | Cobertura hospitalar c/ obstetrícia |
| J | HSO | Cobertura hospitalar s/ obstetrícia |
| K | PAC | Cobertura plano atenção continuada |
| L | DUT | Tem Diretriz de Utilização (S/N) |
| M | SUBGRUPO | Subgrupo na hierarquia CBHPM |
| N | GRUPO | Grupo na hierarquia CBHPM |
| O | CAPÍTULO | Capítulo na hierarquia CBHPM |

- Dimensão: ~6.735 linhas de dados (A8:O6743), 15 colunas.
- Múltiplas linhas para o mesmo código TUSS são possíveis (diferentes contextos de cobertura).
- Exemplo: código `10101012` (Consulta em consultório) aparece em múltiplas linhas com diferentes segmentos de cobertura.

### CBHPM

- **O que é**: classificação hierárquica dos procedimentos médicos com valoração em UCO e porte anestésico. 6ª edição (2022) pela AMB.
- **Hierarquia**: CAPÍTULO > GRUPO > SUBGRUPO > Procedimento.
- **Campos específicos**: código, descrição, porte cirúrgico (A-M), porte anestésico (0-8), UCO (unidade de custo operacional), coeficiente de filmes, número de auxiliares.
- **Disponibilidade**: **publicação paga (AMB)** — sem dataset aberto e estruturado para download público. Os campos de hierarquia (CAPÍTULO/GRUPO/SUBGRUPO) aparecem na correlação TUSS-ROL. Dados completos de porte anestésico e UCO exigem acesso ao livro ou a bases de dados comerciais.
- **URL oficial AMB**: https://amb.org.br/cbhpm/

### Servidor FHIR do Ministério da Saúde

- **URL base**: `https://terminologia.saude.gov.br/fhir/`
- **IG versão**: 1.0.0 STU1, FHIR R4.0.1, licença CC0-BY
- **CodeSystem relevante**: `CodeSystem/BRCBHPMTUSS` — URL canônica: `https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS`
- **Outro CodeSystem**: `CodeSystem/BRTabelaSUS` (tabela SUS) e `CodeSystem/BRCBO` (ocupações)
- **ValueSet relevante**: `ValueSet/BRProcedimentosNacionais` — agrega 1.000 conceitos do CodeSystem `https://fhir.ans.gov.br/CodeSystem/tuss-22`
- **Operações FHIR disponíveis** (padrão R4): `$lookup`, `$validate-code`, `$expand`, `$translate` (via ConceptMap)
- **Limitação identificada**: o HTML documenta que "nenhum código é representado aqui" — os dados reais residem nos endpoints de operações FHIR e no conteúdo dos pacotes NPM publicados pelo MS.

---

## Fluxos atuais relacionados

### Fluxo atual (sem o MCP)

```
Faturista/Auditor
    → acessa portal ANS manualmente
    → baixa ZIP com Excel da tabela TUSS (dezenas de MB)
    → busca em planilha local (CTRL+F)
    → acessa separadamente o Rol ANS (PDF ou Excel)
    → cruza manualmente código TUSS com Rol
    → consulta CBHPM em livro físico ou PDF para porte anestésico
    → resultado: processo lento, propenso a erro, depende de versões locais possivelmente desatualizadas
```

### Fluxo almejado pelo MCP

```
Agente de IA / Faturista / Auditor
    → invoca tool no MCP (ex: buscar_tuss("consulta médica"))
    → MCP consulta banco local SQLite/DuckDB (já sincronizado)
    → retorna structuredContent com código, descrição, cobertura, hierarquia, vigência
    → agente cruza automaticamente com CNES (MCP 2) via chave CNES quando aplicável
```

### Fluxo de sincronização planejado

```
Scheduler periódico
    → monitora versão publicada no portal ANS
    → baixa ZIP com tabelas TUSS atualizadas
    → baixa planilha de correlação TUSS-ROL
    → ingestão incremental no banco local
    → atualiza metadado de versão e data de última sincronização
```

---

## Contratos, integrações e dependências encontradas

### Dependências de dados (fontes externas)

| Fonte | URL base | Tipo de acesso | Frequência de atualização | Formato |
|---|---|---|---|---|
| ANS — Tabelas TUSS | `https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss` | Download manual / HTTP | Mensal | ZIP + Excel |
| ANS — Correlação TUSS-ROL | `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos` | Download HTTP direto | Variável (por RN) | Excel (.xlsx) |
| ANS — Rol Anexo I | mesma URL | Download HTTP | Variável (por RN) | PDF + Excel |
| MS — FHIR Terminologias | `https://terminologia.saude.gov.br/fhir/` | FHIR R4 REST API | Variável | JSON/XML/TTL |
| AMB — CBHPM | `https://amb.org.br/cbhpm/` | Publicação paga | A cada nova edição | Livro/PDF |

### Integração com MCP 2 (CNES)

- O pedido exige compatibilidade com MCP 2: qualquer referência a estabelecimento de saúde usa o **código CNES** como chave.
- O cruzamento "qual estabelecimento oferece qual procedimento" requer join entre o banco de dados deste MCP e o do MCP 2 via código CNES.
- MCP 2 ainda não está implementado — a integração é uma dependência futura.

### Integração FHIR

- Outputs devem ser "FHIR-friendly" conforme o pedido.
- O CodeSystem relevante é `BRCBHPMTUSS` (URL canônica: `https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS`).
- Estruturas de output podem incluir o campo `system` com a URL canônica para permitir uso como Coding FHIR.

### Contrato MCP (spec 2025-11-25)

- **Transporte**: stdio (Claude Desktop) e HTTP Streamable
- **structuredContent**: obrigatório em todas as tools (campo `content` + `structuredContent` no resultado)
- **Annotations obrigatórias**: `readOnlyHint: true`, `idempotentHint: true`, `destructiveHint: false`, `openWorldHint: true`
- **Instalação**: `npx` (TypeScript) ou `uvx` (Python) em 1 comando
- **Registries alvo**: MCP Registry oficial, Smithery, Glama

---

## Padrões existentes reutilizáveis

### Do contexto Vetrum Brasil (MCPs 1 e 2 — planejados, não implementados)

Os pedidos dos MCPs 1 e 2 estabelecem os seguintes padrões que **este MCP deve seguir**:

1. **Cache local persistente** em SQLite ou DuckDB embedded — toda consulta deve responder em <500ms após carga inicial (requisito do MCP 2).
2. **structuredContent** em todas as tools (requisito de todos os MCPs).
3. **Annotations corretas** nas tools: `readOnlyHint: true`, `idempotentHint: true`, `destructiveHint: false`, `openWorldHint: true`.
4. **Versionamento semântico** com metadado de versão e data de sincronização em toda resposta.
5. **Análise estática + testes automatizados + CI** desde o primeiro commit.
6. **Evals** mínimo 10 perguntas reais.
7. **Documentação em PT-BR** direcionada a não técnicos (faturistas, auditores) e técnicos (devs).
8. **Licença aberta** (MIT ou Apache 2.0) com `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
9. **Sem PHI/PII** — todas as tabelas são listas de códigos públicos.
10. **Instalação em 1 comando** via npx (TS) ou uvx (Python).
11. **Chave CNES** para referências a estabelecimentos.

### Da especificação MCP 2025-11-25

- SDK TypeScript oficial: `@modelcontextprotocol/sdk`
- FastMCP TypeScript: pacote `fastmcp` (npm) — framework popular, ~70% dos MCP servers
- FastMCP Python: pacote `mcp` com FastMCP integrado
- Suporte a OAuth discovery, Streamable HTTP, edge runtimes (Cloudflare Workers)

### Do repositório `tabelas-ans` (charlesfgarcia/tabelas-ans)

- Existe um repositório open source com tabelas ANS em SQL e JSON (tabelas 22, 23, 24, 39, 41, 43, 50, 52, 57, 63, 64).
- Provavelmente desatualizado (8 commits apenas, sem data visível).
- Pode servir como referência de esquema de banco, mas **não deve ser reutilizado diretamente** (política do pedido: sem reaproveitamento de código de terceiros).

---

## Contexto histórico ou documental relevante

### Regulação e obrigatoriedade

- **1999**: criação do Rol de Procedimentos ANS (portaria 1.401/GM/MS de 28/01/1999).
- **2007**: RN ANS 153/2007 torna TUSS obrigatória para operadoras.
- **2010**: plena implementação do padrão TUSS em saúde suplementar.
- **2021**: RN 465/2021 — última reformulação ampla do Rol de Procedimentos.
- **2025-2026**: sequência de RNs atualizando Rol e TUSS (627, 628, 629, 642, 643, 652, 654, 667, 668).
- **Mar/2026**: versão mais recente do Padrão TISS Organizacional.

### CBHPM e AMB

- CBHPM 6ª edição (2022) é a base técnica atual, editada por 54 sociedades médicas filiadas à AMB.
- Porte anestésico: 8 portes (0-8), cada um com valor em UCO.
- UCO (Unidade de Custo Operacional): unidade de medida que incorpora depreciação de equipamentos, manutenção, salários e outras despesas.
- **Restrição crítica**: os dados completos de porte anestésico e UCO por procedimento **não têm fonte pública estruturada** — a CBHPM é uma publicação paga da AMB. A planilha de correlação TUSS-ROL traz hierarquia (CAPÍTULO/GRUPO/SUBGRUPO) mas não traz porte anestésico nem UCO por procedimento.

### Catálogo Vetrum Brasil

- MCP 1 (Bulário ANVISA): primeiro MCP, estabelece padrão técnico — ainda sem implementação.
- MCP 2 (CNES): camada de identidade canônica — ainda sem implementação.
- MCP 3 (TUSS/CBHPM/Rol ANS): este projeto — maior alavanca comercial da Onda 1.
- MCPs 4-6 (ANVISA Registros, ANS, DATASUS): planejados para Onda 2.
- Conceito de "catálogo": cada MCP reutiliza arquitetura do anterior, reduzindo ~40% do tempo de implementação.

### Ecossistema MCP (global)

- Glama: 23.328 MCP servers em 10/05/2026 — nenhum específico para TUSS/CBHPM/Rol ANS.
- Smithery: marketplace de MCPs — nenhum específico para TUSS/CBHPM/Rol ANS.
- PulseMCP: 14.710+ servidores indexados — nenhum encontrado para terminologias brasileiras de saúde suplementar.
- Posição de mercado: janela aberta de first-mover em MCP de saúde suplementar brasileira.

---

## Metadados da pesquisa

### Branch atual
Não aplicável — repositório git não inicializado neste projeto.

### Commit atual
Não aplicável — sem histórico git.

### Repositório
Local: `D:\ambiente_github\projetos pessoais\mcp_vetrum\3- mcp- TUSS  CBHPM  Rol ANS`
Remoto: não configurado.

### Data da pesquisa
2026-05-13

---

## Referências objetivas de arquivos

| Recurso | URL / Caminho |
|---|---|
| Portal TISS da ANS | `https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss` |
| Página de atualização do Rol ANS | `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos` |
| Correlação TUSS-ROL mais recente (identificada) | `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos/CorrelaoTUSS.202409Rol.2021_TUSS202603_RN652.2025_RN654.2025.xlsx` |
| Anexo I Rol 2021 (RN 668/2026) | `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos/Anexo_I_Rol_2021RN_465.2021_RN668.2026.xlsx` |
| Padrão TISS Organizacional jul/2025 | `https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss/PadroTISS_ComponenteOrganizacional_202507.pdf` |
| CodeSystem BRCBHPMTUSS (FHIR) | `https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS` |
| ValueSet BRProcedimentosNacionais (FHIR) | `https://terminologia.saude.gov.br/fhir/ValueSet-BRProcedimentosNacionais.html` |
| FHIR IG Brasil — lista de artefatos | `https://terminologia.saude.gov.br/fhir/artifacts.html` |
| CBHPM AMB (site oficial) | `https://amb.org.br/cbhpm/` |
| MCP SDK TypeScript | `https://github.com/modelcontextprotocol/typescript-sdk` |
| FastMCP (npm, TypeScript) | `https://www.npmjs.com/package/fastmcp` |
| FastMCP (Python) | `https://github.com/jlowin/fastmcp` |
| Spec MCP 2025-11-25 | `https://modelcontextprotocol.io/specification/2025-11-25` |
| tabelas-ans (referência, não reutilizar) | `https://github.com/charlesfgarcia/tabelas-ans` |
| medical-terminologies-mcp (concorrente) | `https://glama.ai/mcp/servers/SidneyBissoli/medical-terminologies-mcp` |
| Pedido MCP 1 (Bulário) | `D:\ambiente_github\projetos pessoais\mcp_vetrum\1-mcp-ANVISA Bulário Eletrônico\02_modelos_variaveis_do_projeto\0-pedido.md` |
| Pedido MCP 2 (CNES) | `D:\ambiente_github\projetos pessoais\mcp_vetrum\2-mcp-CNES\02_modelos_variaveis_do_projeto\0-pedido.md` |
| Pedido MCP 3 (este) | `D:\ambiente_github\projetos pessoais\mcp_vetrum\3- mcp- TUSS  CBHPM  Rol ANS\02_modelos_variaveis_do_projeto\0-pedido.md` |

---

## Pontos que devem seguir para o PRD

1. **Decisão de stack**: TypeScript (MCP SDK oficial + fastmcp) ou Python (FastMCP). Deve ser tomada no PRD do MCP 1 — ou confirmada aqui se o MCP 1 ainda não o fez. A decisão vale para todos os MCPs Vetrum.

2. **Estratégia CBHPM**: os dados de porte anestésico e UCO **não estão disponíveis como dataset público aberto**. O PRD deve definir: (a) usar apenas os campos de hierarquia disponíveis na correlação TUSS-ROL, (b) mapear porte anestésico a partir de tabelas de referência conhecidas mas sem garantia de atualização automática, ou (c) limitar o escopo da CBHPM aos campos disponíveis na correlação e documentar a limitação.

3. **Estratégia de ingestão de dados**: o PRD deve definir o pipeline de download e ingestão das tabelas TUSS (ZIP → Excel → SQLite/DuckDB), incluindo tratamento de erros, validação e versionamento.

4. **Escopo de tabelas TUSS**: o pedido menciona tabelas de procedimentos, materiais, medicamentos, OPME, taxas e diárias — mapeadas para Tabelas 18, 19, 20 e 22. O tamanho combinado é substancial (Tabela 19 sozinha tem 300k+ registros em mai/2025). O PRD deve definir se todas são incluídas no escopo v1.

5. **Operações FHIR**: o servidor FHIR do MS existe mas os dados reais exigem chamadas REST (`$lookup`, `$expand`). O PRD deve decidir se o MCP faz passagem direta pela API FHIR ou se ingere os dados em banco local (modelo do MCP 2 com SQLite).

6. **Modelo de sincronização**: as atualizações do Rol ANS são irregulares (por RN); as tabelas TUSS são mensais. O PRD deve definir a política de sincronização periódica e como detectar novas versões automaticamente.

7. **Cobertura mínima de evals**: o pedido requer mínimo 10 perguntas reais cobrindo auditoria de glosa, validação de faturamento e busca de cobertura obrigatória. O PRD deve listar os casos concretos.

8. **Conflito potencial de fonte para CBHPM**: a CBHPM 6ª edição (2022, AMB) tem como base a 5ª edição do ponto de vista do TUSS (o padrão TISS cita CBHPM 5ª edição como referência original). O PRD deve registrar qual edição é usada e documentar qualquer divergência.

9. **Selo Vetrum**: a política de versionamento e compliance LGPD deve ser especificada no PRD, incluindo o que aparece em toda resposta (versão da CBHPM utilizada, data de última sincronização, RN de referência).

10. **Integração CNES (MCP 2)**: o cruzamento "estabelecimento × procedimento" depende do MCP 2 estar disponível. O PRD deve definir se a integração é v1 ou roadmap futuro.
