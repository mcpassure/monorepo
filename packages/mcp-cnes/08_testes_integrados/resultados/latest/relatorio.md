# Relatório de Testes Integrados — MCP CNES

**Data:** 2026-05-13 07:12:59
**Run:** D:\ambiente_github\projetos pessoais\mcp_vetrum\2-mcp-CNES\08_testes_integrados\resultados\run_2026-05-13_041255
**Duração total:** 4067ms

---

## Resultado: ✅ TODOS PASSARAM

| Métrica | Valor |
|---|---|
| Total | 101 |
| PASS | 101 |
| FAIL | 0 |
| SKIP | 0 |
| Duração (suíte) | 756ms |
| Duração (run_all) | 4067ms |

---

## Ambiente

| Item | Valor |
|---|---|
| VETRUM_FTP_MOCK | não definido (auto-detectado pela suíte) |
| FTP real | detectado automaticamente pela suíte t04 |
| blast CLI | fake blast criado automaticamente pela suíte t04 |
| API TCU | mock HTTP local criado automaticamente pela suíte t03 |
| SQLite | in-memory (seed 6 hospitais) |

---

## Saída completa da suíte

```
a
  ✓ [0ms] Q34: servicosPorCnes co_cnes correto em todos os registros
  ✓ [0ms] Q35: servicosPorCnes CNES sem serviços retorna vazio
  ✓ [0ms] Q36: co_municipio de São Paulo é 355030 (6 dígitos)
  ✓ [0ms] Q37: HU UFSC está em Florianópolis (SC)
  ✓ [0ms] Q38: INCA está no Rio de Janeiro (RJ)
  ✓ [0ms] Q39: vinculoSus é booleano nos estabelecimentos
  ✓ [0ms] Q40: coordinates são números quando presentes

🔧 Suite: Tools MCP (8 ferramentas)
  ✓ [3ms] T01: buscar_por_codigo_cnes: HC FMUSP retorna encontrado=true
  ✓ [0ms] T02: buscar_por_codigo_cnes: CNES inexistente retorna encontrado=false
  ✓ [1ms] T03: buscar_por_codigo_cnes: InCor retorna hospital especializado
  ✓ [1ms] T04: buscar_por_codigo_cnes: CNES inválido (não 7 dígitos) retorna erro de validação
  ✓ [1ms] T05: buscar_por_nome: 'clinicas' retorna resultados em SP
  ✓ [0ms] T06: buscar_por_nome: limite máximo 50
  ✓ [1ms] T07: buscar_por_nome: nome com menos de 3 caracteres retorna erro
  ✓ [0ms] T08: buscar_por_nome: busca sem UF retorna resultados
  ✓ [0ms] T09: buscar_por_municipio: São Paulo (355030) retorna estabelecimentos
  ✓ [1ms] T10: buscar_por_municipio: Florianópolis (420540) retorna HU UFSC
  ✓ [0ms] T11: buscar_por_municipio: IBGE inexistente retorna total 0
  ✓ [1ms] T12: buscar_por_tipo: hospitais em SP retornam resultados
  ✓ [0ms] T13: buscar_por_tipo: hospitais em SC retornam HU UFSC
  ✓ [0ms] T14: buscar_por_tipo: tipo com município filtra corretamente
  ✓ [1ms] T15: listar_profissionais: HC FMUSP tem profissionais
  ✓ [0ms] T16: listar_profissionais: CPFs todos mascarados
  ✓ [0ms] T17: listar_profissionais: CNES sem profissionais retorna total 0
  ✓ [1ms] T18: listar_leitos: HC FMUSP tem leitos UTI
  ✓ [0ms] T19: listar_leitos: InCor tem UTI Coronariana
  ✓ [1ms] T20: listar_leitos: INCA tem leitos clínicos e cirúrgicos
  ✓ [0ms] T21: listar_leitos: CNES sem leitos retorna total 0
  ✓ [1ms] T22: listar_equipamentos: HC FMUSP tem equipamentos
  ✓ [0ms] T23: listar_equipamentos: HC FMUSP tem ressonância (031)
  ✓ [0ms] T24: listar_equipamentos: INCA tem radioterapia (017)
  ✓ [0ms] T25: listar_equipamentos: CNES sem equipamentos retorna total 0
  ✓ [1ms] T26: listar_servicos: HC FMUSP tem serviços especializados
  ✓ [2ms] T27: listar_servicos: INCA tem serviço de oncologia
  ✓ [1ms] T28: listar_servicos: CNES sem serviços retorna total 0
  ✓ [2ms] T29: todas as tools retornam structuredContent
  ✓ [1ms] T30: latência de todas as tools < 500ms com SQLite local

🌐 Suite: Fallback REST API TCU
  ℹ API TCU offline — usando mock HTTP local (sem pular testes)
  ✓ Mock server rodando em :56977
  ✓ [15ms] F01: buscarPorCodigoCnes: HC FMUSP (2077485) via API
  ✓ [11ms] F02: buscarPorCodigoCnes: CNES inexistente retorna null
  ✓ [8ms] F03: buscarPorNomeFallback: 'hospital das clinicas' retorna resultados
  ✓ [8ms] F04: buscarPorNomeFallback: todos resultados têm source=online_fallback
  ✓ [8ms] F05: buscarPorNomeFallback: codigoCnes tem 7 dígitos
  ✓ [7ms] F06: buscarPorNomeFallback com UF filtra resultados
    → Diagnóstico codUnidade: {"formato7":"FUNCIONA","formato13":"FUNCIONA"}
  ✓ [16ms] F07: diagnóstico: formato codUnidade correto (7 vs 13 dígitos)

📡 Suite: FTP DATASUS + Pipeline DBC
  ℹ FTP inacessível — ativando VETRUM_FTP_MOCK=1 (sem pular testes)
  ℹ blast não encontrado — criando fake blast para testes de pipeline
  ✓ Fake blast criado em C:\Users\dtorn\AppData\Local\Temp\vetrum-blast-mock-1778656379818
  ✓ [0ms] FTP01: listarArquivos ST SP retorna lista não-vazia
  ✓ [0ms] FTP02: listarArquivos LT SC retorna arquivos
  ✓ [0ms] FTP03: listarArquivos ordena por competência mais recente primeiro
  ✓ [0ms] FTP04: listarArquivos nome segue padrão GRUPO+UF+AAAA+MM.dbc
  ✓ [0ms] FTP05: listarArquivos PF SP tem competência recente (após 2024)
    → Baixando STSC202501.dbc (202501) de ST/SC...
    → STSC202501.dbc baixado: 0.3 KB
  ✓ [1ms] FTP06: downloadArquivo ST SC baixa arquivo DBC
    → CSV gerado: 0.3 KB
  ✓ [72ms] FTP07: converterDbcParaCsv: blast converte DBC para CSV
    → Ingeridos: 1 registros
  ✓ [10ms] FTP08: ingerirCsv: insere registros de ST SC no banco
  ✓ [1ms] FTP09: ingestão idempotente: re-ingerir mesmo CSV não duplica registros

🎭 Suite: Simulação de Cenários de Usuário (15 cenários)
    → Usuário: "Qual o CNES do Hospital das Clínicas de São Paulo?"
    ✓ Encontrou: HOSPITAL DAS CLINICAS DA FMUSP (CNES: 2077485)
  ✓ [0ms] S01: Médico busca o Hospital das Clínicas de SP pelo nome
    → Usuário: "Preciso dos dados completos do CNES 2077485"
    ✓ HOSPITAL DAS CLINICAS DA FMUSP | Vínculo SUS: true
  ✓ [1ms] S02: Gestor verifica dados cadastrais do HC FMUSP
    → Usuário: "Quantos leitos de UTI tem o HC FMUSP?"
    ✓ UTI: 4 tipos, 580 leitos existentes, 515 SUS
  ✓ [0ms] S03: Regulador verifica capacidade UTI do HC FMUSP
    → Usuário: "Preciso listar todos os hospitais do município de São Paulo"
    ✓ 2 estabelecimentos encontrados em São Paulo
  ✓ [0ms] S04: Pesquisador lista hospitais em São Paulo para estudo de rede
    → Usuário: "Quais equipamentos cardíacos tem o InCor?"
    → Ecocardiograma: 10 unidades
    → Hemodinâmica (sala): 8 unidades
    → Ressonância Magnética: 2 unidades
    → Tomógrafo Computadorizado: 4 unidades
  ✓ [1ms] S05: Cardiologista verifica equipamentos do InCor
    → Usuário: "Quais hospitais existem em Florianópolis?"
    ✓ 1 hospitais em Florianópolis: HU PROF POLYDORO ERNANI DE SAO THIAGO UFSC
  ✓ [0ms] S06: Gestor em SC verifica hospitais de Florianópolis
    → Usuário: "Preciso encontrar o INCA no Rio de Janeiro"
    ✓ INCA INSTITUTO NACIONAL DE CANCER
  ✓ [1ms] S07: Oncologista localiza centros de oncologia
    → Usuário: "O HC FMUSP realiza transplantes?"
    ✓ Serviços: Transplante de Órgãos e Tecidos; Hemoterapia; Terapia Renal Substitutiva; Oncologia; Cirurgia Bariátrica e Metabólica
  ✓ [0ms] S08: Pesquisador verifica serviços de transplante disponíveis
    → Usuário: "Liste os profissionais cadastrados no HCPA"
    ✓ 6 profissionais com CPF mascarado
  ✓ [0ms] S09: Gestor RH verifica profissionais do HCPA com privacidade
    → Usuário informa CNES inexistente: "9999999"
    ✓ Retornou mensagem: "Estabelecimento CNES 9999999 não encontrado no dataset local...."
  ✓ [1ms] S10: Sistema verifica CNES inválido sem crash
    → Usuário: "Liste hospitais, UPA e UBS disponíveis em SP"
    ✓ SP: 2 hospitais, 0 UPA(s) no banco
  ✓ [0ms] S11: Pesquisador mapeia rede assistencial de SP por tipo
    → Usuário: "O INCA tem acelerador linear para radioterapia?"
    ✓ Radioterapia: 3 equipamento(s) no INCA
  ✓ [1ms] S12: Radioterapia: verificar equipamentos do INCA
    → Usuário: "Compare os leitos UTI dos hospitais do DF"
    → HOSPITAL DE BASE DO DISTRITO FEDERAL: 150 leitos UTI
    ✓ Total UTI nos hospitais do DF analisados: 150
  ✓ [0ms] S13: Múltiplos hospitais em DF para comparação de leitos UTI
    → Usuário: "Buscar hospitais Einstein"
    ✓ Encontrados: 0 resultados para "einstein"
  ✓ [0ms] S14: Busca por nome 'einstein' encontra hospital
    → Usuário: "Consultas sequenciais para relatório completo do HC FMUSP"
    ✓ 8 queries concluídas em 2ms (média: 0ms/query)
  ✓ [2ms] S15: Performance: 8 queries sequenciais < 2 segundos total

✅ 101 passaram, 0 falharam, 0 pulados (total 101) — 756ms

📊 Relatório salvo em: D:\ambiente_github\projetos pessoais\mcp_vetrum\2-mcp-CNES\integration-tests\results\2026-05-13T07-12-58

📊 Relatório salvo em: D:\ambiente_github\projetos pessoais\mcp_vetrum\2-mcp-CNES\integration-tests\results\latest

📁 Arquivos gerados:
   D:\ambiente_github\projetos pessoais\mcp_vetrum\2-mcp-CNES\integration-tests\results\2026-05-13T07-12-58\results.json
   D:\ambiente_github\projetos pessoais\mcp_vetrum\2-mcp-CNES\integration-tests\results\2026-05-13T07-12-58\summary.md
   D:\ambiente_github\projetos pessoais\mcp_vetrum\2-mcp-CNES\integration-tests\results\2026-05-13T07-12-58\cnes-test.db
   D:\ambiente_github\projetos pessoais\mcp_vetrum\2-mcp-CNES\integration-tests\results\latest\summary.md (latest)

```

---

## Links

- Plano: [08_testes_integrados/plano.md](../../plano.md)
- Fixtures: [08_testes_integrados/binarios/fixtures/](../fixtures/)
- Script: [08_testes_integrados/binarios/scripts/run_all.ts](run_all.ts)
