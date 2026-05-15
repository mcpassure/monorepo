# Adendo de Resiliência — MCP CNES

> **⚠️ STATUS: INCORPORADO AO `4-spec.md` v1.1 (2026-05-13)**
>
> Este documento foi **integrado** ao spec principal em 2026-05-13 como parte da reescrita v1.1 do `4-spec.md`. As decisões aqui descritas (adapter pattern formal com `ICnesRepository`, `_meta` com `competencia`/`data_da_base`/`defasagem_dias`, canário diário, status page heartbeat, env vars `MCPASSURE_*`) agora vivem como seções canônicas do `4-spec.md`.
>
> **Este arquivo é mantido apenas como histórico de decisão.** Não consulte-o como fonte da verdade — consulte `4-spec.md` v1.1. Para a evolução desta linha de pensamento, edite o `4-spec.md`, não este arquivo.

---

**Versão original:** 1.1 (2026-05-13)
**Status:** complementa `4-spec.md`. Não substitui. **Conteúdo já incorporado.**
**Motivação:** mitigar dependência de fontes oficiais brasileiras que historicamente mudam URL, formato e estrutura sem aviso prévio. CNES/DATASUS tem histórico documentado de mudanças de layout em dumps mensais.

---

## Princípio

O MCP é **contrato estável sobre fonte instável**. A interface exposta (tools, output schemas, comportamento) é imutável dentro de uma major version. A camada de aquisição de dados é descartável e substituível sem impacto pro consumidor.

---

## 1. Adapter pattern obrigatório

Separação física em código entre:

```
src/
  tools/        → interface MCP estável (handlers de tools, output schemas Zod, annotations)
  sources/      → adapters por fonte (datasus_ftp, cnes_portal, dados_abertos_gov, futuras)
  domain/       → modelos de domínio canônicos (Estabelecimento, Profissional, Equipamento)
  cache/        → camada SQLite
```

Regras:
- Tools **nunca** importam de `sources/` diretamente
- Tools consomem `domain/` via interface `ICnesRepository`
- `ICnesRepository` tem implementação que orquestra `cache/` + `sources/` com fallback chain
- Adicionar nova fonte = criar novo adapter em `sources/`, registrar no orquestrador
- Mudar URL/formato de fonte existente = patchear adapter específico, sem tocar em tool

---

## 2. Cache SQLite com transparência de defasagem

Cada response inclui campo `data_da_base` no nível de metadata:

```json
{
  "structuredContent": {
    "data": { ... },
    "_meta": {
      "data_da_base": "2026-04-01T00:00:00Z",
      "competencia": "202604",
      "fonte": "DATASUS FTP — Base CNES mensal",
      "defasagem_dias": 42,
      "modo": "cache_local"
    }
  }
}
```

Observação CNES-específica: os dumps são **mensais**, com competência (mês de referência) tipicamente disponibilizada 30-45 dias após o fechamento. O campo `competencia` é a verdade canônica; `defasagem_dias` é cálculo derivado.

Sincronização:
- Job interno verifica diariamente se há nova competência disponível
- Quando há, baixa, valida schema, substitui cache
- Mantém última competência boa em backup local até nova validar OK
- Falha em validação → mantém cache atual + warning estruturado

---

## 3. Fallback chain de fontes

Ordem de tentativa para qualquer consulta:

1. **Cache local SQLite** (offline-first) — resposta imediata
2. **DATASUS FTP** (`ftp.datasus.gov.br/dissemin/publicos/CNES/...`) — fonte primária, dumps mensais estruturados
3. **Portal CNES** (`cnes.datasus.gov.br`) — fonte secundária, consulta online
4. **Dados Abertos do Governo Federal** (`dados.gov.br`) — fonte terciária, quando publicado
5. **Fallback final:** retorna erro estruturado com indicação de fontes tentadas e timestamps de cada falha

Cada falha gera log estruturado com nome do adapter, status HTTP/erro, latência.

---

## 4. Canário diário via GitHub Actions

Workflow `.github/workflows/canary.yml`:

- Cron diário (03h UTC)
- Verifica disponibilidade do FTP DATASUS (lista diretórios)
- Baixa amostra pequena (5-10 estabelecimentos) de cada fonte primária
- Valida schema esperado vs schema recebido (campo a campo)
- Detecta especificamente: mudança de layout de arquivo DBC/DBF, novas colunas, remoção de colunas, mudança de codificação (latin1 vs utf-8)
- Em divergência: cria issue automática no repo com label `upstream-drift` + diff + amostra
- Em falha de rede ou FTP indisponível: cria issue com label `upstream-down`
- Atualiza arquivo `STATUS.md` no repo com timestamp de última verificação OK por fonte
- Adiciona check específico: "nova competência mensal disponível?" — notifica quando publicada

---

## 5. Integração com status page público

O MCP envia heartbeat opcional pro endpoint `status.mcpassure.com.br/api/v1/heartbeat/{mcp_id}` (configurável via env var, desligado por padrão na v1 stdio).

Quando ativado, o status page mostra:
- Última verificação OK de cada fonte upstream (FTP, portal, dados abertos)
- Competência atual da base local
- Defasagem em dias
- CVEs ativas (se houver)
- Versão atual publicada do MCP

---

## 6. Decisões derivadas pra implementação (Etapa 5)

| Item | Decisão |
|---|---|
| Pasta `src/sources/` | criar mesmo que só tenha 1 adapter na v1 (preparação arquitetural) |
| Schema baseline | versionar em `src/sources/schemas/cnes_dbc_layout.v1.json` |
| Cache TTL | TTL não se aplica aqui — dado muda mensalmente; refresh é por competência, não por tempo |
| Modo degraded | quando `defasagem_dias > 75` (mais de 2 competências), warning explícito no response |
| Codificação | aceitar latin1 e utf-8 do FTP DATASUS; normalizar internamente pra utf-8 |
| Telemetria | logs estruturados JSON; CNES é dado público de estabelecimentos (não há PII de paciente envolvido) |

---

## 7. Critério de aceitação adicional

O MCP só é considerado pronto pra release v1.0.0 se:
- [ ] Adapter pattern implementado e testado
- [ ] Cache SQLite funciona offline com competência atual (teste integrado com rede desligada)
- [ ] Workflow de canário no GitHub Actions verde por 7 dias consecutivos
- [ ] `data_da_base` + `competencia` presentes em 100% dos responses bem-sucedidos
- [ ] Detecção automática de nova competência mensal funcionando
- [ ] Documentação de "o que fazer se DATASUS mudar FTP" no README operacional (runbook)

---

## Histórico de versões

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-05-13 | Versão inicial |
| 1.1 | 2026-05-13 | Rebrand: `vetrum.com.br` → `mcpassure.com.br` em URLs do status page |
| (arquivado) | 2026-05-13 | **Conteúdo incorporado integralmente ao `4-spec.md` v1.1. Arquivo mantido como histórico.** |
