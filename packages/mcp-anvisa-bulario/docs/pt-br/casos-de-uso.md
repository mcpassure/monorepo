# Casos de Uso — MCP ANVISA Bulário Eletrônico

## Caso 1: Médico — Verificar contraindicações antes de prescrever

**Cenário:** Um médico precisa verificar se dipirona pode ser prescrita para paciente com histórico de insuficiência renal.

**Conversa com agente IA:**

> "Quais são as contraindicações da dipirona para pacientes com insuficiência renal?"

**Fluxo do agente:**

1. Chama `buscar_por_principio_ativo` com `{ "principioAtivo": "dipirona sódica" }`
2. Recebe lista com `numProcesso` de cada produto registrado
3. Chama `consultar_bula` com o `numProcesso` de um produto relevante
4. Recebe link do PDF da bula profissional e dados estruturados do medicamento
5. Informa o médico que deve consultar a bula pelo link PDF para a seção de contraindicações

**Input/Output:**

```json
// Chamada 1
{ "principioAtivo": "dipirona sódica" }

// Resultado 1
{
  "total": 15,
  "pagina": 1,
  "medicamentos": [
    {
      "numProcesso": "25351.929286/2003-37",
      "nomeProduto": "NOVALGINA",
      "empresa": "SANOFI-AVENTIS FARMACÊUTICA LTDA",
      "idBulaPacienteProtegido": "abc123...",
      "idBulaProfissionalProtegido": "def456..."
    }
  ]
}

// Chamada 2
{ "numProcesso": "25351.929286/2003-37" }

// Resultado 2
{
  "numProcesso": "25351.929286/2003-37",
  "nomeProduto": "NOVALGINA",
  "empresa": "SANOFI-AVENTIS FARMACÊUTICA LTDA",
  "tarja": "VERMELHA",
  "classesTerapeuticas": ["ANALGÉSICOS E ANTIPIRÉTICOS"],
  "principioAtivo": "dipirona sódica",
  "bulaProfissional": {
    "id": "def456...",
    "urlPdf": "https://consultas.anvisa.gov.br/api/.../bula.pdf"
  }
}
```

---

## Caso 2: Farmacêutico — Verificar tarja de dispensação

**Cenário:** Um farmacêutico precisa confirmar se determinado medicamento requer retenção de receita.

**Conversa com agente IA:**

> "O medicamento Rivotril precisa de retenção especial de receita?"

**Fluxo do agente:**

1. Chama `buscar_por_nome` com `{ "nome": "rivotril" }`
2. Obtém o `numProcesso` do produto
3. Chama `consultar_bula` para verificar a `tarja`
4. Informa: PRETA = retenção especial (psicotrópico/entorpecente); VERMELHA = retenção simples; LIVRE = sem receita

**Referência de tarjas:**

| Tarja | Dispensação |
|---|---|
| `LIVRE` | Sem receita médica |
| `VERMELHA` | Requer receita médica simples, com retenção de 1ª via |
| `PRETA` | Controle especial — psicotrópicos e entorpecentes. Receita especial (notificação de receita) com retenção |

---

## Caso 3: Desenvolvedor healthtech — Integrar catálogo de medicamentos

**Cenário:** Uma plataforma de prontuário eletrônico quer listar apresentações disponíveis ao criar prescrição.

**Fluxo via MCP SDK:**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Listar apresentações do Amoxil para dropdown de prescrição
const result = await client.beta.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 1024,
  tools: [/* tools do MCP anvisa-bulario */],
  messages: [{
    role: "user",
    content: 'Liste todas as apresentações do Amoxil disponíveis na ANVISA.'
  }]
});

// O agente chama:
// 1. buscar_por_nome({ nome: "amoxil" }) → obtém numProcesso
// 2. listar_apresentacoes({ numProcesso: "..." }) → retorna formas/dosagens
```

**Output de `listar_apresentacoes`:**

```json
{
  "numProcesso": "...",
  "nomeProduto": "AMOXIL",
  "total": 4,
  "apresentacoes": [
    { "descricao": "500MG CAPSULAS, 21 UNIDADES" },
    { "descricao": "250MG/5ML PO PARA SUSP ORAL FR 60ML" },
    { "descricao": "500MG/5ML PO PARA SUSP ORAL FR 30ML" },
    { "descricao": "875MG COMPRIMIDOS, 14 UNIDADES" }
  ]
}
```

---

## Caso 4: Agente de farmácia de manipulação — Verificar classe terapêutica

**Cenário:** Verificar quais antibióticos estão registrados na ANVISA para fins de comparação.

**Chamada:**

```json
{ "classeTerapeutica": "antibiótico", "pagina": 1, "count": 20 }
```

**Nota:** A API ANVISA lista utiliza o mesmo campo de busca textual. Para resultados mais precisos por classe, use `buscar_por_principio_ativo` com o DCB/DCI específico do fármaco.

---

## ⚠️ Disclaimer

Este MCP é uma **fonte de consulta farmacêutica oficial (ANVISA)**. **Não substitui avaliação, diagnóstico ou prescrição por profissional de saúde habilitado.** Use sempre com supervisão profissional.
