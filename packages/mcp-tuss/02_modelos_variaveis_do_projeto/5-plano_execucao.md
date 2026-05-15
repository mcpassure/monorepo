# Plano de Execução — MCP TUSS / CBHPM / Rol ANS (Vetrum Brasil MCP 3)

## Overview

Implementação em 5 fases sequenciais de um servidor MCP TypeScript que expõe 7 tools de consulta às terminologias TUSS, CBHPM e Rol ANS. Cada fase produz código funcional e verificável antes de avançar para a próxima. Nenhuma fase deve ser iniciada sem que a anterior esteja verificada.

**Duração estimada:** 5 fases independentes, cada uma executável em uma sessão de trabalho.

---

## Current State Analysis

- Repositório: não existe ainda — criação do zero.
- Banco de dados: não existe — será criado na Fase 1.
- Dados: disponíveis no portal ANS como arquivos ZIP/XLSX públicos.
- MCPs 1 e 2: sem implementação de referência — este é o primeiro MCP Vetrum a ser implementado.
- Stack decidida no PRD: TypeScript + `@modelcontextprotocol/sdk` + `better-sqlite3` + `exceljs` + Vitest.

---

## Desired End State

- Repositório público `vetrum-tuss-mcp` com licença MIT.
- `npx vetrum-tuss-mcp` inicia o servidor MCP em stdio.
- 7 tools funcionais com `structuredContent` e annotations corretas.
- Banco SQLite com dados reais das Tabelas TUSS 18, 19, 20, 22 e correlação TUSS-ROL.
- 12 evals passando em CI.
- CI GitHub Actions: lint + typecheck + testes (incluindo evals com dados reais).
- Sync semanal automatizado via GitHub Actions.
- Publicado no registry MCP oficial, Smithery e Glama.

---

## Key Discoveries

1. A **planilha de correlação TUSS-ROL** é o artefato integrador central: 15 colunas (A-O), ~6.735 linhas, integrando código TUSS, descrição, cobertura por segmento, DUT, hierarquia CBHPM.
2. A **Tabela 19** (Materiais/OPME) tem ~300k+ registros — o maior dataset. FTS5 e ingestão em batches são obrigatórios.
3. A correlação XLSX **tem uma imagem embutida no cabeçalho** (identificado na inspeção do arquivo). O parser deve ignorar drawings e ler apenas as células de dados.
4. **Cabeçalho real começa na linha 8** da planilha de correlação — linhas 1-7 são título e formatação visual.
5. A CBHPM **não tem fonte pública estruturada** para porte anestésico/UCO — limitação documentada e fora do escopo.
6. O campo `sistema_fhir` da URL canônica `https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS` deve aparecer em toda resposta com código TUSS.
7. **Sem MCP de referência anterior** no catálogo Vetrum — este projeto define o padrão para os seguintes.

---

## What We're NOT Doing

- Não implementar porte anestésico nem UCO (dados AMB pagos).
- Não fazer passagem direta (proxy) para o servidor FHIR do MS em runtime.
- Não implementar integração com MCP 2 (CNES) — campo reservado no schema, sem lógica.
- Não incluir Tabelas TUSS além de 18, 19, 20 e 22.
- Não criar interface web, dashboard ou UI.
- Não implementar autenticação nem controle de acesso.
- Não versionar o arquivo `tuss.db` no git — apenas o schema e os scripts de ingestão.
- Não suportar múltiplos idiomas — PT-BR apenas.
- Não retornar preços, valoração nem honorários.
- Não implementar histórico de versões de procedimentos.

---

## Implementation Approach

Cada fase é independente e verificável:

| Fase | Nome | Entrega |
|---|---|---|
| 1 | Scaffold + Schema + Ingestão | Banco SQLite populado com dados reais |
| 2 | Tools core (busca e validação) | 4 tools funcionais |
| 3 | Tools complementares + status | 3 tools restantes |
| 4 | CI, evals e qualidade | Pipeline CI verde com 12 evals |
| 5 | Publicação e documentação | npm publicado + registries |

---

## Implementação Fase 1 — Scaffold, Schema e Ingestão

### Objetivo
Repositório criado com estrutura completa, banco SQLite funcional e pipeline de ingestão que baixa dados reais do ANS.

### Passos

