import type { IBularioRepository } from "../domain/repository.js";

export const TARJAS_JSON = JSON.stringify(
  {
    tarjas: [
      {
        codigo: "sem_tarja",
        nome: "Sem tarja",
        descricao: "Venda livre — sem retenção de receita.",
      },
      {
        codigo: "amarela",
        nome: "Tarja Amarela",
        descricao: "Venda sob prescrição — antibióticos e outros medicamentos sujeitos a controle.",
      },
      {
        codigo: "vermelha",
        nome: "Tarja Vermelha",
        descricao: "Venda sob prescrição médica — receita simples retida.",
      },
      {
        codigo: "preta",
        nome: "Tarja Preta",
        descricao: "Controle especial — Portaria 344/98 (psicotrópicos, entorpecentes).",
      },
    ],
    fonte: "RDC ANVISA 357/2020 e Portaria SVS/MS 344/1998",
  },
  null,
  2
);

const CLASSES_TERAPEUTICAS_HARDCODED = [
  "Analgésico",
  "Anti-inflamatório",
  "Antibiótico",
  "Antifúngico",
  "Antiviral",
  "Antiparasitário",
  "Anti-hipertensivo",
  "Antidiabético",
  "Anticoagulante",
  "Antiarrítmico",
  "Diurético",
  "Broncodilatador",
  "Corticosteroide",
  "Imunossupressor",
  "Antineoplásico",
  "Ansiolítico",
  "Antidepressivo",
  "Antipsicótico",
  "Antiepiléptico",
  "Antiparkinsônico",
  "Opiáceo",
  "Psicotrópico",
  "Hormônio",
  "Anticoncepcional",
  "Vitamina e Suplemento",
  "Gastroprotetores",
  "Antiácido",
  "Antiemético",
  "Laxante",
  "Antidiarreico",
  "Hipnótico",
  "Relaxante Muscular",
  "Imunomodulador",
  "Vacina",
  "Hemostático",
  "Antialérgico",
  "Descongestionante",
  "Mucolítico",
  "Antitussígeno",
  "Dermatológico",
  "Oftálmico",
  "Otológico",
  "Antisséptico",
];

export async function getClassesTerapeuticasJson(_repository: IBularioRepository): Promise<string> {
  return JSON.stringify(
    {
      classes_terapeuticas: CLASSES_TERAPEUTICAS_HARDCODED.sort(),
      total: CLASSES_TERAPEUTICAS_HARDCODED.length,
      fonte: "Bulário Eletrônico ANVISA — principais classes indexadas",
      nota: "Lista representativa. Consulte o Bulário ANVISA para listagem completa atualizada.",
    },
    null,
    2
  );
}

export const SCOPE_MARKDOWN = `# Escopo do MCP @mcpassure/mcp-anvisa-bulario

## 🇧🇷 Português (BR)

### O que este MCP faz

Consulta ao **Bulário Eletrônico da ANVISA** (Agência Nacional de Vigilância Sanitária), incluindo:

- Busca de medicamentos por nome comercial, princípio ativo, classe terapêutica ou tarja
- Recuperação de bulas (paciente e profissional) em PDF via número de registro ANVISA
- Listagem de apresentações comerciais (concentração, forma farmacêutica, fabricante)
- Filtragem por tarja regulatória (Livre, Vermelha, Preta)
- Transport Playwright resistente a proteção Cloudflare do portal ANVISA
- Cache local SQLite para redução de latência e requisições repetidas

### O que este MCP NÃO faz

- ❌ Não substitui consulta direta à ANVISA para fins regulatórios oficiais
- ❌ Não fornece preços de medicamentos (consulte CMED/ANVISA)
- ❌ Não verifica interações medicamentosas
- ❌ Não emite receitas ou laudos médicos
- ❌ Não cobre medicamentos fitoterápicos, cosméticos ou saneantes
- ❌ Não acessa dados de farmacovigilância ou notificações de eventos adversos

### ⚠️ Disclaimer regulatório

Dados obtidos do Bulário Eletrônico ANVISA com latência de cache configurável.
**Decisões clínicas ou regulatórias devem sempre utilizar a fonte ANVISA oficial e atualizada.**

Medicamentos sob **Tarja Preta** (Portaria SVS/MS 344/1998) estão sujeitos a controle especial —
psicotrópicos, entorpecentes, precursores e outras substâncias de controle especial.
O uso inadequado é crime previsto em lei.

---

## 🇺🇸 English

### What this MCP does

Queries the **ANVISA Electronic Drug Information Database** (Brazilian Health Regulatory Agency), including:

- Search medications by trade name, active ingredient (INN/DCB), therapeutic class, or controlled-substance tier
- Retrieve patient and prescriber leaflets (bulas) in PDF via ANVISA registration number
- List commercial presentations (dosage, pharmaceutical form, manufacturer)
- Filter by regulatory tier (Sem Tarja/OTC, Tarja Vermelha/Rx, Tarja Preta/controlled)
- Cloudflare-resistant Playwright transport for the ANVISA portal
- Local SQLite cache to reduce latency on repeated queries

### What this MCP does NOT do

- ❌ Does not replace official ANVISA consultation for regulatory compliance
- ❌ Does not provide drug pricing (see CMED/ANVISA)
- ❌ Does not check drug interactions
- ❌ Does not issue prescriptions or medical reports
- ❌ Does not cover phytotherapeutics, cosmetics, or sanitizers
- ❌ Does not access pharmacovigilance data or adverse event reports

### ⚠️ Regulatory disclaimer

Data sourced from the ANVISA Electronic Drug Information Database with configurable cache latency.
**Clinical or regulatory decisions must always use the official and up-to-date ANVISA source.**

Medications classified as **Tarja Preta** (Black-banded — controlled substance under Brazilian
Ordinance SVS/MS 344/1998) are subject to special control — psychotropics, narcotics, precursors,
and other controlled substances. Misuse is a criminal offense under Brazilian law.
`;
