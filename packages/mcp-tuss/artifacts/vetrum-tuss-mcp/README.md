# vetrum-tuss-mcp

MCP server para consulta integrada de **TUSS**, **CBHPM** e **Rol de Procedimentos ANS** — parte do catálogo Vetrum Brasil.

> **Aviso:** Esta ferramenta é fonte de consulta técnica sobre terminologias da saúde suplementar brasileira. **Não substitui análise jurídica de glosa, parecer de auditoria médica nem orientação de advogado especializado.** Nenhum dado pessoal identificável (PHI/PII) é tratado.

## O que está disponível

| Tabela | Conteúdo | Fonte |
|--------|----------|-------|
| Tab. 22 | Procedimentos e eventos em saúde | ANS — correlação TUSS-ROL |
| Tab. 19 | Materiais e OPME | ANS — TISS |
| Tab. 20 | Medicamentos | ANS — TISS |
| Tab. 18 | Taxas e diárias hospitalares | ANS — TISS |
| Rol ANS | Cobertura obrigatória por segmento | RN 465/2021 e atualizações |
| CBHPM | Hierarquia capítulo/grupo/subgrupo | ANS — correlação TUSS-ROL (6ª ed. 2022) |

**Limitação CBHPM:** porte anestésico e UCO não estão disponíveis publicamente (publicação paga da AMB). Apenas a hierarquia (capítulo/grupo/subgrupo) presente na correlação ANS está disponível.

## Ferramentas disponíveis

| Ferramenta | Descrição |
|------------|-----------|
| `buscar_tuss_por_codigo` | Busca por código TUSS de 8 dígitos |
| `buscar_tuss_por_descricao` | Busca por texto livre com FTS5 |
| `listar_por_categoria` | Lista paginada por categoria (procedimentos, materiais, opme, medicamentos, taxas, diarias) |
| `validar_cobertura_rol` | Valida cobertura no Rol ANS por segmento (OD/AMB/HCO/HSO/PAC) |
| `consultar_hierarquia_cbhpm` | Hierarquia CBHPM de um procedimento Tab. 22 |
| `listar_procedimentos_com_cobertura_obrigatoria` | Lista todos os procedimentos do Rol ANS (correlação=SIM), com filtros |
| `status_sincronizacao` | Status e versão do banco de dados |

## Instalação

### Claude Desktop

Adicione ao seu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vetrum-tuss": {
      "command": "npx",
      "args": ["-y", "vetrum-tuss-mcp"]
    }
  }
}
```

**Localização do arquivo de configuração:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Cursor

Adicione ao `.cursor/mcp.json` no seu projeto ou ao arquivo global `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vetrum-tuss": {
      "command": "npx",
      "args": ["-y", "vetrum-tuss-mcp"]
    }
  }
}
```

### Variáveis de ambiente (opcional)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VETRUM_DB_PATH` | Caminho do banco SQLite | `~/.vetrum/tuss.db` |

## Primeiros passos

Na primeira execução, o servidor detecta que o banco está vazio e inicia automaticamente a sincronização com a ANS (pode levar 2-5 minutos dependendo da conexão).

### Sincronização manual

```bash
# Verificar se há nova versão disponível
npx vetrum-tuss-mcp sync

# Forçar resincronização completa
npx vetrum-tuss-mcp sync --force
```

## Exemplos de uso

**Buscar um código TUSS:**
```
Qual é o procedimento TUSS 10101012?
```

**Verificar cobertura:**
```
O código TUSS 40301370 está coberto no plano hospitalar com obstetrícia?
```

**Listar procedimentos com DUT:**
```
Liste os procedimentos obrigatórios no Rol ANS que possuem Diretriz de Utilização.
```

**Busca por texto:**
```
Busque procedimentos TUSS relacionados a colonoscopia.
```

## Desenvolvimento

```bash
git clone https://github.com/vetrum-brasil/vetrum-tuss-mcp.git
cd vetrum-tuss-mcp
npm install
npm run dev
```

### Testes

```bash
# Testes unitários
npm test

# Evals de negócio
npm run evals

# Type check
npm run typecheck

# Build
npm run build
```

## Fontes oficiais

- **ANS — Rol de Procedimentos:** [gov.br/ans](https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos)
- **ANS — TISS:** [gov.br/ans/tiss](https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss)
- **FHIR BR:** [terminologia.saude.gov.br/fhir](https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS)

## Licença

MIT — veja [LICENSE](LICENSE).

---

*Parte do catálogo [Vetrum Brasil](https://github.com/vetrum-brasil) de MCPs para saúde.*
