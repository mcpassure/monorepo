# Plano de Testes Integrados v2.3 — @mcpassure/mcp-tuss

**Versão do plano:** v2.3  
**Data:** 2026-05-13  
**Spec de referência:** 4-spec.md  
**Entrega de referência:** 7-entrega.md  
**Run mais recente:** resultados/run_20260513_T230402/

---

## Escopo

Testes integrados de ponta-a-ponta para o MCP `@mcpassure/mcp-tuss` v0.1.0.  
Não duplica unit tests da Etapa 5. Cobre:

1. **Dados reais da ANS** — banco `tuss_real.db` com 53.250 registros TUSS 202603
2. **Fluxo ponta-a-ponta** — tool handlers chamados diretamente, sem mock
3. **Cenários de usuário real** — médico, farmacêutico, faturista, dev healthtech
4. **Bordas e falhas** — input inválido, código inexistente, cache vazio, paginação
5. **Output schema MCP** — `_meta`, modo, competência presentes em 100% das respostas

---

## Estratégia

- **Real data first**: banco `tuss_real.db` populado com dados oficiais ANS 202603 (17 MB SQLite)
- **Offline-first após sync**: após download inicial, zero dependência de rede
- **Sem mock**: tool handlers importados diretamente de `src/tools/`; `TussRepository` abre `tuss_real.db`
- **Reprodutível**: `tsx 08_testes_integrados/binarios/scripts/run_all.ts` sempre produz mesmo resultado com mesmo DB
- **Logs por cenário**: cada run gera `resultados/run_<TIMESTAMP>/logs/C<N>_pass.log` ou `C<N>_fail.log`
- **Complementar**: a suíte Vitest (`tests/integration/`) cobre assertions unitárias; aqui cobrimos cenários de negócio

---

## Tools cobertas

| Tool | Casos felizes | Bordas | Falhas | Segurança | Annotations/Degraded | Total |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| `buscar_procedimento_tuss` | 4 | 3 | 2 | 2 | 0 | 11 |
| `buscar_medicamento_tuss` | 3 | 2 | 1 | 0 | 0 | 6 |
| `buscar_diaria_taxa_tuss` | 3 | 2 | 1 | 0 | 0 | 6 |
| `status_sincronizacao_tuss` | 3 | 1 | 1 | 0 | 2 | 7 |
| `(transversal)` | 0 | 0 | 0 | 0 | 1 | 1 |
| **TOTAL** | **13** | **8** | **5** | **2** | **3** | **31** |

> Nota: C13 varre todos os 4 tools. C24 (Annotations) é transversal. run_all.ts tem 25 cenários no total.

---

## Cenários de simulação de uso real (10+)

### Cenário 1: Médico consultando código antes de faturar
```
Usuário: "Qual o código TUSS de consulta médica em consultório?"
Tool: buscar_procedimento_tuss(query="consulta")
Output esperado: lista contendo código 10101012
Critério: data.some(r => r.codigo === "10101012") && _meta.modo === "cache_local"
```

### Cenário 2: Faturista buscando hemograma completo
```
Usuário: "Qual o código TUSS de hemograma com plaquetas?"
Tool: buscar_procedimento_tuss(codigo="40304361")
Output esperado: data[0].codigo === "40304361", termo contém "hemograma" ou "plaquetas"
Critério: exatamente 1 resultado, _meta.competencia === "202603"
```

### Cenário 3: Farmacêutico buscando Dipirona
```
Usuário: "Existe código TUSS para Dipirona Sódica?"
Tool: buscar_medicamento_tuss(query="Dipirona")
Output esperado: pelo menos 1 resultado com "dipirona" no termo
Critério: data.length >= 1 && data[0].tabela === "20"
```

### Cenário 4: Farmacêutico consultando por código exato
```
Usuário: "Me dê os dados do medicamento 90282680"
Tool: buscar_medicamento_tuss(codigo="90282680")
Output esperado: termo contém "DIPIRONA"
Critério: data.length === 1 && data[0].tabela === "20"
```

### Cenário 5: Faturista hospitalar buscando diária de UTI
```
Usuário: "Qual o código TUSS de diária de UTI adulto?"
Tool: buscar_diaria_taxa_tuss(query="UTI")
Output esperado: pelo menos 1 resultado com "UTI" no termo
Critério: data.length >= 1 && data[0].tabela === "18"
```