**1.1 — Criar repositório e scaffold**
- `npm init` com nome `vetrum-tuss-mcp`
- Instalar dependências: `@modelcontextprotocol/sdk`, `better-sqlite3`, `exceljs`, `zod`
- Instalar devDependencies: `typescript`, `tsx`, `vitest`, `eslint`, `@typescript-eslint/*`, `@types/better-sqlite3`, `@types/node`
- Criar `tsconfig.json` com `strict: true`, `target: ES2022`, `module: Node16`
- Criar `.eslintrc.json` com `@typescript-eslint/recommended`
- Criar `vitest.config.ts`

**1.2 — Implementar `src/constants.ts`**
- URLs das fontes ANS
- `FHIR_SYSTEM`
- `CBHPM_EDICAO`
- `DISCLAIMER`

**1.3 — Implementar `src/types.ts`**
- Todos os tipos: `TussRecord`, `CoberturaRol`, `HierarquiaCbhpm`, `SyncMetadata`, etc.

**1.4 — Implementar `src/db/schema.ts`**
- DDL completo conforme spec: 7 tabelas + 4 tabelas virtuais FTS5
- Função `applySchema(db: Database): void`

**1.5 — Implementar `src/db/client.ts`**
- Singleton `Database` com WAL + NORMAL sync
- Resolve path `~/.vetrum/tuss.db` (ou `VETRUM_DB_PATH`)
- Cria diretório se não existir

**1.6 — Implementar `src/sync/downloader.ts`**
- `downloadFile(url): Promise<Buffer>` com retry exponencial
- `detectNewVersion(pageUrl, knownVersion): Promise<string | null>`
  - Faz GET na página ANS e extrai href dos links `.xlsx`/`.zip` com regex
  - Compara com versão armazenada

**1.7 — Implementar `src/sync/parser.ts`**
- `parseCorrelacaoTussRol(buffer): CorrelacaoRow[]`
  - Usa `exceljs.Workbook().xlsx.load(buffer)`
  - Pula linhas 1-7; lê a partir da linha 8 (headers) e linha 9 (dados)
  - Mapeia colunas por índice: A=código, B=descricao_tuss, C=correlacao, D=procedimento_rol, E=rn, F=vigencia, G=od, H=amb, I=hco, J=hso, K=pac, L=dut, M=subgrupo, N=grupo, O=capitulo
  - Valida que o header da coluna A é "Código" (sanity check)
- `parseTabelaTuss(buffer, tabela): TussRow[]`
  - Parser genérico: descobre headers na primeira linha não-vazia
  - Extrai código (8 dígitos) e descrição

**1.8 — Implementar `src/sync/ingestor.ts`**
- `ingestAll(db): Promise<void>`
  - Download e parse da correlação TUSS-ROL
  - Download e parse das Tabelas 18, 19, 20, 22
  - `BEGIN TRANSACTION` → DELETE + INSERT em batches de 1.000 → `COMMIT`
  - Rebuild FTS5 após commit: `INSERT INTO tuss_procedimentos_fts(tuss_procedimentos_fts) VALUES('rebuild')`
  - Atualiza `sincronizacao_versoes`

**1.9 — Implementar `scripts/sync.ts`**
- CLI: `console.log` de progresso; erro com exit code 1 se falha

### Automated Verification (Fase 1)

```bash
npm run typecheck               # zero erros
npm run lint                    # zero warnings críticos
npx tsx scripts/sync.ts         # executa sem erro, banco criado em ~/.vetrum/tuss.db
sqlite3 ~/.vetrum/tuss.db "SELECT count(*) FROM tuss_procedimentos;"   # > 0
sqlite3 ~/.vetrum/tuss.db "SELECT count(*) FROM rol_cobertura;"        # > 0
sqlite3 ~/.vetrum/tuss.db "SELECT count(*) FROM tuss_materiais;"       # > 100000 (Tab. 19)
sqlite3 ~/.vetrum/tuss.db "SELECT * FROM sincronizacao_versoes;"       # 5 linhas (18,19,20,22,rol)
```

### Manual Verification (Fase 1)

- Abrir `tuss.db` com DB Browser for SQLite e inspecionar 5-10 registros de cada tabela.
- Confirmar que o registro `10101012` ("Consulta em consultório") existe em `tuss_procedimentos`.
- Confirmar que `rol_cobertura` tem múltiplas linhas para o código `10101012`.
- Confirmar que `cbhpm_hierarquia` tem capitulo = "PROCEDIMENTOS GERAIS" para `10101012`.

### Rollback (Fase 1)

