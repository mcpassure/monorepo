/loop continuar executando as instruções, da Etapa 1 até finalizar a Etapa 6, pausando entre etapas para validação e nunca pulando uma etapa sem completar a anterior.

# Complemento `mcp-tuss` — restrições R13–R16 (Protocolo MCP completo + apresentação institucional)

> **Contexto deste prompt:** o MCP `@mcpassure/mcp-tuss` já está funcional após execução do prompt `loop-tuss-onda1.md`. As 4 tools estão registradas, sync rodou, integration tests passam, build compila, canary funciona. Este prompt é **complementar** — aplica as restrições R13, R14, R15 e R16 que vieram do benchmarking com `licinexus-mcp` em 2026-05-14 e não estavam na versão antiga do prompt de onda.
>
> **Não duplica trabalho.** Não toca em src/db, src/domain, src/repositories, src/sync, src/tools (apenas adiciona referências em src/index.ts e src/server.ts conforme necessário). Não altera o sync, o canary, nem o package.json (apenas adiciona scripts e dependências mínimas se necessário).

**Pasta local:** `D:\ambiente_github\projetos pessoais\MCPAssure\3- mcp- TUSS  CBHPM  Rol ANS\`

## O que já existe (não tocar, apenas usar)

- `src/server.ts` — cria McpServer e registra 4 tools (`buscar_procedimento_tuss`, `buscar_medicamento_tuss`, `buscar_diaria_taxa_tuss`, `status_sincronizacao_tuss`)
- `src/index.ts` — entrypoint stdio
- `src/repositories/tuss.repository.ts` — TussRepository
- `src/tools/*.ts` — handlers das tools
- `tuss_real.db` populado com dados oficiais da ANS
- `integration-tests/bin/01..13-*.ts` — 13 cenários de integração
- `scripts/canary.ts` — canário contra fonte oficial
- `README.md` em PT-BR
- `package.json` na versão `0.1.0` com deps locked

## O que falta implementar (objetivo deste loop)

1. **R13 — Prompts MCP** (3 prompts em `src/prompts/`)
2. **R14 — Resources MCP** (3 resources em `src/resources/`)
3. **R15 — `server.json` na raiz** seguindo schema oficial Anthropic
4. **R16 parte 1 — `README.en.md`** + badge bilíngue 🇧🇷/🇺🇸 no topo de ambos READMEs
5. **R16 parte 2 — Demo GIF** via `scripts/demo.ts` + `.github/assets/demo.tape` + `.github/assets/demo.gif`
6. **Validação final** — DoD complementar verde

## Restrições operacionais

- **NÃO** rodar `git add`, `git commit`, `git push`, `git tag` ou `gh release`. Daniel faz manualmente após validar.
- **NÃO** bumpar `package.json` version. Continua em `0.1.0` até Daniel decidir.
- **NÃO** mexer no `src/server.ts` exceto pra acrescentar `registerPrompts(server, repo)` e `registerResources(server, repo)` no final, antes do `return server`. Não alterar as 4 tools existentes.
- **NÃO** mexer no canary, sync, ou integration tests existentes.
- **Reportar cada etapa concluída** com: arquivos criados/modificados, output dos comandos validadores, sinal claro "Etapa N completa, prosseguindo para N+1".

---

## Etapa 1 — Prompts MCP (R13)

Implementar 3 prompts MCP em `src/prompts/`.

### 1.1 — Criar `src/prompts/schemas.ts`

Schemas Zod para inputs dos prompts. Estrutura:

```ts
import { z } from "zod";

export const VerificarCodigoTussInput = z.object({
  codigo: z.string().regex(/^\d+$/, "Código TUSS deve ser numérico"),
  tabela: z.enum(["18", "20", "22"]).optional().describe("Tabela TUSS: 18 (diárias/taxas), 20 (medicamentos), 22 (procedimentos). Se omitida, busca em todas."),
});
export type VerificarCodigoTussInputType = z.infer<typeof VerificarCodigoTussInput>;

export const MapearCategoriaProcedimentosInput = z.object({
  termo: z.string().min(3, "Termo deve ter ao menos 3 caracteres"),
  limite: z.number().int().min(1).max(50).default(20),
});
export type MapearCategoriaProcedimentosInputType = z.infer<typeof MapearCategoriaProcedimentosInput>;

export const AnalisarCompatibilidadeCodigosInput = z.object({
  codigos: z.array(z.string().regex(/^\d+$/)).min(2).max(20),
});
export type AnalisarCompatibilidadeCodigosInputType = z.infer<typeof AnalisarCompatibilidadeCodigosInput>;
```

### 1.2 — Criar `src/prompts/handlers.ts`

Implementar 3 prompts. Cada prompt recebe input parsed + repository e retorna PromptMessage[] (estrutura do MCP SDK).

**Prompt 1 — `verificar_codigo_tuss`**

- Recebe `codigo` + `tabela?`
- Se `tabela` fornecida: chama o handler correspondente (buscar_procedimento, buscar_medicamento, buscar_diaria). Se omitida: chama os 3 e consolida.
- Retorna PromptMessage com texto formatado: "Código X (Tabela Y): [descrição]. Vigência: [data]. Categoria: [...]".
- Se não encontrar: "Código X não localizado em nenhuma tabela TUSS sincronizada. Última atualização local: [data]."

**Prompt 2 — `mapear_categoria_procedimentos`**

- Recebe `termo` + `limite`
- Busca por descrição em todas as 3 tabelas
- Agrupa resultados por tabela
- Retorna PromptMessage formatada: lista por tabela com até `limite` itens cada
- Inclui meta: total encontrado, modo (cache_local/cache_vazio)

**Prompt 3 — `analisar_compatibilidade_codigos`**

- Recebe `codigos[]` (lista de 2-20 códigos)
- Pra cada código: identifica em qual tabela existe (se existe)
- Retorna PromptMessage estruturada: mapa código → tabela → descrição
- Identifica códigos órfãos (não localizados)
- Útil pra validar XMLs TISS ou listas de procedimentos antes de submissão

### 1.3 — Criar `src/prompts/index.ts`

Função `registerPrompts(server: McpServer, repo: TussRepository)` que registra os 3 prompts via `server.prompt(...)`.

Exemplo de assinatura (consultar `@modelcontextprotocol/sdk` v1.29 — pode ser `server.prompt(name, description, schema, handler)` ou via `setRequestHandler` com `ListPromptsRequestSchema` e `GetPromptRequestSchema`):

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TussRepository } from "../repositories/tuss.repository.js";
import {
  VerificarCodigoTussInput,
  MapearCategoriaProcedimentosInput,
  AnalisarCompatibilidadeCodigosInput,
} from "./schemas.js";
import {
  verificarCodigoTussHandler,
  mapearCategoriaProcedimentosHandler,
  analisarCompatibilidadeCodigosHandler,
} from "./handlers.js";

export function registerPrompts(server: McpServer, repo: TussRepository): void {
  server.prompt(
    "verificar_codigo_tuss",
    "Verifica um código TUSS específico e retorna descrição, vigência e categoria.",
    VerificarCodigoTussInput.shape,
    async (input) => verificarCodigoTussHandler(VerificarCodigoTussInput.parse(input), repo)
  );
  // ... outros 2
}
```

### 1.4 — Editar `src/server.ts`

Adicionar import e chamada após registrar tools, antes do `return server`:

```ts
import { registerPrompts } from "./prompts/index.js";
// ... dentro de createServer, após o último server.tool(...)
registerPrompts(server, repo);
```

### 1.5 — Criar `tests/prompts/handlers.test.ts`

Testes unitários com banco em memória populado. Mínimo 6 testes (2 por prompt: caso feliz + caso de erro/vazio).

**Validação Etapa 1:**

```
npm run typecheck   # 0 erros
npm run test        # todos os testes verdes, incluindo novos
npm run lint        # 0 erros
```

E inspeção manual: `npx @modelcontextprotocol/inspector node dist/index.js` (após `npm run build`) deve listar os 3 prompts na aba "Prompts".

---

## Etapa 2 — Resources MCP (R14)

Implementar 3 resources MCP em `src/resources/`.

### 2.1 — Criar `src/resources/handlers.ts`

Implementar 3 resources estáticos retornando conteúdo direto (não consultam DB, são metadados/documentação):

**Resource 1 — `tuss://tabelas_disponiveis`**

- MIME type: `application/json`
- Conteúdo:
  ```json
  {
    "tabelas": [
      { "numero": "18", "nome": "Diárias, Taxas e Gases Medicinais", "fonte": "ANS", "atualizacao": "mensal" },
      { "numero": "20", "nome": "Medicamentos", "fonte": "ANS", "atualizacao": "mensal" },
      { "numero": "22", "nome": "Procedimentos e Eventos em Saúde", "fonte": "ANS", "atualizacao": "trimestral" }
    ]
  }
  ```

**Resource 2 — `tuss://categorias`**

- MIME type: `application/json`
- Conteúdo: lista de categorias principais cobertas em cada tabela (consultar o repository pra extrair categorias distintas se a coluna existir; senão, lista estática curada).

**Resource 3 — `tuss://scope`**

- MIME type: `text/markdown`
- Conteúdo: documento curto bilíngue (PT-BR primeiro, EN depois) descrevendo:
  - **O que este MCP faz**: consulta às 3 tabelas TUSS oficiais da ANS, cache local SQLite, latência < 5ms
  - **O que NÃO faz**: não valida XML TISS, não traduz CBHPM ↔ TUSS, não consulta histórico de procedimentos por paciente, não faz cálculo de valores de tabelas privadas (CBHPM)
  - **Disclaimer**: dados oficiais ANS, atualizar via `npm run sync`, sem garantia de aderência regulatória, consultar fonte oficial pra decisões

### 2.2 — Criar `src/resources/index.ts`

Função `registerResources(server: McpServer, repo: TussRepository)` que registra os 3 resources via `server.resource(...)` ou `setRequestHandler(ListResourcesRequestSchema, ...)` + `setRequestHandler(ReadResourceRequestSchema, ...)`.

### 2.3 — Editar `src/server.ts`

Adicionar import e chamada após `registerPrompts`:

```ts
import { registerResources } from "./resources/index.js";
// ... após registerPrompts
registerResources(server, repo);
```

### 2.4 — Criar `tests/resources/handlers.test.ts`

Testes unitários: 3 testes (1 por resource), validando URI correta + MIME type + conteúdo retornado.

**Validação Etapa 2:**

```
npm run typecheck   # 0 erros
npm run test        # todos verdes
npm run lint        # 0 erros
```

E inspeção manual: MCP Inspector deve listar os 3 resources na aba "Resources" e cada um deve abrir conteúdo válido.

---

## Etapa 3 — `server.json` (R15)

Criar `server.json` na raiz do projeto seguindo o schema oficial do MCP Registry da Anthropic.

### 3.1 — Criar `server.json`

Estrutura completa:

```json
{
  "$schema": "https://modelcontextprotocol.io/server.schema.json",
  "name": "@mcpassure/mcp-tuss",
  "description": {
    "pt-BR": "Consulta as tabelas TUSS oficiais da ANS (procedimentos, medicamentos, diárias/taxas) via cache local SQLite com latência < 5ms. Parte do catálogo MCPAssure.",
    "en-US": "Query official TUSS tables from Brazilian ANS (procedures, medications, hospital fees) via local SQLite cache with < 5ms latency. Part of the MCPAssure catalog."
  },
  "version": "0.1.0",
  "license": "MIT",
  "repository": "https://github.com/mcpassure/mcp-tuss",
  "homepage": "https://github.com/mcpassure/mcp-tuss",
  "author": {
    "name": "MCPAssure Brasil",
    "url": "https://github.com/mcpassure"
  },
  "categories": ["healthcare", "brazilian-public-data", "regulated-data"],
  "keywords": ["tuss", "ans", "saude-suplementar", "saude", "healthtech", "brasil", "mcpassure"],
  "runtime": {
    "node": ">=22.0.0"
  },
  "transports": ["stdio"],
  "tools": [
    { "name": "buscar_procedimento_tuss", "description": "Busca procedimentos médicos na Tabela 22 do TUSS." },
    { "name": "buscar_medicamento_tuss", "description": "Busca medicamentos na Tabela 20 do TUSS." },
    { "name": "buscar_diaria_taxa_tuss", "description": "Busca diárias e taxas hospitalares na Tabela 18 do TUSS." },
    { "name": "status_sincronizacao_tuss", "description": "Retorna status do cache local TUSS." }
  ],
  "prompts": [
    { "name": "verificar_codigo_tuss", "description": "Verifica um código TUSS específico." },
    { "name": "mapear_categoria_procedimentos", "description": "Busca procedimentos por descrição agrupados por tabela." },
    { "name": "analisar_compatibilidade_codigos", "description": "Valida lista de códigos TUSS e identifica tabela de origem." }
  ],
  "resources": [
    { "uri": "tuss://tabelas_disponiveis", "description": "Lista de tabelas TUSS cobertas e periodicidade de atualização." },
    { "uri": "tuss://categorias", "description": "Categorias principais por tabela TUSS." },
    { "uri": "tuss://scope", "description": "Escopo do MCP (PT/EN), disclaimer e limitações." }
  ],
  "install": {
    "npm": "@mcpassure/mcp-tuss"
  }
}
```

**Validação Etapa 3:**

```
npx -y ajv-cli validate -s https://modelcontextprotocol.io/server.schema.json -d server.json
```

(Se o schema não estiver acessível ou validador falhar por rede, validar manualmente que o JSON parseia e tem todos os campos obrigatórios.)

---

## Etapa 4 — README bilíngue (R16 parte 1)

### 4.1 — Atualizar `README.md` (PT-BR)

Adicionar no topo do arquivo, ANTES do `# @mcpassure/mcp-tuss`, o badge bilíngue:

```markdown
**🇧🇷 Português (BR) · [🇺🇸 English](./README.en.md)**

---
```

### 4.2 — Criar `README.en.md`

Tradução fiel do `README.md` mantendo:

- Estrutura idêntica
- Mesmas seções: Installation, First sync, Tools, Prompts, Resources, Environment variables, Disclaimer, License, MCPAssure catalog
- Badge no topo invertido: `[🇧🇷 Português (BR)](./README.md) · **🇺🇸 English**`
- Termos técnicos brasileiros mantidos em PT entre parênteses na primeira ocorrência: TUSS (Brazilian Unified Healthcare Terminology), ANS (Brazilian National Supplementary Health Agency), TISS (Brazilian Health Insurance Information Exchange)
- Disclaimer adaptado pra contexto internacional
- Link de volta pro README.md em PT no rodapé

### 4.3 — Atualizar `README.md` (PT-BR) — seções faltantes

Adicionar (se ainda não existem) seções:

- `## Prompts` — listando os 3 prompts (nome, descrição, exemplo de uso)
- `## Resources` — listando os 3 resources (URI, descrição, exemplo de leitura)
- `## Demo` — embedando GIF: `![Demo](./.github/assets/demo.gif)` (será criado na Etapa 5)

**Validação Etapa 4:**

- `README.md` tem badge bilíngue no topo
- `README.en.md` existe e renderiza corretamente em preview Markdown
- Ambos têm seções de Prompts e Resources
- Links internos `(./README.en.md)` e `(./README.md)` funcionam

---

## Etapa 5 — Demo GIF (R16 parte 2)

### 5.1 — Criar `scripts/demo.ts`

Script tsx que:

1. Inicializa servidor MCP local em modo stdio mockado (ou usa o repositório direto sem subir transport)
2. Faz 4 chamadas reais sequenciais com pausa de 1.5s entre elas:
   - `buscar_procedimento_tuss({ codigo: "30602165" })` (exemplo de código real)
   - `buscar_medicamento_tuss({ termo: "paracetamol" })`
   - `analisar_compatibilidade_codigos({ codigos: ["30602165", "00000000", "20203016"] })` (mistura código válido com inválido)
   - `status_sincronizacao_tuss({})`
3. Imprime resultado estruturado com cores no terminal (usar `picocolors` que é zero-dep e leve, ou ANSI escapes diretos pra não adicionar dep)
4. Termina com sucesso

### 5.2 — Adicionar dep mínima

Se usar `picocolors`:

```json
"devDependencies": {
  ...
  "picocolors": "^1.1.1"
}
```

Senão, ANSI escapes inline. Preferir inline pra não adicionar dep.

### 5.3 — Adicionar script no `package.json`

```json
"scripts": {
  ...
  "demo": "tsx scripts/demo.ts"
}
```

### 5.4 — Criar `.github/assets/demo.tape`

Arquivo `.tape` do **vhs** (charmbracelet/vhs) configurado pra gravar a execução de `npm run demo`:

```
Output .github/assets/demo.gif

Set FontSize 14
Set Width 1200
Set Height 700
Set Theme "Dracula"
Set TypingSpeed 30ms
Set PlaybackSpeed 1.0

Type "npm run demo"
Enter
Sleep 25s
```

(Ajustar `Sleep` conforme tempo real de execução — alvo: GIF de 20-28 segundos.)

### 5.5 — Gerar `.github/assets/demo.gif`

Rodar:

```
vhs .github/assets/demo.tape
```

(Vhs precisa estar instalado: `brew install vhs` no Mac, `winget install charmbracelet.vhs` no Windows. Se vhs não estiver disponível no ambiente do /loop, marcar como pendência manual e seguir com o resto.)

### 5.6 — Verificar README.md e README.en.md

Confirmar que ambos têm `![Demo](./.github/assets/demo.gif)` na seção apropriada e que o GIF existe no caminho indicado.

**Validação Etapa 5:**

- `scripts/demo.ts` roda sem erro: `npm run demo`
- `.github/assets/demo.tape` existe e tem sintaxe vhs válida
- `.github/assets/demo.gif` existe (ou pendência manual documentada)
- READMEs referenciam o GIF corretamente

---

## Etapa 6 — Validação final (DoD complementar)

Executar TODOS os comandos abaixo em sequência e reportar output de cada um:

```
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run build
npm run demo
```

E inspecionar manualmente:

```
npx @modelcontextprotocol/inspector node dist/index.js
```

Critérios de aceitação (TODOS verdes):

**Prompts (R13):**
- [ ] `src/prompts/schemas.ts` existe e tem 3 schemas Zod
- [ ] `src/prompts/handlers.ts` existe e tem 3 handlers
- [ ] `src/prompts/index.ts` registra os 3 prompts
- [ ] `src/server.ts` chama `registerPrompts(server, repo)`
- [ ] `tests/prompts/handlers.test.ts` tem ≥ 6 testes, todos verdes
- [ ] MCP Inspector lista os 3 prompts

**Resources (R14):**
- [ ] `src/resources/handlers.ts` existe e tem 3 handlers
- [ ] `src/resources/index.ts` registra os 3 resources
- [ ] `src/server.ts` chama `registerResources(server, repo)`
- [ ] `tests/resources/handlers.test.ts` tem ≥ 3 testes, todos verdes
- [ ] MCP Inspector lista os 3 resources, conteúdo carrega

**`server.json` (R15):**
- [ ] `server.json` existe na raiz
- [ ] Parseia como JSON válido
- [ ] Contém descrição bilíngue (pt-BR + en-US)
- [ ] Lista as 4 tools, 3 prompts e 3 resources
- [ ] Schema, versão, licença, repositório preenchidos

**README bilíngue (R16 parte 1):**
- [ ] `README.md` tem badge bilíngue no topo apontando pra `README.en.md`
- [ ] `README.en.md` existe e tem badge invertido
- [ ] Ambos READMEs têm seções de Prompts e Resources documentadas
- [ ] Ambos têm seção de Demo referenciando o GIF

**Demo GIF (R16 parte 2):**
- [ ] `scripts/demo.ts` existe e roda sem erro
- [ ] Script `demo` adicionado ao `package.json`
- [ ] `.github/assets/demo.tape` existe
- [ ] `.github/assets/demo.gif` existe (ou pendência manual documentada com instrução pra Daniel rodar `vhs .github/assets/demo.tape`)

**Não regredir o que já estava pronto:**
- [ ] `npm run typecheck` continua 0 erros
- [ ] `npm run lint` continua 0 erros
- [ ] `npm run test` continua 100% verde (incluindo os novos)
- [ ] `npm run test:integration` continua 100% verde
- [ ] `npm run build` compila sem erro
- [ ] `package.json` continua em versão `0.1.0`
- [ ] `src/server.ts` ainda tem as 4 tools originais funcionando

**Saída esperada da Etapa 6:** relatório curto (markdown) com:

1. Status de cada critério (✅/❌)
2. Output bruto dos comandos validadores
3. Lista de arquivos criados (relativo à raiz do projeto)
4. Pendências manuais (se houver — ex: vhs não disponível pra gerar GIF)
5. Próximo passo sugerido (Daniel decide: commit + tag + npm publish + submit ao MCP Registry oficial)

---

## Lembrete final

Esse complemento existe pra **alinhar o TUSS com o padrão revisado do catálogo MCPAssure** após benchmarking com `licinexus-mcp`. Depois desse loop verde, o TUSS terá:

- 4 tools (já tinha)
- 3 prompts MCP (R13 — novo)
- 3 resources MCP (R14 — novo)
- `server.json` no padrão do MCP Registry oficial Anthropic (R15 — novo)
- README bilíngue PT-BR + EN-US com badges (R16 — novo)
- Demo GIF embedado (R16 — novo)

Que é exatamente o padrão completo que o `licinexus-mcp` v0.1.1 trouxe e que MCPAssure não tinha. A partir daqui, **toda nova onda usa o prompt revisado** `loop-tuss-onda1.md` (que já incorpora R1–R16) — esse complemento só existe pra fechar o TUSS retroativamente.

**Cuidadoso > rápido.** Se algo do que já existia quebrar, é regressão — voltar a etapa.