### Cenário 6: Operadora verificando taxa por código exato
```
Usuário: "Código 60000279 existe na tabela 18?"
Tool: buscar_diaria_taxa_tuss(codigo="60000279")
Output esperado: DIÁRIA COMPACTA DE ISOLAMENTO DE UTI
Critério: data.length === 1 && data[0].termo.match(/UTI|terapia intensiva/i)
```

### Cenário 7: Dev healthtech auditando status do cache
```
Usuário: "Os dados TUSS estão sincronizados? Qual a versão?"
Tool: status_sincronizacao_tuss()
Output esperado: tuss22.versao === "202603", cache_vazio === false
Critério: data.tuss22.total_registros >= 5900 && !data.cache_vazio
```

### Cenário 8: Busca com acentuação brasileira
```
Usuário: "Busca por 'ressonância' (com acento) retorna resultados"
Tool: buscar_procedimento_tuss(query="ressonância")
Output esperado: data.length >= 1
Critério: algum termo contém "ressonância" ou "ressonancia"
```

### Cenário 9: Busca por prefixo parcial
```
Usuário: "Mostre-me procedimentos de tomografia"
Tool: buscar_procedimento_tuss(query="tomografia", limit=5)
Output esperado: 1-5 resultados, todos com "tomografia" no termo
Critério: data.length >= 1 && data.length <= 5
```

### Cenário 10: Paginação — limit respeita configuração
```
Usuário: "Preciso de no máximo 3 procedimentos de consulta"
Tool: buscar_procedimento_tuss(query="consulta", limit=3)
Output esperado: data.length <= 3
Critério: exatamente no máximo 3 registros
```

### Cenário 11: Input inválido — nem codigo nem query
```
Usuário: chama buscar_procedimento_tuss sem nenhum argumento
Tool: buscar_procedimento_tuss({})
Output esperado: data=[], error presente
Critério: result.error === "Informe `codigo` ou `query`."
```

### Cenário 12: Código totalmente inexistente
```
Usuário: "Existe o código 99999999 no TUSS 22?"
Tool: buscar_procedimento_tuss(codigo="99999999")
Output esperado: data=[], _meta presente (não lança exceção)
Critério: data.length === 0 && _meta.modo === "cache_local"
```

### Cenário 13: _meta presente em 100% dos tools
```
Teste: chamar todas as 4 tools com inputs válidos
Critério: TODA resposta tem _meta com modo, competencia, fonte, defasagem_dias
```

### Cenário 14: Medicamento inexistente retorna array vazio
```
Tool: buscar_medicamento_tuss(codigo="00000000")
Output esperado: data=[], _meta.modo === "cache_local"
Critério: resposta estruturada sem throw
```

### Cenário 15: Diária inexistente retorna array vazio
```
Tool: buscar_diaria_taxa_tuss(codigo="00000000")
Output esperado: data=[], _meta.modo === "cache_local"
Critério: resposta estruturada sem throw
```

---

## Bases de dados utilizadas

| Base | Origem | Versão | Data download | SHA-256 (primeiros 16 chars) |
|------|--------|--------|---------------|------------------------------|
| `tuss_real.db` (SQLite) | ANS TUSS ZIP versão 202603 | 202603 | 2026-05-13 | d65d88c8038f4660 |

> SHA-256 completo: `d65d88c8038f4660c97c385aa5f7d3b0ecf9585edf2c4d11b46bb9205b4ca8bd`  
> Tamanho: 17.408.000 bytes (17 MB SQLite)  
> Fonte original: `https://www.ans.gov.br/arquivos/extras/tiss/Padrao_TUSS_Representacao_de_Conceitos_em_Saude_202603.zip`  
> ZIP original: 552.219.113 bytes

---

## Critérios de aprovação globais

| Critério | Threshold |
|----------|-----------|
| `_meta` presente em todas as respostas | 4/4 tools (100%) |
| `modo` correto — `cache_local` com dados sincronizados | 4/4 tools |
| `competencia` = "202603" | 4/4 tools |
| Código inexistente → array vazio, sem throw | 3/3 tools de busca |
| Erro semântico (sem codigo nem query) → `error` estruturado | 3/3 tools de busca |
| Paginação respeita `limit` | buscar_procedimento_tuss ✅ |
| Busca com acentuação funciona | buscar_procedimento_tuss ✅ |
| `status_sincronizacao_tuss` total_registros corretos | ≥ 5900 / 43000 / 3500 |

