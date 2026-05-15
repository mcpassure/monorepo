/loop continuar executando as instruções, da Etapa 1 até finalizar a Etapa 6, pausando entre etapas para validação e nunca pulando uma etapa sem completar a anterior.

# Complemento `mcp-cnes` — restrições R13–R16 (Protocolo MCP completo + apresentação institucional)

> **Contexto deste prompt:** o MCP `@mcpassure/mcp-cnes` já está em produção (v1.1.2). As 8 tools estão registradas, sync rodou via FTP DATASUS, integration tests passam, build compila, canary funciona. Este prompt é **complementar** — aplica as restrições R13, R14, R15 e R16 que vieram do benchmarking com `licinexus-mcp` em 2026-05-14.
>
> **Não duplica trabalho.** Não toca em src/db, src/domain, src/sources, src/sync, src/tools, src/fallback (apenas adiciona referências em src/server.ts conforme necessário). Não altera sync, canary, package.json (apenas adiciona scripts e dependências mínimas).

**Pasta local:** `D:\ambiente_github\projetos pessoais\MCPAssure\2-mcp-CNES\`

## O que já existe (não tocar, apenas usar)

- `src/server.ts` — cria McpServer v1.1.0 e registra 8 tools:
  - `buscar_por_codigo_cnes`, `buscar_por_nome`, `buscar_por_municipio`, `buscar_por_tipo`
  - `listar_profissionais`, `listar_leitos`, `listar_equipamentos`, `listar_servicos`
- `src/index.ts` — entrypoint stdio
- `src/domain/repository.ts` — `CnesRepository` com lógica de query SQLite
- `src/tools/*.ts` — cada arquivo exporta `registerXxx(server, repo)`
- `src/sync/` — sync via FTP DATASUS com `basic-ftp` + decompressão DBC
- `tests/`, `integration-tests/` — cobertura existente
- `scripts/canary.ts` — canário diário contra FTP DATASUS
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `STATUS.md` em PT-BR
- `package.json` em `1.1.2`

## O que falta implementar (objetivo deste loop)

1. **R13 — Prompts MCP** (3 prompts em `src/prompts/`)
2. **R14 — Resources MCP** (3 resources em `src/resources/`)
3. **R15 — `server.json` na raiz** seguindo schema oficial Anthropic
4. **R16 parte 1 — `README.en.md`** + badge bilíngue 🇧🇷/🇺🇸 no topo de ambos READMEs
5. **R16 parte 2 — Demo GIF** via `scripts/demo.ts` + `.github/assets/demo.tape` + `.github/assets/demo.gif`
6. **Validação final** — DoD complementar verde

## Restrições operacionais

- **NÃO** rodar `git add`, `git commit`, `git push`, `git tag` ou `gh release`. Daniel faz manualmente após validar.
- **NÃO** bumpar `package.json` version. Continua em `1.1.2` até Daniel decidir.
- **NÃO** mexer em `src/server.ts` exceto pra acrescentar `registerPrompts(server, repo)` e `registerResources(server, repo)` no final, antes do `return server`. Não alterar as 8 tools existentes.
- **NÃO** mexer no canary, sync, fallback ou integration tests existentes.
- Traduzir documentação institucional existente (CONTRIBUTING, SECURITY, CODE_OF_CONDUCT) **NÃO** faz parte deste loop — apenas README.

---

## Etapa 1 — Prompts MCP (R13)

Implementar 3 prompts em `src/prompts/` relevantes ao domínio CNES (estabelecimentos de saúde).

### 1.1 — Criar `src/prompts/schemas.ts`

```ts
import { z } from "zod";

export const PerfilEstabelecimentoInput = z.object({
  codigo_cnes: z.string().regex(/^\d{7}$/, "Código CNES deve ter 7 dígitos numéricos"),
  incluir_profissionais: z.boolean().default(true),
  incluir_leitos: z.boolean().default(true),
  incluir_equipamentos: z.boolean().default(true),
  incluir_servicos: z.boolean().default(true),
});
export type PerfilEstabelecimentoInputType = z.infer<typeof PerfilEstabelecimentoInput>;

export const MapearRedeMunicipioInput = z.object({
  municipio: z.string().min(2, "Nome ou código IBGE do município"),
  uf: z.string().length(2).optional().describe("UF (2 letras) — necessária se houver homônimos"),
  tipo_estabelecimento: z.string().optional().describe("Filtra por tipo (ex: Hospital Geral, UBS, UPA)"),
  limite: z.number().int().min(1).max(200).default(50),
});
export type MapearRedeMunicipioInputType = z.infer<typeof MapearRedeMunicipioInput>;

export const AnalisarCoberturaUfInput = z.object({
  uf: z.string().length(2),
  agrupar_por: z.enum(["tipo", "natureza", "esfera_administrativa"]).default("tipo"),
});
export type AnalisarCoberturaUfInputType = z.infer<typeof AnalisarCoberturaUfInput>;
```

### 1.2 — Criar `src/prompts/handlers.ts`

**Prompt 1 — `perfil_estabelecimento`**

- Recebe `codigo_cnes` + flags de seções
- Chama `buscar_por_codigo_cnes` + (opcionalmente) `listar_profissionais`, `listar_leitos`, `listar_equipamentos`, `listar_servicos` filtrando por esse CNES
- Consolida em PromptMessage estruturada: "Estabelecimento [nome] (CNES: X) — Tipo: Y, Município: Z/UF. Profissionais: N. Leitos: N. Equipamentos: N. Serviços oferecidos: [...]"
- Se não encontrar: "Código CNES X não localizado no cache local. Última sincronização: [data]."

**Prompt 2 — `mapear_rede_municipio`**

- Recebe `municipio` (nome ou código IBGE) + `uf?` + `tipo_estabelecimento?` + `limite`
- Chama `buscar_por_municipio` (com filtro opcional por tipo)
- Agrupa por tipo de estabelecimento e natureza jurídica
- Retorna PromptMessage com mapa: "Rede de saúde de [município/UF]: X hospitais, Y UBS, Z UPAs, ..."
- Inclui contagem por natureza (público, privado, conveniado)

**Prompt 3 — `analisar_cobertura_uf`**

- Recebe `uf` + `agrupar_por`
- Chama `buscar_por_tipo` percorrendo tipos comuns OU faz query agregada via repository
- Retorna análise por UF: contagem de estabelecimentos por categoria escolhida
- Útil pra dimensionar oferta de saúde por estado

### 1.3 — Criar `src/prompts/index.ts`

`registerPrompts(server: McpServer, repo: CnesRepository)` registrando os 3 prompts.

### 1.4 — Editar `src/server.ts`

Adicionar import e chamada após o último `registerXxx(...)` de tool, antes do `return server`:

```ts
import { registerPrompts } from "./prompts/index.js";
// ... após registerListarServicos
registerPrompts(server, repo);
```

### 1.5 — Criar `tests/prompts/handlers.test.ts`

Mínimo 6 testes (2 por prompt: caso feliz + caso de erro/vazio).

**Validação Etapa 1:**

```
npm run typecheck
npm run test
npm run lint
```

E MCP Inspector: `npx @modelcontextprotocol/inspector node dist/index.js` deve listar os 3 prompts.

---

## Etapa 2 — Resources MCP (R14)

Implementar 3 resources em `src/resources/`.

### 2.1 — Criar `src/resources/handlers.ts`

**Resource 1 — `cnes://tipos_estabelecimento`**

- MIME: `application/json`
- Conteúdo: taxonomia oficial CNES de tipos de estabelecimento (Hospital Geral, Hospital Especializado, UBS, UPA, Centro de Saúde, Pronto Atendimento, Consultório, Clínica/Centro de Especialidade, Unidade de Apoio Diagnose e Terapia, Unidade Móvel, etc) com código e descrição

**Resource 2 — `cnes://categorias_servicos`**

- MIME: `application/json`
- Conteúdo: lista de categorias de serviços especializados (AMBULATORIAL, INTERNAÇÃO, URGÊNCIA E EMERGÊNCIA, DIAGNÓSTICO POR IMAGEM, LABORATÓRIO, FARMÁCIA, etc) extraída do banco ou hardcoded a partir da tabela oficial CNES

**Resource 3 — `cnes://scope`**

- MIME: `text/markdown`
- Conteúdo bilíngue (PT-BR primeiro, EN depois):
  - **O que este MCP faz**: consulta ao CNES (Cadastro Nacional de Estabelecimentos de Saúde), cache local SQLite, sync mensal via FTP DATASUS
  - **O que NÃO faz**: não retorna dados de pacientes, não cruza com SIH/SIA, não fornece valores de procedimentos, não substitui consulta direta ao DATASUS pra fins regulatórios
  - **Disclaimer**: dados oficiais DATASUS, atualizar via `npm run sync`

### 2.2 — Criar `src/resources/index.ts`

`registerResources(server, repo)` registrando os 3.

### 2.3 — Editar `src/server.ts`

Adicionar após `registerPrompts`:

```ts
import { registerResources } from "./resources/index.js";
// ... após registerPrompts
registerResources(server, repo);
```

### 2.4 — Criar `tests/resources/handlers.test.ts`

3 testes (1 por resource), validando URI + MIME + conteúdo.

**Validação Etapa 2:**

```
npm run typecheck
npm run test
npm run lint
```

MCP Inspector deve listar os 3 resources.

---

## Etapa 3 — `server.json` (R15)

### 3.1 — Criar `server.json` na raiz

```json
{
  "$schema": "https://modelcontextprotocol.io/server.schema.json",
  "name": "@mcpassure/mcp-cnes",
  "description": {
    "pt-BR": "Consulta ao CNES (Cadastro Nacional de Estabelecimentos de Saúde) via cache local SQLite. Permite buscar estabelecimentos por código, nome, município ou tipo, e listar profissionais, leitos, equipamentos e serviços. Parte do catálogo MCPAssure.",
    "en-US": "Query CNES (Brazilian National Registry of Healthcare Establishments) via local SQLite cache. Search establishments by code, name, city, or type, and list professionals, beds, equipment, and services. Part of the MCPAssure catalog."
  },
  "version": "1.1.2",
  "license": "MIT",
  "repository": "https://github.com/mcpassure/mcp-cnes",
  "homepage": "https://github.com/mcpassure/mcp-cnes",
  "author": {
    "name": "MCPAssure Brasil",
    "url": "https://github.com/mcpassure"
  },
  "categories": ["healthcare", "brazilian-public-data", "regulated-data"],
  "keywords": ["cnes", "datasus", "saude", "healthtech", "brasil", "mcpassure"],
  "runtime": { "node": ">=22.0.0" },
  "transports": ["stdio"],
  "tools": [
    { "name": "buscar_por_codigo_cnes", "description": "Busca estabelecimento de saúde por código CNES (7 dígitos)." },
    { "name": "buscar_por_nome", "description": "Busca estabelecimentos por nome (textual)." },
    { "name": "buscar_por_municipio", "description": "Busca estabelecimentos por município." },
    { "name": "buscar_por_tipo", "description": "Busca estabelecimentos por tipo (Hospital, UBS, UPA, etc)." },
    { "name": "listar_profissionais", "description": "Lista profissionais vinculados a um estabelecimento." },
    { "name": "listar_leitos", "description": "Lista leitos de um estabelecimento." },
    { "name": "listar_equipamentos", "description": "Lista equipamentos cadastrados em um estabelecimento." },
    { "name": "listar_servicos", "description": "Lista serviços oferecidos por um estabelecimento." }
  ],
  "prompts": [
    { "name": "perfil_estabelecimento", "description": "Consolida perfil completo de um estabelecimento CNES." },
    { "name": "mapear_rede_municipio", "description": "Mapeia rede de saúde de um município." },
    { "name": "analisar_cobertura_uf", "description": "Analisa cobertura de estabelecimentos por UF." }
  ],
  "resources": [
    { "uri": "cnes://tipos_estabelecimento", "description": "Taxonomia oficial de tipos de estabelecimento CNES." },
    { "uri": "cnes://categorias_servicos", "description": "Categorias de serviços especializados CNES." },
    { "uri": "cnes://scope", "description": "Escopo do MCP (PT/EN), disclaimer e limitações." }
  ],
  "install": { "npm": "@mcpassure/mcp-cnes" }
}
```

**Validação Etapa 3:** JSON parseia, todos os campos preenchidos.

---

## Etapa 4 — README bilíngue (R16 parte 1)

### 4.1 — Atualizar `README.md` (PT-BR)

Adicionar no topo, antes de `# @mcpassure/mcp-cnes`:

```markdown
**🇧🇷 Português (BR) · [🇺🇸 English](./README.en.md)**

---
```

Adicionar (se ainda não existem) seções `## Prompts`, `## Resources` e `## Demo` (com `![Demo](./.github/assets/demo.gif)`).

### 4.2 — Criar `README.en.md`

Tradução fiel mantendo estrutura. Badge invertido no topo:

```markdown
**[🇧🇷 Português (BR)](./README.md) · 🇺🇸 English**
```

Termos brasileiros mantidos em PT entre parênteses na 1ª ocorrência:
- CNES (Brazilian National Registry of Healthcare Establishments)
- DATASUS (Brazilian Public Health Data Department)
- SUS (Brazilian Unified Health System)
- UBS (Basic Health Unit), UPA (Emergency Care Unit)

**Validação Etapa 4:**
- Badge bilíngue topo de ambos
- Seções Prompts, Resources, Demo presentes
- Links internos funcionam

---

## Etapa 5 — Demo GIF (R16 parte 2)

### 5.1 — Criar `scripts/demo.ts`

Script tsx que faz 4 chamadas reais sequenciais com pausa de 1.5s entre elas (ANSI escapes inline, sem deps externas):

1. `buscar_por_codigo_cnes({ codigo_cnes: "2077485" })` (Hospital das Clínicas SP — exemplo público)
2. `buscar_por_municipio({ municipio: "São Paulo", uf: "SP" })` com limite 5
3. `listar_profissionais({ codigo_cnes: "2077485" })` com limite 10
4. Chama o prompt `perfil_estabelecimento({ codigo_cnes: "2077485" })`

Imprime resultado estruturado com cores no terminal.

### 5.2 — Adicionar script em `package.json`

```json
"demo": "tsx scripts/demo.ts"
```

### 5.3 — Criar `.github/assets/demo.tape`

```
Output .github/assets/demo.gif

Set FontSize 14
Set Width 1200
Set Height 700
Set Theme "Dracula"
Set TypingSpeed 30ms

Type "npm run demo"
Enter
Sleep 25s
```

### 5.4 — Gerar `.github/assets/demo.gif`

`vhs .github/assets/demo.tape`

Se vhs não disponível no ambiente do /loop, documentar como pendência manual e seguir.

**Validação Etapa 5:**
- `scripts/demo.ts` roda sem erro
- `.github/assets/demo.tape` existe
- `.github/assets/demo.gif` existe (ou pendência documentada)

---

## Etapa 6 — Validação final (DoD complementar)

Executar e reportar output:

```
npm run typecheck
npm run lint
npm run test
npm run test:integration:offline
npm run build
npm run demo
```

E inspecionar via `npx @modelcontextprotocol/inspector node dist/index.js`.

Critérios de aceitação (TODOS verdes):

**Prompts (R13):**
- [ ] `src/prompts/{schemas,handlers,index}.ts` existem
- [ ] `src/server.ts` chama `registerPrompts(server, repo)`
- [ ] `tests/prompts/handlers.test.ts` tem ≥ 6 testes verdes
- [ ] MCP Inspector lista os 3 prompts

**Resources (R14):**
- [ ] `src/resources/{handlers,index}.ts` existem
- [ ] `src/server.ts` chama `registerResources(server, repo)`
- [ ] `tests/resources/handlers.test.ts` tem ≥ 3 testes verdes
- [ ] MCP Inspector lista os 3 resources

**`server.json` (R15):**
- [ ] Existe na raiz, parseia, descrição bilíngue, lista 8 tools + 3 prompts + 3 resources

**README bilíngue (R16 parte 1):**
- [ ] Badge bilíngue em ambos
- [ ] Seções Prompts, Resources, Demo presentes em ambos

**Demo GIF (R16 parte 2):**
- [ ] `scripts/demo.ts` roda OK
- [ ] `.github/assets/demo.tape` existe
- [ ] `.github/assets/demo.gif` existe (ou pendência manual documentada)

**Não regredir:**
- [ ] Todos os comandos validadores continuam verdes
- [ ] `package.json` continua em `1.1.2`
- [ ] As 8 tools originais continuam registradas e funcionando

**Saída esperada:** relatório markdown com status de cada critério, output bruto dos comandos, arquivos criados, pendências manuais (se houver), próximo passo sugerido.

---

## Lembrete final

Esse complemento alinha o `mcp-cnes` com o padrão revisado do catálogo MCPAssure após benchmarking com `licinexus-mcp` v0.1.1. Depois desse loop verde:

- 8 tools (já tinha)
- 3 prompts MCP (R13 — novo)
- 3 resources MCP (R14 — novo)
- `server.json` no padrão MCP Registry oficial Anthropic (R15 — novo)
- README bilíngue PT-BR + EN-US com badges (R16 — novo)
- Demo GIF embedado (R16 — novo)

**Cuidadoso > rápido.** Se algo do que já existia quebrar, é regressão — voltar a etapa.
