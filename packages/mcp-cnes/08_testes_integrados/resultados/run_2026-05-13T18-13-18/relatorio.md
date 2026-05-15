# Relatório de Testes Integrados — Run 2026-05-13T18-13-18

**Versão testada:** `@mcpassure/mcp-cnes` v1.1.0
**Data/hora:** 2026-05-13T18:13:18Z
**Modo:** offline (t03-fallback e t04-ftp pulados)
**Banco:** run local em memória com seed de 6 hospitais reais
**Comando:** `npm run test:integration -- --offline`

---

## Métricas globais

| Métrica | Valor |
|---|---|
| Total de casos | 93 |
| Passaram (PASS) | 93 |
| Falharam (FAIL) | 0 |
| Pulados (SKIP) | 0 |
| Taxa de sucesso | 100% |
| Tempo total | 60ms |
| Latência p50 | < 1ms |
| Latência p95 | 4ms |
| Latência p99 | < 10ms (todos < 500ms) |

---

## Tabela por cenário

| Suite | ID | Cenário | Status | ms |
|---|---|---|---|---|
| t01-queries | Q01 | porCodigo retorna HC FMUSP | ✅ PASS | 0 |
| t01-queries | Q02 | porCodigo retorna InCor | ✅ PASS | 0 |
| t01-queries | Q03 | porCodigo retorna null para CNES inexistente | ✅ PASS | 0 |
| t01-queries | Q04 | porCodigo co_municipio normalizado para 6 dígitos | ✅ PASS | 0 |
| t01-queries | Q05 | porNome busca parcial case-insensitive | ✅ PASS | 1 |
| t01-queries | Q06 | porNome filtra por UF SP | ✅ PASS | 0 |
| t01-queries | Q07 | porNome filtra por UF SC retorna HU UFSC | ✅ PASS | 0 |
| t01-queries | Q08 | porNome UF inexistente retorna array vazio | ✅ PASS | 0 |
| t01-queries | Q09 | porNome respeita limit | ✅ PASS | 0 |
| t01-queries | Q10 | porMunicipio São Paulo (355030) | ✅ PASS | 0 |
| t01-queries | Q11 | porMunicipio Florianópolis (420540) | ✅ PASS | 0 |
| t01-queries | Q12 | porMunicipio com filtro tipo hospital | ✅ PASS | 1 |
| t01-queries | Q13 | porMunicipio IBGE inexistente retorna vazio | ✅ PASS | 0 |
| t01-queries | Q14 | porTipo hospitais em SP | ✅ PASS | 0 |
| t01-queries | Q15 | porTipo hospitais em RJ retorna INCA | ✅ PASS | 0 |
| t01-queries | Q16 | porTipo tipo inexistente retorna vazio | ✅ PASS | 0 |
| t01-queries | Q17 | leitosPorCnes retorna leitos do HC FMUSP | ✅ PASS | 0 |
| t01-queries | Q18 | leitosPorCnes UTI adulto existente no HC FMUSP | ✅ PASS | 0 |
| t01-queries | Q19 | leitosPorCnes leitos UTI têm qt_exist > 0 | ✅ PASS | 1 |
| t01-queries | Q20 | leitosPorCnes InCor tem UTI Coronariana | ✅ PASS | 0 |
| t01-queries | Q21 | leitosPorCnes CNES sem leitos retorna vazio | ✅ PASS | 0 |
| t01-queries | Q22 | equipamentosPorCnes retorna equipamentos do HC FMUSP | ✅ PASS | 0 |
| t01-queries | Q23 | equipamentosPorCnes HC FMUSP tem ressonância magnética (031) | ✅ PASS | 0 |
| t01-queries | Q24 | equipamentosPorCnes HC FMUSP tem tomógrafo (032) | ✅ PASS | 0 |
| t01-queries | Q25 | equipamentosPorCnes INCA tem equipamento de radioterapia (017) | ✅ PASS | 0 |
| t01-queries | Q26 | equipamentosPorCnes CNES sem equipamentos retorna vazio | ✅ PASS | 0 |
| t01-queries | Q27 | profissionaisPorCnes retorna profissionais do HC FMUSP | ✅ PASS | 0 |
| t01-queries | Q28 | profissionaisPorCnes CPFs estão mascarados | ✅ PASS | 1 |
| t01-queries | Q29 | profissionaisPorCnes HU UFSC tem profissionais | ✅ PASS | 0 |
| t01-queries | Q30 | profissionaisPorCnes campos obrigatórios preenchidos | ✅ PASS | 0 |
| t01-queries | Q31 | servicosPorCnes retorna serviços do HC FMUSP | ✅ PASS | 0 |
| t01-queries | Q32 | servicosPorCnes HC FMUSP tem serviço de oncologia | ✅ PASS | 0 |
| t01-queries | Q33 | servicosPorCnes INCA tem radioterapia | ✅ PASS | 0 |
| t01-queries | Q34 | servicosPorCnes co_cnes correto em todos os registros | ✅ PASS | 0 |
| t01-queries | Q35 | servicosPorCnes CNES sem serviços retorna vazio | ✅ PASS | 0 |
| t01-queries | Q36 | co_municipio de São Paulo é 355030 (6 dígitos) | ✅ PASS | 0 |
| t01-queries | Q37 | HU UFSC está em Florianópolis (SC) | ✅ PASS | 0 |
| t01-queries | Q38 | INCA está no Rio de Janeiro (RJ) | ✅ PASS | 1 |
| t01-queries | Q39 | vinculoSus é booleano nos estabelecimentos | ✅ PASS | 0 |
| t01-queries | Q40 | coordinates são números quando presentes | ✅ PASS | 0 |
| t02-tools | T01 | buscar_por_codigo_cnes: HC FMUSP retorna encontrado=true | ✅ PASS | 4 |
| t02-tools | T02 | buscar_por_codigo_cnes: CNES inexistente retorna encontrado=false | ✅ PASS | 1 |
| t02-tools | T03 | buscar_por_codigo_cnes: InCor retorna hospital especializado | ✅ PASS | 0 |
| t02-tools | T04 | buscar_por_codigo_cnes: CNES inválido retorna erro de validação | ✅ PASS | 1 |
| t02-tools | T05 | buscar_por_nome: 'clinicas' retorna resultados em SP | ✅ PASS | 2 |
| t02-tools | T06 | buscar_por_nome: limite máximo 50 | ✅ PASS | 0 |
| t02-tools | T07 | buscar_por_nome: nome com < 3 chars retorna erro | ✅ PASS | 1 |
| t02-tools | T08 | buscar_por_nome: sem UF retorna resultados | ✅ PASS | 1 |
| t02-tools | T09 | buscar_por_municipio: São Paulo (355030) | ✅ PASS | 0 |
| t02-tools | T10 | buscar_por_municipio: Florianópolis retorna HU UFSC | ✅ PASS | 1 |
| t02-tools | T11 | buscar_por_municipio: IBGE inexistente retorna 0 | ✅ PASS | 0 |
| t02-tools | T12 | buscar_por_tipo: hospitais em SP | ✅ PASS | 1 |
| t02-tools | T13 | buscar_por_tipo: hospitais em SC retornam HU UFSC | ✅ PASS | 0 |
| t02-tools | T14 | buscar_por_tipo: tipo com município filtra | ✅ PASS | 3 |
| t02-tools | T15 | listar_profissionais: HC FMUSP tem profissionais | ✅ PASS | 1 |
| t02-tools | T16 | listar_profissionais: CPFs todos mascarados | ✅ PASS | 0 |
| t02-tools | T17 | listar_profissionais: CNES sem profissionais retorna 0 | ✅ PASS | 1 |
| t02-tools | T18 | listar_leitos: HC FMUSP tem leitos UTI | ✅ PASS | 0 |
| t02-tools | T19 | listar_leitos: InCor tem UTI Coronariana | ✅ PASS | 0 |
| t02-tools | T20 | listar_leitos: INCA tem leitos clínicos e cirúrgicos | ✅ PASS | 1 |
| t02-tools | T21 | listar_leitos: CNES sem leitos retorna 0 | ✅ PASS | 0 |
| t02-tools | T22 | listar_equipamentos: HC FMUSP tem equipamentos | ✅ PASS | 1 |
| t02-tools | T23 | listar_equipamentos: HC FMUSP tem ressonância (031) | ✅ PASS | 0 |
| t02-tools | T24 | listar_equipamentos: INCA tem radioterapia (017) | ✅ PASS | 0 |
| t02-tools | T25 | listar_equipamentos: CNES sem equip retorna 0 | ✅ PASS | 1 |
| t02-tools | T26 | listar_servicos: HC FMUSP tem serviços | ✅ PASS | 0 |
| t02-tools | T27 | listar_servicos: INCA tem serviço de oncologia | ✅ PASS | 1 |
| t02-tools | T28 | listar_servicos: CNES sem serviços retorna 0 | ✅ PASS | 0 |
| t02-tools | T29 | todas as tools retornam structuredContent | ✅ PASS | 2 |
| t02-tools | T30 | latência de todas as tools < 500ms | ✅ PASS | 1 |
| t03-fallback | — | REST TCU (skip offline) | ⏭ SKIP | — |
| t04-ftp | — | FTP DATASUS (skip offline) | ⏭ SKIP | — |
| t05-scenarios | S01 | Médico busca HC FMUSP pelo nome | ✅ PASS | 1 |
| t05-scenarios | S02 | Gestor verifica dados cadastrais CNES 2077485 | ✅ PASS | 0 |
| t05-scenarios | S03 | Regulador verifica UTI HC FMUSP (580 leitos) | ✅ PASS | 1 |
| t05-scenarios | S04 | Pesquisador lista hospitais SP | ✅ PASS | 0 |
| t05-scenarios | S05 | Cardiologista equipamentos InCor | ✅ PASS | 1 |
| t05-scenarios | S06 | Gestor SC hospitais Florianópolis (HU UFSC) | ✅ PASS | 0 |
| t05-scenarios | S07 | Oncologista localiza INCA no RJ | ✅ PASS | 0 |
| t05-scenarios | S08 | HC FMUSP realiza transplantes | ✅ PASS | 1 |
| t05-scenarios | S09 | Profissionais HCPA com privacidade (CPF mascarado) | ✅ PASS | 0 |
| t05-scenarios | S10 | CNES 9999999 inexistente → found=false + mensagem | ✅ PASS | 1 |
| t05-scenarios | S11 | Rede assistencial SP por tipo | ✅ PASS | 0 |
| t05-scenarios | S12 | INCA tem radioterapia (017) × 3 unidades | ✅ PASS | 1 |
| t05-scenarios | S13 | Leitos UTI hospitais DF (Hospital Base DF: 150 UTI) | ✅ PASS | 0 |
| t05-scenarios | S14 | Busca "einstein" → 0 resultados (sem crash) | ✅ PASS | 1 |
| t05-scenarios | S15 | Performance: 8 queries em 2ms (< 2000ms) | ✅ PASS | 3 |
| t06-meta | M01 | _meta em buscar_por_codigo_cnes (encontrado) | ✅ PASS | 1 |
| t06-meta | M02 | _meta em buscar_por_codigo_cnes (não encontrado) | ✅ PASS | 0 |
| t06-meta | M03 | _meta em buscar_por_nome | ✅ PASS | 1 |
| t06-meta | M04 | _meta em buscar_por_municipio | ✅ PASS | 0 |
| t06-meta | M05 | _meta em listar_leitos | ✅ PASS | 0 |
| t06-meta | M06 | _meta em listar_equipamentos | ✅ PASS | 1 |
| t06-meta | M07 | _meta em listar_profissionais | ✅ PASS | 0 |
| t06-meta | M08 | _meta.modo=cache_local em todas as 8 tools | ✅ PASS | 3 |

---

## Bugs/inconsistências encontradas

Nenhum bug encontrado.

**Observações:**
1. `_meta.competencia = ""` em todos os testes de integração — esperado, pois o seed não popula `sync_log`. O comportamento correto (competência preenchida) é validado em `tests/domain/repository.test.ts`.
2. Testes t03 e t04 pulados por modo offline — não são falhas, são skips esperados.

---

## Próximos passos sugeridos

1. Executar sem `--offline` para validar t03-fallback e t04-ftp
2. `npm run canary` com rede para validar FTP e TCU upstream
3. Push para `github.com/mcpassure/mcp-cnes` e configurar Actions
4. Monitorar canário por 7 dias para release v1.1.0 oficial
