> ## ⚠️ NOTA HISTÓRICA — DECISÃO REVISADA EM 2026-05-15
>
> Este PRD foi escrito quando o escopo planejado incluía **TUSS + CBHPM + Rol ANS**. Em **2026-05-15**, o escopo foi revisado:
>
> - **CBHPM removida permanentemente.** A CBHPM é propriedade intelectual da AMB (Associação Médica Brasileira), vendida em livro impresso/digital em https://amb.org.br/adquirir-cbhpm. **Não é base aberta.** Distribuí-la via MCP público viola direito autoral. Toda menção a CBHPM neste PRD (tool `consultar_hierarquia_cbhpm`, tabela `cbhpm_hierarquia`, hierarquia em respostas, etc.) está **anulada** — esses elementos não existem no produto e nunca vão existir.
> - **Rol ANS** sai do "MCP separado em Onda 2" e entra no escopo do **mesmo MCP TUSS** como v0.2.0 (escopo público, legítimo).
> - **Nome final do produto:** "MCP TUSS / Rol ANS" (sem CBHPM).
>
> Para o estado atual e válido, ver:
> - `arquitetura/arquitetura_mcp_tuss.md` (referência arquitetural vigente)
> - `README.md` do diretório raiz deste MCP ("Limitações v0.1.x")
>
> Este PRD permanece arquivado como **registro do que foi planejado**, não como guia do que existe ou está planejado.
>
> ---

# PRD — MCP TUSS / CBHPM / Rol ANS (Vetrum Brasil MCP 3)

## Problema

Faturistas, auditores médicos, operadoras de saúde, hospitais e desenvolvedores healthtech precisam consultar e cruzar três terminologias obrigatórias da saúde suplementar brasileira — TUSS, CBHPM e Rol ANS — em tempo real. Hoje isso exige baixar manualmente arquivos ZIP com planilhas Excel do portal ANS, cruzar dados em múltiplas abas, e consultar a CBHPM em livro físico ou PDF, com versões frequentemente desatualizadas. Não existe nenhuma API pública, nenhum MCP e nenhuma ferramenta estruturada que unifique essas três fontes em consulta programática. O resultado é glosa, retrabalho e disputa de faturamento em um mercado de R$ 250+ bi/ano.

---

## Objetivo

Publicar o terceiro MCP do catálogo Vetrum Brasil: um servidor MCP funcional, instalável em 1 comando, que unifique TUSS (Tabelas 18, 19, 20 e 22), Rol de Procedimentos ANS e a hierarquia CBHPM disponível publicamente, com banco local sincronizado automaticamente, outputs estruturados, selo Vetrum de compliance e documentação em PT-BR.

---

## Resultado esperado

- Servidor MCP publicado no registry oficial MCP, Smithery e Glama, instalável via `npx` em 1 comando.
- Resposta estruturada (<500ms após carga inicial) para qualquer consulta a código TUSS, descrição de procedimento, cobertura no Rol ANS e hierarquia CBHPM.
- Banco local SQLite sincronizado com as tabelas TUSS (Tabs. 18, 19, 20, 22) e a planilha de correlação TUSS-ROL do portal ANS.
- Toda resposta inclui: versão da tabela TUSS utilizada, RN de referência do Rol ANS e data da última sincronização.
- Evals (mínimo 10 casos reais) passando em CI, cobrindo auditoria de glosa, validação de faturamento e consulta de cobertura obrigatória.
- Documentação PT-BR com exemplos para faturistas, auditores e devs healthtech.
- Repositório aberto com licença MIT.

---

## Escopo incluído

### Tools obrigatórias (v1)

| Tool | Descrição |
|---|---|
| `buscar_tuss_por_codigo` | Busca um código TUSS de 8 dígitos; retorna descrição, tabela de origem, hierarquia CBHPM e cobertura no Rol ANS |
| `buscar_tuss_por_descricao` | Busca por texto livre no nome do procedimento/material/medicamento; retorna lista paginada |
| `listar_por_categoria` | Lista registros por categoria (procedimentos, materiais, medicamentos, OPME, taxas, diárias); retorna lista paginada |
| `validar_cobertura_rol` | Dado um código TUSS, retorna se está no Rol ANS vigente, em qual segmento (OD/AMB/HCO/HSO/PAC), RN de inclusão, vigência e se tem DUT |
| `consultar_hierarquia_cbhpm` | Retorna capítulo, grupo e subgrupo CBHPM de um procedimento da Tabela 22; campo disponível na correlação TUSS-ROL |
| `listar_procedimentos_com_cobertura_obrigatoria` | Lista todos os procedimentos com correlação = SIM no Rol ANS vigente; suporta filtro por segmento |
| `status_sincronizacao` | Retorna versão atual de cada tabela TUSS, RN de referência do Rol e data de última sincronização |

