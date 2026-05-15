# Changelog

All notable changes to `@mcpassure/mcp-cnes` are documented here.

---

## [0.1.1] — 2026-05-15

### Added
- Bootstrap R2: `src/bootstrap.ts` — ao iniciar, o servidor verifica o manifest em `mcpassure-datasets/cnes/latest/manifest.json`, compara SHA-256 e baixa o artifact se necessário. Fallback offline automático quando R2 inacessível e cache local existe.
- `structuredContent` em todas as 8 tools (confirmar presença já em 0.1.0; documentado explicitamente nesta versão).
- LGPD masking opt-in: CPFs de profissionais são mascarados por padrão no formato `***.***.XXX-**`. Para ambientes internos de auditoria, configure `MCPASSURE_LGPD_ALLOW_PII=cnes` para exibir CPFs completos.
- `src/utils/lgpd.ts`: funções `maskCpf()` e `shouldMask()` com testes unitários.
- Testes unitários para bootstrap R2 (offline/fallback/credenciais parciais).

### Changed (BREAKING — env vars)
- Env vars renomeadas de `VETRUM_*` para `MCPASSURE_*`:
  - `VETRUM_FTP_HOST` → `MCPASSURE_FTP_HOST`
  - `VETRUM_FTP_MOCK` → `MCPASSURE_FTP_MOCK`
  - `VETRUM_DBC_FIXTURE` → `MCPASSURE_DBC_FIXTURE`
- **Backward compat:** as variáveis `VETRUM_*` ainda funcionam como fallback nesta versão. Suporte removido em `v0.2.0`.
- Formato de masking de CPF atualizado: de `***.XXX.XXX-**` para `***.***.XXX-**` (preserva apenas dígitos 7-9, maior privacidade).

### Dependency
- Adicionada dependência `aws4fetch` para autenticação com Cloudflare R2.

### Deferred (próxima sprint)
- Worker Cloudflare cron para sync automático FTP DATASUS → R2. Estimativa > 4h, deferido para sprint 0.4. Nesta sprint, o upload ao R2 é manual via `scripts/`.

---

## [0.1.0] — 2026-05-13

### Added
- Versão inicial publicada.
- 8 tools MCP: `buscar_por_codigo_cnes`, `buscar_por_nome`, `buscar_por_municipio`, `buscar_por_tipo`, `listar_profissionais`, `listar_leitos`, `listar_equipamentos`, `listar_servicos`.
- 3 prompts MCP: `perfil_estabelecimento`, `mapear_rede_municipio`, `analisar_cobertura_uf`.
- 3 resources MCP: `cnes://tipos_estabelecimento`, `cnes://categorias_servicos`, `cnes://scope`.
- Cache SQLite local sincronizado via FTP DATASUS.
- LGPD: CPFs de profissionais sempre mascarados.
