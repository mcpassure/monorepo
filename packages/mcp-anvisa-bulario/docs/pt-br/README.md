# MCP ANVISA Bulário Eletrônico — Documentação PT-BR

## O que é

O `@vetrum/mcp-anvisa-bulario` é um servidor MCP que permite a agentes de IA consultarem o Bulário Eletrônico da ANVISA — a base oficial de bulas de medicamentos registrados no Brasil.

**Fonte de dados:** ANVISA (`consultas.anvisa.gov.br`) — dados públicos, sem PHI/PII.

## Instalação

```bash
npx -y @vetrum/mcp-anvisa-bulario
```

Compatível com Claude Desktop, Claude Code, VS Code Copilot, Cursor e qualquer cliente MCP-conforme.

## Tools

### buscar_por_nome

Busca medicamentos pelo nome comercial.

**Input:**
```json
{ "nome": "novalgina", "pagina": 1, "count": 10 }
```

**Output:**
```json
{
  "total": 3,
  "pagina": 1,
  "medicamentos": [
    {
      "numProcesso": "25351.929286/2003-37",
      "nomeProduto": "NOVALGINA",
      "empresa": "SANOFI-AVENTIS FARMACÊUTICA LTDA",
      "idBulaPacienteProtegido": "abc123..."
    }
  ]
}
```

### buscar_por_principio_ativo

Busca por DCB (Denominação Comum Brasileira) ou DCI.

```json
{ "principioAtivo": "dipirona sódica" }
```

### buscar_por_classe_terapeutica

```json
{ "classeTerapeutica": "antibiótico" }
```

### filtrar_por_tarja

```json
{ "tarja": "PRETA" }
```

Tarja PRETA = controle especial (psicotrópicos, entorpecentes). Requer receita especial com retenção.

### consultar_bula

Retorna dados completos incluindo links para PDF da bula.

```json
{ "numProcesso": "25351.929286/2003-37" }
```

**Output:**
```json
{
  "numProcesso": "25351.929286/2003-37",
  "nomeProduto": "NOVALGINA",
  "empresa": "SANOFI-AVENTIS",
  "tarja": "VERMELHA",
  "classesTerapeuticas": ["ANALGÉSICOS"],
  "principioAtivo": "dipirona sódica",
  "bulaPaciente": { "id": "abc...", "urlPdf": "https://..." },
  "bulaProfissional": { "id": "def...", "urlPdf": "https://..." }
}
```

### listar_apresentacoes

```json
{ "numProcesso": "25351.929286/2003-37" }
```

## Casos de uso reais

### Médico: validar antes de prescrever

> "Quais são as contraindicações da dipirona para pacientes com insuficiência renal?"

O agente usa `buscar_por_nome("dipirona")` → obtém numProcesso → `consultar_bula(numProcesso)` → retorna link do PDF com contraindicações.

### Farmacêutico: verificar tarja de dispensação

> "Este medicamento precisa de retenção de receita?"

O agente usa `consultar_bula(numProcesso)` e verifica o campo `tarja`. VERMELHA = retenção simples. PRETA = retenção especial.

### Dev healthtech: integrar catálogo de medicamentos

```typescript
// Via Claude SDK com MCP
const tools = client.listTools(); // inclui as 6 tools do Bulário
const result = await client.callTool("buscar_por_principio_ativo", { principioAtivo: "metformina" });
```

## ⚠️ Disclaimer

Este MCP é uma **fonte de consulta farmacêutica oficial (ANVISA)**. **Não substitui avaliação, diagnóstico ou prescrição por profissional de saúde habilitado.** Use com supervisão profissional.