Ingestão usa transação SQLite — falha parcial não corrompe o banco. Se o banco estiver corrompido, deletar `~/.vetrum/tuss.db` e re-executar `npm run sync`.

---

## Implementação Fase 2 — Tools Core

### Objetivo
4 tools funcionais conectadas ao banco real: `buscar_tuss_por_codigo`, `buscar_tuss_por_descricao`, `validar_cobertura_rol`, `listar_por_categoria`.

### Passos

**2.1 — Implementar `src/db/queries.ts`**
- `findByCode(db, codigo)`: SELECT em todas as tabelas + JOIN rol_cobertura + JOIN cbhpm_hierarquia
- `searchByText(db, texto, tabelas, pagina, porPagina)`: FTS5 MATCH nas tabelas selecionadas; paginação via LIMIT/OFFSET
- `getRolCoverage(db, codigo, segmento?)`: SELECT em rol_cobertura com filtro opcional de segmento
- `listByCategory(db, categoria, pagina, porPagina)`: SELECT na tabela mapeada com filtro de tipo

**2.2 — Implementar `src/tools/buscar-por-codigo.ts`**
- Handler Zod + chamada `findByCode` + montagem `structuredContent`
- Incluir `sistema_fhir`, `metadata`, `disclaimer`

**2.3 — Implementar `src/tools/buscar-por-descricao.ts`**
- Handler Zod + FTS5 + paginação
- Default `tabelas: ["22"]`

**2.4 — Implementar `src/tools/validar-cobertura-rol.ts`**
- Handler Zod + `getRolCoverage`
- Flag `no_rol_ans: boolean` (true se há ao menos 1 linha com correlacao = 'SIM')

**2.5 — Implementar `src/tools/listar-por-categoria.ts`**
- Handler Zod + `listByCategory`
- Mapeamento enum → tabela + filtro de tipo

**2.6 — Implementar `src/server.ts`**
- Instanciar `McpServer`
- Registrar as 4 tools desta fase com schemas e annotations
- Exportar instância

**2.7 — Implementar `src/index.ts`**
- Inicialização completa: `openDb → applySchema → (ingestIfEmpty) → server.connect(StdioTransport)`

### Automated Verification (Fase 2)

```bash
npm run typecheck
npm run lint
# Executar servidor e testar via MCP Inspector ou stdin:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"buscar_tuss_por_codigo","arguments":{"codigo":"10101012"}}}' | npx vetrum-tuss-mcp
# Verificar: structuredContent.codigo === "10101012"
# Verificar: structuredContent.coberturas tem pelo menos 1 item
# Verificar: structuredContent.metadata.sincronizado_em não é null
# Verificar: structuredContent.disclaimer presente
```

### Manual Verification (Fase 2)

- Configurar no Claude Desktop e testar os 4 casos de eval cobertos por estas tools (evals 1, 2, 3, 4).
- Confirmar que `buscar_tuss_por_descricao("colonoscopia")` retorna ≥ 3 resultados.
- Confirmar que `validar_cobertura_rol("40301370")` retorna `no_rol_ans: true` com DUT.

### Rollback (Fase 2)

Código apenas — `git revert` ou `git stash` se a fase for interrompida.

---

## Implementação Fase 3 — Tools Complementares e Status

### Objetivo
3 tools restantes: `consultar_hierarquia_cbhpm`, `listar_procedimentos_com_cobertura_obrigatoria`, `status_sincronizacao`. Também implementar `sync/scheduler.ts`.

### Passos

**3.1 — Adicionar queries em `src/db/queries.ts`**
- `getCbhpmHierarchy(db, codigo)`: SELECT em cbhpm_hierarquia
- `listObrigatorio(db, segmento?, comDut?, pagina, porPagina)`: SELECT em rol_cobertura WHERE correlacao = 'SIM'
- `getSyncStatus(db)`: SELECT * FROM sincronizacao_versoes

**3.2 — Implementar `src/tools/consultar-hierarquia-cbhpm.ts`**
- Incluir `nota_limitacao` e `cbhpm_edicao` no output

**3.3 — Implementar `src/tools/listar-cobertura-obrigatoria.ts`**
- Paginação via LIMIT/OFFSET; filtros segmento e com_dut

**3.4 — Implementar `src/tools/status-sincronizacao.ts`**
- Retorna estado de todas as 5 entradas de `sincronizacao_versoes`

**3.5 — Implementar `src/sync/scheduler.ts`**
- `checkAndSync(db)`: detecta nova versão e dispara `ingestAll` se necessário

