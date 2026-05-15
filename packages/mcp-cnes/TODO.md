# TODO — mcp-cnes

## v1.1.1 (atual)
Concluído:
- ✅ Refactor adapter pattern (ICnesRepository) + _meta em todos outputs
- ✅ Schema baseline + canário diário (FTP DATASUS)
- ✅ Remoção do fallback REST TCU (endpoint quebrado upstream — `codUnidade` ≠ CNES)
- ✅ Coluna `extra_json` nas 5 tabelas (resiliência contra drift de schema do DBC)
- ✅ Mensagens claras de orientação ao usuário quando cache vazio (`"rode sync primeiro"`)
- ✅ Modo `cache_vazio` no `_meta` substituindo `online_fallback`

## v1.2 (roadmap)

### Alta prioridade
- [ ] **Pre-built SQLite como GitHub Release artifact**
      Pipeline no GitHub Actions converte dumps DBC → SQLite e publica `cnes-{competencia}.db.zip`
      como asset de Release. MCP detecta cache vazio e oferece `npx @mcpassure/mcp-cnes pull-snapshot`
      para baixar o db pronto, eliminando dependência do binário `blast` na máquina do usuário.
      Resolve o caso 90% (consulta de leitura) sem auth, sem sync, sem CLI externa.

- [ ] **Tabela `*_history` (SCD Type 2)**
      Append-only por (CNES × competência) para suportar consultas históricas.
      Padrão atualmente é `INSERT OR REPLACE`, perdendo o snapshot anterior.
      Casos de uso: "esse hospital teve mudança de razão social desde 2020?",
      "quando o leito de UTI foi cadastrado?".

- [ ] **`mark_missing_inactive` no sync nacional**
      Quando sync cobre todas as UFs, marcar como `st_ativo = 0` os CNES que
      apareciam na competência anterior e sumiram na atual. Hoje a base
      acumula "fantasmas" de estabelecimentos fechados.

### Média prioridade
- [ ] **Avaliar lib TypeScript de parsing DBC nativa**
      Hoje depende do binário `blast` (C/CLI) instalado externamente. Difícil em Windows.
      Alternativas a investigar: `pyreaddbc` wrapped, port de `pysus.utilities.readdbc`,
      ou consumir dumps já convertidos (algumas mirrors expõem CSV).

- [ ] **Configurar `NPM_TOKEN` no GitHub Secrets**
      Workflow `Publish` falha hoje porque secret não existe.
      Necessário antes de publicar `1.1.0` final (sem `-rc1`) no npm.

- [ ] **Filter no workflow Publish para ignorar tags pre-release**
      Hoje toda tag `v*` dispara publish, incluindo `v1.1.0-rc1`.
      Adicionar regex que só aceita `v[0-9]+.[0-9]+.[0-9]+` (sem sufixo).

### Baixa prioridade
- [ ] **Atualizar spec 4-spec.md v1.1 → v1.2**
      Documentar formalmente: remoção do fallback online, adição do extra_json,
      roadmap de pre-built database.

- [ ] **Geocoding via centroide do município**
      Quando `nu_latitude`/`nu_longitude` do DBC está vazio (acontece com frequência),
      preencher com centroide do município via tabela `municipios_ibge` carregada
      no sync inicial. Padrão similar ao usado em sistemas Postgres+PostGIS.

## Conhecimento operacional

### Descobertas do canário em 2026-05
- Formato real dos arquivos no FTP DATASUS é `{GRUPO}{UF}{AAMM}.dbc`
  (4 letras + 4 dígitos), ex: `STSP2603.dbc`. O spec original assumia `AAAAMM`
  (6 dígitos) — incorreto. Canário implementa lista de regex candidatas para
  tolerar variações futuras.
- TCU mobile-aceite (`mobile-aceite.tcu.gov.br/mapa-da-saude/rest`) usa
  `codUnidade` (ID interno do TCU), NÃO o código CNES. Fallback original
  da v1.0 nunca funcionou de verdade — só apareceu OK porque os 2 testes
  com fallback estavam marcados como `skip` em modo offline.
- API DEMAS oficial (`apidadosabertos.saude.gov.br`) é a alternativa moderna
  mantida pelo Ministério da Saúde, mas exige autenticação login+senha
  com cadastro de IP. Incompatível com UX `npx -y` zero-config. Pode ser
  considerada como fonte premium na v2.0 enterprise.
