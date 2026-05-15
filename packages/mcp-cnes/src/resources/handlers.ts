import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

const TIPOS_ESTABELECIMENTO = [
  { codigo: "01", descricao: "Posto de Saúde" },
  { codigo: "02", descricao: "Centro de Saúde/Unidade Básica de Saúde (UBS)" },
  { codigo: "04", descricao: "Policlínica" },
  { codigo: "05", descricao: "Hospital Geral" },
  { codigo: "07", descricao: "Hospital Especializado" },
  { codigo: "15", descricao: "Unidade Mista" },
  { codigo: "20", descricao: "Pronto Socorro Geral" },
  { codigo: "21", descricao: "Pronto Socorro Especializado" },
  { codigo: "22", descricao: "Consultório Isolado" },
  { codigo: "32", descricao: "Unidade Móvel Fluvial" },
  { codigo: "36", descricao: "Clínica/Centro de Especialidade" },
  { codigo: "39", descricao: "Unidade de Apoio Diagnose e Terapia (SADT Isolado)" },
  { codigo: "40", descricao: "Unidade de Vigilância em Saúde" },
  { codigo: "42", descricao: "Unidade Móvel Terrestre" },
  { codigo: "43", descricao: "Farmácia" },
  { codigo: "50", descricao: "Unidade de Reabilitação" },
  { codigo: "60", descricao: "Unidade de Vigilância Sanitária" },
  { codigo: "61", descricao: "Centro de Atenção Psicossocial (CAPS)" },
  { codigo: "62", descricao: "Ambulatório de Hospital Geral" },
  { codigo: "67", descricao: "Laboratório Central de Saúde Pública (LACEN)" },
  { codigo: "68", descricao: "Pronto Atendimento" },
  { codigo: "70", descricao: "Centro de Atenção Hemoterapia e/ou Hematológica" },
  { codigo: "71", descricao: "Centro de Pesquisa" },
  { codigo: "72", descricao: "Clínica de Diálise" },
  { codigo: "73", descricao: "Oficina Ortopédica" },
  { codigo: "74", descricao: "Centro de Parto Normal – Isolado" },
  { codigo: "75", descricao: "Telessaúde" },
  { codigo: "76", descricao: "Central de Regulação de Serviços de Saúde" },
  { codigo: "77", descricao: "Serviço de Atenção Domiciliar Isolado (Home Care)" },
  { codigo: "78", descricao: "Unidade de Atenção em Regime Residencial" },
  { codigo: "79", descricao: "Unidade de Atenção Plena" },
  { codigo: "80", descricao: "Laboratório de Saúde Pública" },
  { codigo: "81", descricao: "Central de Regulação Médica das Urgências" },
  { codigo: "82", descricao: "Central de Notificação, Captação e Distribuição de Órgãos Estadual" },
  { codigo: "84", descricao: "Central de Abastecimento" },
  { codigo: "85", descricao: "Centro de Imunização" },
];

const CATEGORIAS_SERVICOS = [
  { codigo: "001", descricao: "ASSISTÊNCIA EM SAÚDE BUCAL" },
  { codigo: "002", descricao: "ASSISTÊNCIA EM URGÊNCIA E EMERGÊNCIA" },
  { codigo: "003", descricao: "ASSISTÊNCIA AMBULATORIAL" },
  { codigo: "004", descricao: "ASSISTÊNCIA À SAÚDE MENTAL" },
  { codigo: "005", descricao: "DIAGNÓSTICO POR IMAGEM" },
  { codigo: "006", descricao: "DIAGNÓSTICO POR ANÁLISE CLÍNICA" },
  { codigo: "007", descricao: "DIAGNÓSTICO EM PATOLOGIA CLÍNICA/CITOPATOLOGIA" },
  { codigo: "008", descricao: "FISIOTERAPIA" },
  { codigo: "009", descricao: "TERAPIA OCUPACIONAL" },
  { codigo: "010", descricao: "FONOAUDIOLOGIA" },
  { codigo: "011", descricao: "NUTRIÇÃO E DIETÉTICA" },
  { codigo: "012", descricao: "PSICOLOGIA" },
  { codigo: "013", descricao: "SERVIÇO SOCIAL" },
  { codigo: "014", descricao: "HEMODIÁLISE" },
  { codigo: "015", descricao: "HEMOTERAPIA" },
  { codigo: "016", descricao: "ONCOLOGIA" },
  { codigo: "017", descricao: "CARDIOLOGIA CLÍNICA" },
  { codigo: "018", descricao: "FARMÁCIA" },
  { codigo: "019", descricao: "HOSPITAL DIA" },
  { codigo: "020", descricao: "INTERNAÇÃO DOMICILIAR" },
  { codigo: "021", descricao: "INTERNAÇÃO HOSPITALAR" },
  { codigo: "022", descricao: "OFTALMOLOGIA" },
  { codigo: "023", descricao: "ATENÇÃO À SAÚDE DA MULHER" },
  { codigo: "024", descricao: "ATENÇÃO À SAÚDE DA CRIANÇA E DO ADOLESCENTE" },
  { codigo: "025", descricao: "ATENÇÃO À SAÚDE DO IDOSO" },
  { codigo: "026", descricao: "ATENÇÃO ÀS DOENÇAS CRÔNICAS" },
  { codigo: "027", descricao: "MEDICINA NUCLEAR IN VIVO" },
  { codigo: "028", descricao: "RADIOTERAPIA" },
  { codigo: "029", descricao: "TRANSPLANTES" },
  { codigo: "030", descricao: "VIGILÂNCIA EPIDEMIOLÓGICA" },
];