**3.6 — Atualizar `src/server.ts`**
- Registrar as 3 tools desta fase

### Automated Verification (Fase 3)

```bash
npm run typecheck && npm run lint
echo '{}' | jq '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"status_sincronizacao","arguments":{}}}' | npx vetrum-tuss-mcp
# Verificar: structuredContent.tabelas.length === 5
echo '{"codigo":"10101012"}' | ... consultar_hierarquia_cbhpm
# Verificar: capitulo === "PROCEDIMENTOS GERAIS"
# Verificar: nota_limitacao presente
```

### Manual Verification (Fase 3)

- Testar `listar_procedimentos_com_cobertura_obrigatoria({ segmento: "AMB" })` — deve retornar lista não vazia com total > 100.
- Testar `listar_procedimentos_com_cobertura_obrigatoria({ com_dut: true })` — deve retornar subset da lista AMB.
- Confirmar que `status_sincronizacao` mostra versões corretas para as 5 tabelas.

---

## Implementação Fase 4 — CI, Evals e Qualidade

### Objetivo
Pipeline CI verde com lint, typecheck, testes unitários e 12 evals passando com dados reais.

### Passos

**4.1 — Implementar testes unitários (`tests/`)**
- Criar banco in-memory com fixtures para cada grupo de testes
- Cobrir os casos descritos na spec: 7 arquivos de teste unitário

**4.2 — Implementar `evals/evals.test.ts`**
- 12 casos conforme PRD
- Usam banco real (gerado pelo script de sync no CI)

**4.3 — Criar `.github/workflows/ci.yml`**

```yaml
name: CI
on: [push, pull_request]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run sync      # baixa dados reais do ANS
      - run: npm test
```

**4.4 — Criar `.github/workflows/sync.yml`**

```yaml
name: Sync semanal
on:
  schedule:
    - cron: '0 3 * * 1'   # toda segunda-feira 03:00 UTC
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run sync
      - uses: actions/cache@v4
        with:
          path: ~/.vetrum/tuss.db
          key: tuss-db-${{ hashFiles('scripts/sync.ts') }}-${{ github.run_id }}
```

**4.5 — Ajustar CI para cache do banco**
- O `ci.yml` usa `actions/cache` para reutilizar o `tuss.db` gerado no sync, evitando download toda vez.

### Automated Verification (Fase 4)

```bash
# Local:
npm test             # todos passam (unitários + evals)
npm run typecheck    # zero erros
npm run lint         # zero warnings críticos

# CI:
# Push para branch → verificar GitHub Actions verde em todos os steps
```

### Manual Verification (Fase 4)

- Checar output do `vitest run --reporter=verbose` e confirmar que todos os 12 evals estão identificados pelo nome.
- Checar que o CI baixa os dados reais do ANS no step `npm run sync` sem erro.

---

## Implementação Fase 5 — Publicação e Documentação

### Objetivo
Pacote publicado no npm, servidor registrado no MCP Registry oficial, Smithery e Glama. Documentação PT-BR completa.

### Passos

**5.1 — Escrever `README.md` (PT-BR)**

Seções obrigatórias:
- O que é / Para quem é
- Instalação e configuração (Claude Desktop, Cursor, VS Code)
  ```json
  // claude_desktop_config.json
  { "mcpServers": { "vetrum-tuss": { "command": "npx", "args": ["vetrum-tuss-mcp"] } } }
  ```
- Lista de tools com descrição em linguagem de negócio (para faturistas e auditores)
- Limitações explícitas (CBHPM parcial, sem porte anestésico/UCO)
- Fontes de dados e versões
- Disclaimer médico/jurídico
- Contribuição e licença

**5.2 — Criar `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`**

**5.3 — Build e publicação npm**
```bash
npm run build        # tsc → dist/
npm publish --access public
```

**5.4 — Criar `smithery.yaml`**
```yaml
startCommand:
  type: stdio
  configSchema: {}
  commandFunction: |-
    () => ({ command: "npx", args: ["vetrum-tuss-mcp"] })
```

**5.5 — Submeter ao MCP Registry oficial**
- Seguir `modelcontextprotocol.io/registry` — submissão via PR no repositório oficial

**5.6 — Submeter ao Glama**
- Acessar `glama.ai` e submeter repositório GitHub

**5.7 — Submeter ao Smithery**
- Acessar `smithery.ai` e submeter `smithery.yaml`

