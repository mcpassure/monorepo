# Resultados dos Testes de Integração — MCP CNES

**Data:** 13/05/2026, 03:58:11
**Duração total:** 1120ms

## Resumo

| Total | Passaram | Falharam | Pulados |
|-------|----------|----------|---------|
| 101 | 96 | 5 | 0 |

**Resultado:** ❌ 5 FALHA(S)

## Detalhes por Suite

### t01-queries (40 passaram / 0 falharam / 40 total)

| ID | Nome | Status | Duração | Detalhe |
|----|------|--------|---------|---------|
| Q01 | porCodigo retorna HC FMUSP | ✓ pass | 0ms |  |
| Q02 | porCodigo retorna InCor | ✓ pass | 0ms |  |
| Q03 | porCodigo retorna null para CNES inexistente | ✓ pass | 0ms |  |
| Q04 | porCodigo co_municipio normalizado para 6 dígitos | ✓ pass | 1ms |  |
| Q05 | porNome busca parcial case-insensitive | ✓ pass | 0ms |  |
| Q06 | porNome filtra por UF SP | ✓ pass | 0ms |  |
| Q07 | porNome filtra por UF SC retorna HU UFSC | ✓ pass | 0ms |  |
| Q08 | porNome UF inexistente retorna array vazio | ✓ pass | 0ms |  |
| Q09 | porNome respeita limit | ✓ pass | 0ms |  |
| Q10 | porMunicipio São Paulo (355030) | ✓ pass | 0ms |  |
| Q11 | porMunicipio Florianópolis (420540) | ✓ pass | 0ms |  |
| Q12 | porMunicipio com filtro tipo hospital | ✓ pass | 0ms |  |
| Q13 | porMunicipio IBGE inexistente retorna vazio | ✓ pass | 0ms |  |
| Q14 | porTipo hospitais em SP | ✓ pass | 0ms |  |
| Q15 | porTipo hospitais em RJ retorna INCA | ✓ pass | 0ms |  |
| Q16 | porTipo tipo inexistente retorna vazio | ✓ pass | 0ms |  |
| Q17 | leitosPorCnes retorna leitos do HC FMUSP | ✓ pass | 1ms |  |
| Q18 | leitosPorCnes UTI adulto existente no HC FMUSP | ✓ pass | 0ms |  |
| Q19 | leitosPorCnes leitos UTI têm qt_exist > 0 | ✓ pass | 0ms |  |
| Q20 | leitosPorCnes InCor tem UTI Coronariana | ✓ pass | 0ms |  |
| Q21 | leitosPorCnes CNES sem leitos retorna vazio | ✓ pass | 0ms |  |
| Q22 | equipamentosPorCnes retorna equipamentos do HC FMUSP | ✓ pass | 0ms |  |
| Q23 | equipamentosPorCnes HC FMUSP tem ressonância magnética (031) | ✓ pass | 0ms |  |
| Q24 | equipamentosPorCnes HC FMUSP tem tomógrafo (032) | ✓ pass | 0ms |  |
| Q25 | equipamentosPorCnes INCA tem equipamento de radioterapia (017) | ✓ pass | 0ms |  |
| Q26 | equipamentosPorCnes CNES sem equipamentos retorna vazio | ✓ pass | 0ms |  |
| Q27 | profissionaisPorCnes retorna profissionais do HC FMUSP | ✓ pass | 1ms |  |
| Q28 | profissionaisPorCnes CPFs estão mascarados | ✓ pass | 0ms |  |
| Q29 | profissionaisPorCnes HU UFSC tem profissionais | ✓ pass | 0ms |  |
| Q30 | profissionaisPorCnes campos obrigatórios preenchidos | ✓ pass | 0ms |  |
| Q31 | servicosPorCnes retorna serviços do HC FMUSP | ✓ pass | 0ms |  |
| Q32 | servicosPorCnes HC FMUSP tem serviço de oncologia | ✓ pass | 0ms |  |
| Q33 | servicosPorCnes INCA tem radioterapia | ✓ pass | 0ms |  |
| Q34 | servicosPorCnes co_cnes correto em todos os registros | ✓ pass | 0ms |  |
| Q35 | servicosPorCnes CNES sem serviços retorna vazio | ✓ pass | 0ms |  |
| Q36 | co_municipio de São Paulo é 355030 (6 dígitos) | ✓ pass | 0ms |  |
| Q37 | HU UFSC está em Florianópolis (SC) | ✓ pass | 0ms |  |
| Q38 | INCA está no Rio de Janeiro (RJ) | ✓ pass | 1ms |  |
| Q39 | vinculoSus é booleano nos estabelecimentos | ✓ pass | 0ms |  |
| Q40 | coordinates são números quando presentes | ✓ pass | 0ms |  |

