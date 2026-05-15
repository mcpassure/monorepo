import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

const TABELAS_DISPONIVEIS = JSON.stringify(
  {
    tabelas: [
      {
        numero: "18",
        nome: "Diárias, Taxas e Gases Medicinais",
        fonte: "ANS",
        atualizacao: "mensal",
      },
      {
        numero: "20",
        nome: "Medicamentos",
        fonte: "ANS",
        atualizacao: "mensal",
      },
      {
        numero: "22",
        nome: "Procedimentos e Eventos em Saúde",
        fonte: "ANS",
        atualizacao: "trimestral",
      },
    ],
  },
  null,
  2
);

const CATEGORIAS = JSON.stringify(
  {
    tabela_22_procedimentos: [
      "Consultas e visitas",
      "Diagnóstico por imagem",
      "Anatomia patológica e citopatologia",
      "Hemoterapia",
      "Cirurgia",
      "Terapias especializadas",
      "Obstetrícia",
      "Radiologia intervencionista",
    ],
    tabela_20_medicamentos: [
      "Analgésicos e antipiréticos",
      "Antibióticos",
      "Quimioterápicos",
      "Imunobiológicos",
      "Hemoderivados",
      "Contraste",
    ],
    tabela_18_diarias_taxas: [
      "Diárias de internação",
      "Diárias de UTI",
      "Taxas hospitalares",
      "Gases medicinais",
    ],
  },
  null,
  2
);

const SCOPE_MARKDOWN = `# @mcpassure/mcp-tuss — Escopo / Scope

## PT-BR

### O que este MCP faz
- Consulta as 3 tabelas TUSS oficiais da ANS: Tab. 22 (Procedimentos), Tab. 20 (Medicamentos), Tab. 18 (Diárias/Taxas)
- Cache local SQLite com latência < 5ms
- Busca por código TUSS exato ou por termo livre
- Retorna descrição, vigência e metadados de sincronização

### O que NÃO faz
- Não valida XMLs TISS
- Não traduz CBHPM ↔ TUSS
- Não consulta histórico de procedimentos por paciente
- Não calcula valores de tabelas privadas (CBHPM)
- Não cobre Tab. 19 OPME (fonte indisponível)
- Não cobre Rol ANS (endpoint gov.br retorna 403)

### Disclaimer
Dados TUSS extraídos das tabelas publicadas pela ANS (ans.gov.br). Caráter exclusivamente informativo.
Execute \`npm run sync\` para atualizar o cache local. Consulte sempre a versão vigente no portal oficial da ANS.
Este MCP não substitui orientação médica, farmacêutica ou jurídica especializada.

---

## EN-US

### What this MCP does
- Queries 3 official TUSS tables from Brazilian ANS: Tab. 22 (Procedures), Tab. 20 (Medications), Tab. 18 (Hospital Fees/Daily Rates)
- Local SQLite cache with < 5ms latency
- Search by exact TUSS code or free-text term
- Returns description, validity dates and sync metadata

### What it does NOT do
- Does not validate TISS (Brazilian Health Insurance Information Exchange) XML files
- Does not translate CBHPM ↔ TUSS codes
- Does not query patient procedure history
- Does not calculate private table prices (CBHPM)
- Does not cover Tab. 19 OPME (source unavailable)
- Does not cover ANS Rol (gov.br endpoint returns 403)

### Disclaimer
TUSS data extracted from official ANS (Brazilian National Supplementary Health Agency) tables.
For informational purposes only. Run \`npm run sync\` to update the local cache.
Always check the current version at the official ANS portal. This MCP does not replace medical, pharmaceutical, or legal professional advice.
`;

export function tabelasDisponiveisHandler(): ReadResourceResult {
  return {
    contents: [
      {
        uri: "tuss://tabelas_disponiveis",
        mimeType: "application/json",
        text: TABELAS_DISPONIVEIS,
      },
    ],
  };
}

export function categoriasHandler(): ReadResourceResult {
  return {
    contents: [
      {
        uri: "tuss://categorias",
        mimeType: "application/json",
        text: CATEGORIAS,
      },
    ],
  };
}

export function scopeHandler(): ReadResourceResult {
  return {
    contents: [
      {
        uri: "tuss://scope",
        mimeType: "text/markdown",
        text: SCOPE_MARKDOWN,
      },
    ],
  };
}