### Automated Verification (Fase 5)

```bash
npx vetrum-tuss-mcp --version    # retorna versão do package.json
npm pack --dry-run               # confirma que dist/ está incluído, tuss.db excluído
```

### Manual Verification (Fase 5)

- `npx vetrum-tuss-mcp` em máquina limpa (sem clone do repositório) inicia o servidor.
- Configurar no Claude Desktop e executar os 12 evals manualmente.
- Verificar que o pacote aparece na busca do Smithery e Glama.

---

## Testing Strategy

### Pirâmide de testes

```
     [Evals — 12 casos reais]
   [Integração — banco SQLite real]
 [Unitários — banco in-memory + fixtures]
```

### Sem mocks de banco

Testes unitários usam banco SQLite in-memory (`:memory:`) populado com fixtures de dados reais (não mocks de função). Isso garante que as queries SQL reais são testadas.

### Dados reais no CI

Os evals usam o banco `tuss.db` gerado pelo script de sync no CI. O CI baixa os dados reais do portal ANS — não usa snapshots ou fixtures artificiais para os evals. Isso garante que os evals detectam mudanças reais nas fontes.

### Cobertura mínima exigida

- Todas as 7 tools: pelo menos 1 teste unitário + cobertura pelos evals
- Parser e ingestor: testes de idempotência e mapeamento de colunas
- Casos de erro: código não encontrado, texto muito curto, código inválido

---

## Performance Considerations

| Cenário | Meta | Estratégia |
|---|---|---|
| Query por código (Tab. 22) | < 10ms | PRIMARY KEY lookup |
| Query FTS5 por texto (Tab. 22) | < 50ms | FTS5 nativo SQLite |
| Query FTS5 por texto (Tab. 19) | < 200ms | FTS5 + índice; Tab. 19 tem 300k+ registros |
| Listagem paginada (Tab. 19) | < 100ms | LIMIT/OFFSET com índice |
| Ingestão inicial (todas as tabelas) | < 5min | Batches de 1.000; Tab. 19 é o gargalo |
| Ingestão incremental (somente Tab. 22) | < 30s | Apenas tabelas com nova versão |
| Rebuild FTS5 (Tab. 19) | < 2min | Executar após COMMIT, fora da transação |

### Indexação obrigatória

```sql
CREATE INDEX IF NOT EXISTS idx_rol_codigo ON rol_cobertura(codigo_tuss);
CREATE INDEX IF NOT EXISTS idx_rol_segmento ON rol_cobertura(correlacao, amb, hco, hso, od, pac);
CREATE INDEX IF NOT EXISTS idx_cbhpm_codigo ON cbhpm_hierarquia(codigo_tuss);
```

### WAL mode

`PRAGMA journal_mode = WAL` — permite leituras concorrentes enquanto uma escrita (ingestão) ocorre.

---

## Migration Notes

Não há migração de sistema legado. Observações para futuras versões:

- **Adição de colunas**: usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para manter compatibilidade com bancos existentes.
- **Mudança de schema**: criar nova tabela com sufixo `_v2`, copiar dados, renomear — nunca DROP em produção sem backup.
- **Rebuild de FTS5**: qualquer mudança na tabela base exige rebuild da tabela virtual FTS5 correspondente.
- **Chave CNES reservada**: quando MCP 2 (CNES) for integrado, adicionar coluna `cnes_referencia TEXT` em `rol_cobertura` via migration.

---

## References

| Recurso | URL |
|---|---|
| Portal TISS da ANS | `https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss` |
| Página Rol de Procedimentos ANS | `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos` |
| Correlação TUSS-ROL (última identificada) | `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos/CorrelaoTUSS.202409Rol.2021_TUSS202603_RN652.2025_RN654.2025.xlsx` |
| CodeSystem FHIR BRCBHPMTUSS | `https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS` |
| MCP SDK TypeScript | `https://github.com/modelcontextprotocol/typescript-sdk` |
| MCP Spec 2025-11-25 | `https://modelcontextprotocol.io/specification/2025-11-25` |
| better-sqlite3 | `https://github.com/WiseLibs/better-sqlite3` |
| exceljs | `https://github.com/exceljs/exceljs` |
| Spec técnica (4-spec.md) | `02_modelos_variaveis_do_projeto/4-spec.md` |
| PRD (3-prd.md) | `02_modelos_variaveis_do_projeto/3-prd.md` |