### t02-tools (30 passaram / 0 falharam / 30 total)

| ID | Nome | Status | Duração | Detalhe |
|----|------|--------|---------|---------|
| T01 | buscar_por_codigo_cnes: HC FMUSP retorna encontrado=true | ✓ pass | 2ms |  |
| T02 | buscar_por_codigo_cnes: CNES inexistente retorna encontrado=false | ✓ pass | 1ms |  |
| T03 | buscar_por_codigo_cnes: InCor retorna hospital especializado | ✓ pass | 0ms |  |
| T04 | buscar_por_codigo_cnes: CNES inválido (não 7 dígitos) retorna erro de validação | ✓ pass | 1ms |  |
| T05 | buscar_por_nome: 'clinicas' retorna resultados em SP | ✓ pass | 0ms |  |
| T06 | buscar_por_nome: limite máximo 50 | ✓ pass | 1ms |  |
| T07 | buscar_por_nome: nome com menos de 3 caracteres retorna erro | ✓ pass | 0ms |  |
| T08 | buscar_por_nome: busca sem UF retorna resultados | ✓ pass | 1ms |  |
| T09 | buscar_por_municipio: São Paulo (355030) retorna estabelecimentos | ✓ pass | 1ms |  |
| T10 | buscar_por_municipio: Florianópolis (420540) retorna HU UFSC | ✓ pass | 0ms |  |
| T11 | buscar_por_municipio: IBGE inexistente retorna total 0 | ✓ pass | 0ms |  |
| T12 | buscar_por_tipo: hospitais em SP retornam resultados | ✓ pass | 1ms |  |
| T13 | buscar_por_tipo: hospitais em SC retornam HU UFSC | ✓ pass | 0ms |  |
| T14 | buscar_por_tipo: tipo com município filtra corretamente | ✓ pass | 1ms |  |
| T15 | listar_profissionais: HC FMUSP tem profissionais | ✓ pass | 0ms |  |
| T16 | listar_profissionais: CPFs todos mascarados | ✓ pass | 0ms |  |
| T17 | listar_profissionais: CNES sem profissionais retorna total 0 | ✓ pass | 0ms |  |
| T18 | listar_leitos: HC FMUSP tem leitos UTI | ✓ pass | 0ms |  |
| T19 | listar_leitos: InCor tem UTI Coronariana | ✓ pass | 0ms |  |
| T20 | listar_leitos: INCA tem leitos clínicos e cirúrgicos | ✓ pass | 0ms |  |
| T21 | listar_leitos: CNES sem leitos retorna total 0 | ✓ pass | 1ms |  |
| T22 | listar_equipamentos: HC FMUSP tem equipamentos | ✓ pass | 0ms |  |
| T23 | listar_equipamentos: HC FMUSP tem ressonância (031) | ✓ pass | 0ms |  |
| T24 | listar_equipamentos: INCA tem radioterapia (017) | ✓ pass | 1ms |  |
| T25 | listar_equipamentos: CNES sem equipamentos retorna total 0 | ✓ pass | 0ms |  |
| T26 | listar_servicos: HC FMUSP tem serviços especializados | ✓ pass | 0ms |  |
| T27 | listar_servicos: INCA tem serviço de oncologia | ✓ pass | 1ms |  |
| T28 | listar_servicos: CNES sem serviços retorna total 0 | ✓ pass | 0ms |  |
| T29 | todas as tools retornam structuredContent | ✓ pass | 1ms |  |
| T30 | latência de todas as tools < 500ms com SQLite local | ✓ pass | 1ms |  |

### t03-fallback (3 passaram / 4 falharam / 7 total)