### Dados incluídos (v1)

- **Tabela TUSS 22**: Terminologia de Procedimentos e Eventos em Saúde (tabela central de procedimentos médicos)
- **Tabela TUSS 18**: Diárias, Taxas e Gasoterapia
- **Tabela TUSS 19**: Materiais e OPME (~300k+ registros em mai/2025)
- **Tabela TUSS 20**: Medicamentos
- **Correlação TUSS-ROL**: planilha oficial ANS com campos de cobertura (OD, AMB, HCO, HSO, PAC), DUT, hierarquia CBHPM, RN e vigência
- **Rol de Procedimentos ANS**: versão vigente (Anexo I, RN 668/2026 ou mais recente disponível)

### Sincronização

- Script de ingestão inicial: baixa todas as tabelas TUSS e a correlação TUSS-ROL do portal ANS, processa e popula o banco SQLite.
- Sincronização periódica automatizada: detecta nova versão comparando nome do arquivo no portal ANS (o nome do arquivo inclui data/versão); atualiza incrementalmente.
- Metadado de versão e data de sincronização persistido no banco e retornado em toda resposta.

### Padrão Vetrum (obrigatório)

- `structuredContent` em todas as tools.
- Annotations: `readOnlyHint: true`, `idempotentHint: true`, `destructiveHint: false`, `openWorldHint: true`.
- Stack: **TypeScript** com `@modelcontextprotocol/sdk` oficial + SQLite via `better-sqlite3`. (Decisão vale para todos os MCPs Vetrum: MCP 1, 2 e demais usarão a mesma stack.)
- Análise estática (ESLint + TypeScript strict), testes (Vitest), CI (GitHub Actions) desde o primeiro commit.
- Licença MIT. Repositório com `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
- Disclaimer obrigatório em toda resposta: ferramenta de consulta técnica, não substitui análise jurídica de glosa nem parecer de auditoria médica.
- Sem PHI/PII em nenhum momento.

### Outputs FHIR-friendly

Toda resposta de código TUSS inclui o campo `system: "https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS"` para compatibilidade com o padrão `Coding` do FHIR R4.

### Evals (mínimo 10 casos reais)

1. Buscar código TUSS `10101012` → deve retornar "Consulta em consultório", cobertura AMB.
2. Buscar "colonoscopia" → deve retornar pelo menos 3 resultados relevantes.
3. Validar cobertura de `40301370` (ressonância magnética) no plano AMB → deve retornar cobertura com DUT.
4. Listar procedimentos com cobertura obrigatória em HCO → deve retornar lista não vazia.
5. Buscar material OPME por descrição "parafuso" → deve retornar resultados da Tabela 19.
6. Buscar medicamento por descrição "dipirona" → deve retornar resultados da Tabela 20.
7. Buscar taxa hospitalar por descrição "diária UTI" → deve retornar resultados da Tabela 18.
8. Consultar hierarquia CBHPM de `10101012` → deve retornar capítulo "PROCEDIMENTOS GERAIS", grupo "PROCEDIMENTOS GERAIS".
9. Verificar código TUSS inexistente `99999999` → deve retornar erro estruturado informativo, não exceção.
10. Invocar `status_sincronizacao` → deve retornar versão e data de cada tabela.
11. Buscar "glosa" via texto livre → deve retornar resultado ou mensagem informativa sobre ausência.
12. Validar cobertura do código de transplante `40702014` → deve retornar cobertura hospitalar.

---

## Escopo excluído

- **Porte anestésico e UCO (CBHPM)**: dados não disponíveis como fonte pública estruturada. A CBHPM completa é uma publicação paga da AMB. O MCP expõe apenas a hierarquia (CAPÍTULO/GRUPO/SUBGRUPO) disponível na correlação TUSS-ROL. Limitação documentada explicitamente.
- **Integração com MCP 2 (CNES)**: cruzamento "qual estabelecimento oferece qual procedimento" depende do MCP 2, que ainda não existe. Excluído da v1; chave CNES reservada como campo futuro no schema.
- **API FHIR passthrough**: o MCP não faz passagem direta para `terminologia.saude.gov.br/fhir` em consultas de produção. O banco local é a única fonte de verdade em runtime. O endpoint FHIR pode ser usado no pipeline de ingestão se necessário, mas não em consultas ao vivo.
- **CBHPM como fonte primária independente**: a CBHPM não é tratada como fonte separada — ela é representada pelos campos de hierarquia presentes na correlação TUSS-ROL.
- **Tabelas TUSS 21 e demais** (63 tabelas no total): apenas Tabelas 18, 19, 20 e 22 na v1.
- **Valoração/precificação de procedimentos**: UCO, valores em reais, tabelas de honorários — fora do escopo.
- **Histórico de versões de procedimentos**: o banco mantém apenas a versão vigente de cada tabela. Histórico de versões é roadmap.
- **Interface web ou UI**: MCP server apenas (stdio + HTTP), sem frontend.
- **Autenticação ou controle de acesso**: servidor público de leitura, sem auth.

---

## Contexto técnico relevante

### Stack definida (válida para todos os MCPs Vetrum)

- **Runtime**: Node.js (LTS)
- **Linguagem**: TypeScript strict
- **MCP SDK**: `@modelcontextprotocol/sdk` (oficial Anthropic)
- **Banco de dados**: SQLite via `better-sqlite3` (embedded, sem servidor externo)
- **Download/ingestão**: `node-fetch` ou `undici` + `exceljs` para parse de XLSX
- **Testes**: Vitest
- **Lint/type-check**: ESLint + `tsc --noEmit`
- **CI**: GitHub Actions
- **Distribuição**: `npx` via npm (`vetrum-tuss-mcp` ou similar)
- **Transporte**: stdio (primário) + HTTP Streamable (secundário)

### Fonte primária de dados

A planilha de correlação TUSS-ROL publicada pela ANS é o artefato-chave: ela integra código TUSS, descrição TUSS, cobertura por segmento de plano (OD/AMB/HCO/HSO/PAC), DUT, vigência, RN e hierarquia CBHPM em um único arquivo. É o núcleo do banco de dados deste MCP.

As Tabelas TUSS 18, 19 e 20 complementam com materiais, medicamentos e taxas que podem não estar na correlação principal (que cobre apenas Tabela 22).

### Estrutura do banco SQLite

Tabelas principais previstas:
- `tuss_procedimentos` (Tab. 22): código, descrição, ativo/inativo
- `tuss_materiais` (Tab. 19): código, descrição, ativo/inativo
- `tuss_medicamentos` (Tab. 20): código, descrição, ativo/inativo
- `tuss_taxas_diarias` (Tab. 18): código, descrição, ativo/inativo
- `rol_cobertura`: código_tuss, procedimento_rol, od, amb, hco, hso, pac, dut, rn, vigencia
- `cbhpm_hierarquia`: código_tuss, subgrupo, grupo, capitulo
- `sincronizacao_versoes`: tabela, versao, data_sincronizacao, rn_referencia

### URL padrão das fontes ANS

- Portal TISS: `https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss`
- Correlação TUSS-ROL: `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos`
- Padrão de nome do arquivo de correlação: `CorrelaoTUSS.{AAMM}Rol.{ano}_{TUSS_versao}_{RN_lista}.xlsx`

---

## Dependências e integrações relevantes

| Dependência | Tipo | Status | Impacto se ausente |
|---|---|---|---|
| Portal ANS (gov.br) | Fonte de dados (download) | Disponível | Sem dados, MCP não funciona |
| Correlação TUSS-ROL (Excel ANS) | Arquivo de dados principal | Disponível | Sem cruzamento TUSS-ROL, core quebrado |
| Tabelas TUSS 18/19/20/22 (Excel ANS) | Arquivos de dados | Disponíveis | Sem materiais/medicamentos/taxas |
| FHIR terminologia.saude.gov.br | Secundária (schema/metadado) | Disponível | Sem impacto no runtime |
| MCP SDK `@modelcontextprotocol/sdk` | Runtime | npm | Bloqueante |
| `better-sqlite3` | Runtime | npm | Bloqueante |
| `exceljs` | Ingestão | npm | Bloqueante para sincronização |
| MCP 2 (CNES) | Integração futura | Não implementado | Sem impacto na v1 |

---

## Restrições

1. **Stack igual a todos os MCPs Vetrum**: TypeScript + MCP SDK oficial + SQLite. Não negociável.
2. **Sem PHI/PII**: nenhum dado de paciente, médico identificado individualmente ou clínico é armazenado ou retornado.
3. **Sem valoração financeira**: o MCP não retorna preços, honorários, UCO nem valores em reais — apenas terminologia, hierarquia e cobertura normativa.
4. **Dados públicos exclusivamente**: fontes ANS e Ministério da Saúde, todos públicos e de uso livre.
5. **Disclaimer obrigatório**: toda tool deve incluir no output o aviso de que o MCP é fonte de consulta técnica e não substitui análise jurídica de glosa nem parecer de auditoria médica.
6. **CBHPM documentada como parcial**: o MCP documenta explicitamente que expõe apenas a hierarquia CBHPM disponível na correlação TUSS-ROL (CAPÍTULO/GRUPO/SUBGRUPO), e não porte anestésico nem UCO, que dependem de publicação paga da AMB.
7. **Versão da CBHPM utilizada**: 6ª edição (2022), conforme a edição vigente referenciada pela ANS. Documentada em toda resposta via metadado de sincronização.
8. **Compatibilidade com MCP spec 2025-11-25**: annotations, structuredContent e transportes conforme especificação.
9. **FHIR-friendly**: campo `system` com URL canônica `https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS` em toda resposta de código TUSS.
10. **Instalação em 1 comando**: `npx vetrum-tuss-mcp` (ou nome final do pacote npm).

---

## Critérios de sucesso

1. `npx <pacote>` instala e inicia o servidor MCP sem configuração adicional.
2. Todos os 12 casos de eval passam em CI.
3. Tempo de resposta < 500ms para 95% das queries após carga inicial do banco.
4. Banco SQLite populado com dados reais das Tabelas 18, 19, 20, 22 e correlação TUSS-ROL.
5. Toda resposta inclui `tuss_version`, `rol_rn`, `sincronizado_em` e `disclaimer`.
6. TypeScript compila sem erros (`tsc --noEmit`), lint sem warnings críticos.
7. Publicado no registry oficial MCP, Smithery e Glama.
8. Repositório público com README em PT-BR, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
9. Documentação menciona explicitamente a limitação da CBHPM (ausência de porte anestésico e UCO).
10. Adoção por pelo menos uma operadora ou hospital em piloto nos 90 dias após lançamento (meta comercial — fora do CI, mas critério do pedido original).

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| ANS altera estrutura/URL dos arquivos de download | Média | Alto | Monitorar manualmente; parser tolerante a variações de nome de arquivo; alertar em caso de falha de ingestão |
| Tabela 19 (300k+ registros) causa lentidão no banco | Média | Médio | Indexar colunas de busca; testar performance antes de publicar; considerar FTS5 (full-text search) do SQLite |
| CBHPM lança nova edição sem correspondência nos dados ANS | Baixa | Baixo | Campo de versão documentado; atualização manual possível; limitação já prevista em escopo |
| Portal gov.br fora do ar durante sincronização | Baixa | Médio | Retry com backoff exponencial; banco permanece servindo última versão; log explícito do erro |
| Mudança na spec MCP (Anthropic) quebra SDK | Baixa | Alto | Fixar versão do SDK no `package.json`; testar upgrade antes de atualizar |
| MCP 1 (Bulário) ser implementado com stack diferente | Média | Alto | Este PRD já decide por TypeScript — MCP 1 deve seguir a mesma decisão |

---

## Premissas confirmadas

1. **As fontes de dados são públicas e de uso livre**: tabelas TUSS e Rol ANS são publicadas pelo governo federal brasileiro sem restrição de uso.
2. **Nenhum MCP publicado concorre diretamente**: confirmado na pesquisa — janela de first-mover aberta.
3. **A planilha de correlação TUSS-ROL é o artefato integrador**: confirmado pela análise real do arquivo `CorrelaoTUSS…xlsx` — 15 colunas, ~6.735 linhas, integrando código TUSS, descrição, cobertura e hierarquia CBHPM em um único documento.
4. **CBHPM completa (porte anestésico, UCO) não está disponível publicamente**: confirmado — publicação paga da AMB. Os campos de hierarquia (CAPÍTULO/GRUPO/SUBGRUPO) estão disponíveis via correlação ANS.
5. **A stack TypeScript + SQLite atende ao requisito de <500ms**: padrão já definido no pedido do MCP 2 (CNES), que usa banco local para datasets maiores (CNES tem GB de dados).
6. **MCPs 1 e 2 ainda não têm implementação**: confirmado — apenas pedidos documentados. Este PRD toma a decisão de stack que vale para todos.
7. **FHIR do MS existe mas não é suficiente como fonte primária**: confirmado — o HTML documenta que nenhum código é representado; os dados reais exigem chamadas REST que dependem de disponibilidade do servidor externo.
8. **Tabela 19 tem dimensão substancial**: confirmado — 300k+ registros em mai/2025 após inserção de 25.836 códigos. SQLite com índices adequados é suficiente; não requer banco externo.