---

## Resultados consolidados

### Resumo executivo

Run `20260513_T230402` — **25/25 PASS. 0 FAIL. 0 SKIP.**

Executado contra `tuss_real.db` (ANS TUSS 202603, 53.250 registros).  
Tempo total: 41ms. p50: 1ms. p95: 7ms. p99: 7ms.  
Logs por cenário: `resultados/run_20260513_T230402/logs/C01_pass.log` … `C25_pass.log`.  
Relatório auto-gerado: `resultados/run_20260513_T230402/relatorio.md`.

### Métricas globais

| Métrica | Valor |
|---------|-------|
| Cenários executados | 25 |
| PASS | **25** ✅ |
| FAIL | 0 |
| SKIP | 0 |
| Latência total | 41ms |
| Latência p50 | 1ms |
| Latência p95 | 7ms |
| Latência p99 | 7ms |

### Status por tool

| Tool | Cenários | PASS | FAIL |
|------|----------|------|------|
| `buscar_procedimento_tuss` | 11 | 11 | 0 |
| `buscar_medicamento_tuss` | 6 | 6 | 0 |
| `buscar_diaria_taxa_tuss` | 6 | 6 | 0 |
| `status_sincronizacao_tuss` | 7 | 7 | 0 |
| `(transversal)` | 1 | 1 | 0 |

### Status por cenário

| # | Cenário | Status | ms |
|---|---------|--------|-----|
| C01 | Médico busca consulta por query | ✅ PASS | 4 |
| C02 | Faturista busca hemograma código 40304361 | ✅ PASS | 1 |
| C03 | Farmacêutico busca Dipirona por query | ✅ PASS | 2 |
| C04 | Farmacêutico consulta código 90282680 | ✅ PASS | 0 |
| C05 | Faturista hospitalar busca diária UTI | ✅ PASS | 1 |
| C06 | Operadora verifica diária 60000279 | ✅ PASS | 0 |
| C07 | Dev verifica status sincronização | ✅ PASS | 2 |
| C08 | Busca com acentuação (ressonância) | ✅ PASS | 2 |
| C09 | Busca parcial tomografia limit=5 | ✅ PASS | 1 |
| C10 | Paginação limit=3 | ✅ PASS | 0 |
| C11 | Input inválido sem args | ✅ PASS | 1 |
| C12 | Código inexistente 99999999 | ✅ PASS | 0 |
| C13 | _meta em 100% dos 4 tools | ✅ PASS | 0 |
| C14 | Medicamento inexistente 00000000 | ✅ PASS | 1 |
| C15 | Diária inexistente 00000000 | ✅ PASS | 0 |
| C16 | buscar_medicamento sem args → error | ✅ PASS | 0 |
| C17 | buscar_medicamento limit=2 | ✅ PASS | 1 |
| C18 | buscar_diaria sem args → error | ✅ PASS | 0 |
| C19 | buscar_diaria 'internação' acento | ✅ PASS | 6 |
| C20 | status _meta array 3 entradas | ✅ PASS | 0 |
| C21 | status competencia 202603 | ✅ PASS | 0 |
| C22 | SQL injection via 'codigo' — tabela intacta | ✅ PASS | 1 |
| C23 | SQL injection via 'query' — sem crash | ✅ PASS | 5 |
| C24 | TOOL_ANNOTATIONS corretos (spec MCP) | ✅ PASS | 0 |
| C25 | modo degraded THRESHOLD=-1 → stale | ✅ PASS | 0 |

### Issues encontradas

**Nenhuma issue.**

### Próximos passos

1. Adicionar tool `buscar_opme_tuss` (TUSS 19 — 105MB XLSX)
2. Cenário degraded: testar com `MCPASSURE_DEGRADED_THRESHOLD_DAYS=0`
3. Investigar auth do Rol ANS (endpoint gov.br 403)
4. Índice FTS5 para buscas mais rápidas