| ID | Nome | Status | Duração | Detalhe |
|----|------|--------|---------|---------|
| F01 | buscarPorCodigoCnes: HC FMUSP (2077485) via API | ✗ fail | 44ms | AssertionError: deve retornar HC FMUSP |
| F02 | buscarPorCodigoCnes: CNES inexistente retorna null | ✓ pass | 49ms |  |
| F03 | buscarPorNomeFallback: 'hospital das clinicas' retorna resultados | ✗ fail | 42ms | AssertionError: deve retornar ao menos 1 resultado: expected 0 > 0 |
| F04 | buscarPorNomeFallback: todos resultados têm source=online_fallback | ✗ fail | 47ms | AssertionError: assertGreater: expected 0 > 0 |
| F05 | buscarPorNomeFallback: codigoCnes tem 7 dígitos | ✗ fail | 48ms | AssertionError: assertGreater: expected 0 > 0 |
| F06 | buscarPorNomeFallback com UF filtra resultados | ✓ pass | 50ms |  |
| F07 | diagnóstico: formato codUnidade correto (7 vs 13 dígitos) | ✓ pass | 125ms |  |

### t04-ftp (9 passaram / 0 falharam / 9 total)

| ID | Nome | Status | Duração | Detalhe |
|----|------|--------|---------|---------|
| FTP01 | listarArquivos ST SP retorna lista não-vazia | ✓ pass | 0ms |  |
| FTP02 | listarArquivos LT SC retorna arquivos | ✓ pass | 0ms |  |
| FTP03 | listarArquivos ordena por competência mais recente primeiro | ✓ pass | 1ms |  |
| FTP04 | listarArquivos nome segue padrão GRUPO+UF+AAAA+MM.dbc | ✓ pass | 0ms |  |
| FTP05 | listarArquivos PF SP tem competência recente (após 2024) | ✓ pass | 0ms |  |
| FTP06 | downloadArquivo ST SC baixa arquivo DBC | ✓ pass | 1ms |  |
| FTP07 | converterDbcParaCsv: blast converte DBC para CSV | ✓ pass | 58ms |  |
| FTP08 | ingerirCsv: insere registros de ST SC no banco | ✓ pass | 36ms |  |
| FTP09 | ingestão idempotente: re-ingerir mesmo CSV não duplica registros | ✓ pass | 1ms |  |

### t05-scenarios (14 passaram / 1 falharam / 15 total)

| ID | Nome | Status | Duração | Detalhe |
|----|------|--------|---------|---------|
| S01 | Médico busca o Hospital das Clínicas de SP pelo nome | ✓ pass | 1ms |  |
| S02 | Gestor verifica dados cadastrais do HC FMUSP | ✗ fail | 1ms | AssertionError: HC FMUSP deve ter vínculo SUS |
| S03 | Regulador verifica capacidade UTI do HC FMUSP | ✓ pass | 0ms |  |
| S04 | Pesquisador lista hospitais em São Paulo para estudo de rede | ✓ pass | 1ms |  |
| S05 | Cardiologista verifica equipamentos do InCor | ✓ pass | 0ms |  |
| S06 | Gestor em SC verifica hospitais de Florianópolis | ✓ pass | 1ms |  |
| S07 | Oncologista localiza centros de oncologia | ✓ pass | 0ms |  |
| S08 | Pesquisador verifica serviços de transplante disponíveis | ✓ pass | 1ms |  |
| S09 | Gestor RH verifica profissionais do HCPA com privacidade | ✓ pass | 0ms |  |
| S10 | Sistema verifica CNES inválido sem crash | ✓ pass | 0ms |  |
| S11 | Pesquisador mapeia rede assistencial de SP por tipo | ✓ pass | 1ms |  |
| S12 | Radioterapia: verificar equipamentos do INCA | ✓ pass | 0ms |  |
| S13 | Múltiplos hospitais em DF para comparação de leitos UTI | ✓ pass | 1ms |  |
| S14 | Busca por nome 'einstein' encontra hospital | ✓ pass | 0ms |  |
| S15 | Performance: 8 queries sequenciais < 2 segundos total | ✓ pass | 2ms |  |
