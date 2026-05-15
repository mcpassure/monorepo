# Adendo de Resiliência — MCP TUSS / CBHPM / Rol ANS

> **⚠️ STATUS: INCORPORADO AO `4-spec.md` v1.1 (2026-05-13)**
>
> Este documento foi **integrado** ao spec principal em 2026-05-13 como parte da reescrita v1.1 do `4-spec.md`. As decisões aqui descritas (adapter pattern formal com `ITerminologiaRepository` + 3 sub-repositories, `_meta` granular como array por terminologia, fallback chain por terminologia, canário diário, status page heartbeat, env vars `MCPASSURE_*`, `cross_mapping.v1.json` versionado, 3 schemas baseline) agora vivem como seções canônicas do `4-spec.md`.
>
> **Este arquivo é mantido apenas como histórico de decisão.** Não consulte-o como fonte da verdade — consulte `4-spec.md` v1.1. Para a evolução desta linha de pensamento, edite o `4-spec.md`, não este arquivo.

---

**Versão original:** 1.1 (2026-05-13)
**Status:** complementa `4-spec.md`. Não substitui. **Conteúdo já incorporado.**
**Motivação:** mitigar dependência de múltiplas fontes oficiais (ANS, MS, CFM/AMB), cada uma com seu ciclo de atualização, formato e instabilidade própria. TUSS é especialmente sensível porque atualizações da terminologia afetam faturamento e operação de toda a cadeia de saúde suplementar.

---

## Princípio

O MCP é **contrato estável sobre múltiplas fontes instáveis** — diferente dos outros MCPs MCPAssure, aqui há agregação de três terminologias distintas. A interface exposta (tools, output schemas, comportamento) é imutável dentro de uma major version. A camada de aquisição de dados é descartável e substituível sem impacto pro consumidor.

---

## 1. Adapter pattern obrigatório

Separação física em código entre:

```
src/
  tools/        → interface MCP estável (handlers de tools, output schemas Zod, annotations)
  sources/
    tuss_fhir/        → terminologia.saude.gov.br/fhir (CodeSystem BRCBHPMTUSS)
    rol_ans/          → planilhas ANS do Rol de Procedimentos
    cbhpm_amb/        → CBHPM publicada por AMB/CFM
    ans_padrao_tiss/  → tabelas de domínio TISS da ANS
  domain/             → modelos canônicos (Procedimento, MapeamentoTUSS, RolANS)
  cache/              → camada SQLite
```

Regras:
- Tools **nunca** importam de `sources/` diretamente
- Tools consomem `domain/` via interface `ITerminologiaRepository`
- `ITerminologiaRepository` orquestra `cache/` + `sources/` com fallback chain
- Cada terminologia (TUSS, CBHPM, Rol ANS) tem sua própria sub-interface
- Adicionar nova fonte = criar novo adapter, registrar no orquestrador
- Mudar URL/formato de fonte existente = patchear adapter específico, sem tocar em tool

---

## 2. Cache SQLite com transparência de defasagem por terminologia

Cada response inclui metadata específica da terminologia consultada:

```json
{
  "structuredContent": {
    "data": { ... },
    "_meta": {
      "terminologia": "TUSS",
      "versao": "202604",
      "data_da_base": "2026-04-15T00:00:00Z",
      "fonte": "terminologia.saude.gov.br/fhir — CodeSystem BRCBHPMTUSS",
      "defasagem_dias": 28,
      "modo": "cache_local"
    }
  }
}
```

Quando a consulta cruza terminologias (ex: "qual o código TUSS equivalente ao CBHPM 4.01.01.01-2?"), o response declara `_meta` para **cada terminologia envolvida**, com suas defasagens independentes.

Sincronização:
- Job interno verifica disponibilidade de nova versão de cada terminologia independentemente
- TUSS: tipicamente atualizado mensalmente pelo MS
- Rol ANS: atualizações esporádicas com publicações periódicas
- CBHPM: revisões anuais pela AMB (CBHPM 2020, 2025 etc.)
- Cada uma com baseline schema versionada própria

---