const SCOPE_MARKDOWN = `# Escopo do MCP mcp-cnes / MCP mcp-cnes Scope

## 🇧🇷 O que este MCP faz

O \`@mcpassure/mcp-cnes\` permite que agentes de IA consultem dados oficiais do **CNES — Cadastro Nacional de Estabelecimentos de Saúde** através de um cache local SQLite sincronizado mensalmente via FTP DATASUS.

### Capacidades

- Buscar estabelecimentos de saúde por código CNES, nome, município (código IBGE) ou tipo
- Listar profissionais de saúde vinculados a um estabelecimento
- Listar leitos (UTI, clínicos, obstétricos, etc.) por estabelecimento
- Listar equipamentos cadastrados
- Listar serviços especializados oferecidos
- Prompts estruturados para perfil completo, mapeamento de rede municipal e análise de cobertura por UF

### O que NÃO faz

- **Não** retorna dados de pacientes ou prontuários
- **Não** cruza com sistemas SIH (Internações), SIA (Ambulatorial), ou outros sistemas do DATASUS
- **Não** fornece valores de procedimentos, tabelas de preços ou remuneração
- **Não** substitui consulta direta ao DATASUS para fins regulatórios, jurídicos ou de auditoria
- **Não** fornece disponibilidade em tempo real de leitos (os dados são do mês de referência do último sync)

### Disclaimer

Os dados são oficiais do DATASUS/Ministério da Saúde, extraídos via FTP público. Para garantir dados atualizados, execute \`npm run sync\` mensalmente. O uso deste MCP está sujeito aos termos de uso do DATASUS.

---

## 🇺🇸 What this MCP does

\`@mcpassure/mcp-cnes\` enables AI agents to query official data from the **CNES (Brazilian National Registry of Healthcare Establishments)** through a local SQLite cache synchronized monthly via DATASUS FTP.

### Capabilities

- Search healthcare establishments by CNES code, name, city (IBGE code), or type
- List healthcare professionals linked to an establishment
- List hospital beds (ICU, clinical, obstetric, etc.) per establishment
- List registered equipment
- List specialized services offered
- Structured prompts for complete facility profiles, municipal network mapping, and state-level coverage analysis

### What it does NOT do

- Does **not** return patient data or medical records
- Does **not** cross-reference SIH (Hospitalizations), SIA (Outpatient), or other DATASUS systems
- Does **not** provide procedure prices, billing tables, or payment data
- Does **not** replace direct DATASUS queries for regulatory, legal, or audit purposes
- Does **not** provide real-time bed availability (data reflects the last sync reference month)

### Disclaimer

Data is official from DATASUS/Ministry of Health, extracted via public FTP. To keep data current, run \`npm run sync\` monthly. Use of this MCP is subject to DATASUS terms of use.
`;

export function handleTiposEstabelecimento(uri: URL): ReadResourceResult {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({ tipos_estabelecimento: TIPOS_ESTABELECIMENTO }, null, 2),
      },
    ],
  };
}

export function handleCategoriasServicos(uri: URL): ReadResourceResult {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({ categorias_servicos: CATEGORIAS_SERVICOS }, null, 2),
      },
    ],
  };
}

export function handleScope(uri: URL): ReadResourceResult {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "text/markdown",
        text: SCOPE_MARKDOWN,
      },
    ],
  };
}