## 3. Fallback chain de fontes (por terminologia)

### TUSS
1. Cache local SQLite
2. terminologia.saude.gov.br/fhir (CodeSystem BRCBHPMTUSS)
3. ans.gov.br (versão histórica em planilha quando disponível)
4. Fallback: erro estruturado

### Rol ANS
1. Cache local SQLite
2. Portal ANS — área de Rol de Procedimentos (XLSX/PDF)
3. Dados abertos do governo federal
4. Fallback: erro estruturado

### CBHPM
1. Cache local SQLite
2. Site AMB/CFM (publicação oficial)
3. Fallback: erro estruturado (CBHPM tem menos opções de redundância pública)

Cada falha gera log estruturado com adapter, status HTTP/erro, latência.

---

## 4. Canário diário via GitHub Actions

Workflow `.github/workflows/canary.yml`:

- Cron diário (03h UTC)
- Para cada terminologia: baixa amostra pequena, valida schema, compara hash de estrutura com baseline
- Detecta especificamente:
  - TUSS: mudanças no CodeSystem FHIR (campos, properties, version)
  - Rol ANS: mudança de estrutura da planilha (colunas, sheets, header rows)
  - CBHPM: mudança na publicação anual ou suplementos
- Em divergência: issue automática com label `upstream-drift` + terminologia afetada + diff
- Em falha de rede ou fonte indisponível: issue com label `upstream-down`
- Atualiza `STATUS.md` com timestamp de última verificação OK por fonte
- Notificação especial quando nova versão de qualquer terminologia é publicada

---

## 5. Integração com status page público

O MCP envia heartbeat opcional pro endpoint `status.mcpassure.com.br/api/v1/heartbeat/{mcp_id}` (configurável via env var, desligado por padrão na v1 stdio).

Quando ativado, o status page mostra:
- Última verificação OK de cada terminologia (TUSS, Rol ANS, CBHPM)
- Versão atual em cache de cada uma
- Defasagem em dias por terminologia
- CVEs ativas (se houver)
- Versão atual publicada do MCP

---

## 6. Decisões derivadas pra implementação (Etapa 5)

| Item | Decisão |
|---|---|
| Pasta `src/sources/` | criar com 3 subpastas (TUSS, Rol ANS, CBHPM) desde a v1 |
| Schema baseline | uma por terminologia em `src/sources/schemas/` |
| Cache TTL | não-aplicável — refresh é por publicação de nova versão, não por tempo |
| Modo degraded | quando `defasagem_dias > 90` para qualquer terminologia, warning explícito |
| Mapeamento cruzado | TUSS↔CBHPM↔Rol ANS são derivados via tabela local versionada (`cross_mapping.v1.json`); mudanças exigem PR review |
| Telemetria | logs estruturados JSON; nenhum dado de paciente trafega aqui |
| CBHPM licenciamento | confirmar status de uso da publicação no README; CBHPM tem restrições autorais maiores que TUSS/Rol |

---

## 7. Critério de aceitação adicional

O MCP só é considerado pronto pra release v1.0.0 se:
- [ ] Adapter pattern implementado e testado para as 3 terminologias
- [ ] Cache SQLite funciona offline (teste integrado com rede desligada)
- [ ] Workflow de canário no GitHub Actions verde por 7 dias consecutivos
- [ ] `_meta` com versão e defasagem presente em 100% dos responses bem-sucedidos
- [ ] Detecção automática de nova publicação por terminologia funcionando
- [ ] Mapeamento cruzado validado contra base oficial mais recente
- [ ] Documentação de "o que fazer se ANS/MS/AMB mudar publicação" no README operacional (runbook)
- [ ] Disclaimer sobre uso da CBHPM (questões autorais) explicitamente no README

---

## Histórico de versões

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-05-13 | Versão inicial |
| 1.1 | 2026-05-13 | Rebrand: `vetrum.com.br` → `mcpassure.com.br` em URLs do status page |
| (arquivado) | 2026-05-13 | **Conteúdo incorporado integralmente ao `4-spec.md` v1.1. Arquivo mantido como histórico.** |
