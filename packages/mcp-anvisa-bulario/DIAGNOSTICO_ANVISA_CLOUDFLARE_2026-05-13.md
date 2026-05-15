# ANVISA Cloudflare — Diagnóstico e Resolução (2026-05-13)

## TL;DR

A API REST da ANVISA (`consultas.anvisa.gov.br/api/consulta/*`) está atrás de
Cloudflare desde 2026 com detecção de bot agressiva. Acesso via Node fetch
nativo ou TLS impersonation (`tls-client-node`) é bloqueado.

**Solução implementada (2026-05-13)**: substituímos o transport HTTP por
Playwright (Chromium real headless) com UA override e mascaramento de sinais
de automação. Confirmamos passagem pela Cloudflare e descobrimos
adicionalmente que a API mudou paginação para 1-indexed (antes era 0-indexed)
e renomeou campos do endpoint de detalhes.

## Cronologia da investigação

### Etapa 1 — Identificar bloqueio
- Canary v1.0 falhou com HTTP 500 sistemático
- Bateria PowerShell (7 testes): bloqueio em todos endpoints, com vários UAs
  e configurações TLS. Body: HTML "Sorry, you have been blocked" do Cloudflare.

### Etapa 2 — Validar que API funciona via browser real
- Browser direto retornou JSON com `BusinessException: MSG-004` — confirmando
  que a aplicação por trás do Cloudflare existe e responde, e que a barreira
  está estritamente no perímetro Cloudflare.

### Etapa 3 — TLS impersonation insuficiente
- `tls-client-node` v0.1.13, 9 combinações testadas: identifiers
  `cloudscraper`, `chrome_120`, `chrome_146`, `firefox_120`, `firefox_148`,
  `safari_ios_26_0`, `okhttp4_android_13`; com e sem `withRandomTLSExtensionOrder`,
  com e sem Sec-Ch-Ua headers, com Origin ajustado.
- Resultado: todas retornaram HTTP 403 com body idêntico (5469 bytes).
- Diagnóstico: Cloudflare deles está em modo "detect HeadlessChrome UA + sinais
  óbvios de webdriver". TLS fingerprint sozinho não basta.

### Etapa 4 — Playwright resolve
- Chromium real (visible mode): passou pela Cloudflare, API retornou JSON real
  com erro Hibernate `Negative value (-10) passed to setFirstResult`.
- Diagnóstico do erro: API agora calcula `firstResult = (page - 1) * count`.
  Mandando `page=0`: `(0-1)*10 = -10`. **API ANVISA mudou para paginação
  1-indexed** em algum momento de 2026.
- Chromium headless (sem override): bloqueado novamente — UA expõe string
  "HeadlessChrome".
- Chromium headless **com UA override** + initScript de masking
  (`navigator.webdriver`, `plugins`, `languages`): passou.
- Endpoint `/medicamento/produtos/{numProcesso}` retornou JSON com schema
  novo: `nomeComercial` (era `nomeProduto`), `codigoProduto` (era `idProduto`),
  `codigoBulaPaciente` (era `idBulaPacienteProtegido`), `empresa` como objeto
  (era string `razaoSocial`), etc. Listagem `/api/consulta/bulario` ficou no
  schema legado — coexistem.

## Implementação final

### `src/utils/http.ts` — HttpClient com Playwright
- Browser singleton lazy-initialized na primeira chamada
- Page única reutilizada entre requests (cookies persistem na sessão)
- UA: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML,
  like Gecko) Chrome/148.0.7778.96 Safari/537.36`
- Init script: mascara `navigator.webdriver`, `plugins`, `languages`
- Warm-up: navega para `consultas.anvisa.gov.br/#/bulario/` antes da primeira
  API call, espera 2s pra JS analytics inicializar
- Cada request HTTP é executada como `fetch()` DENTRO do contexto JS da página
  (herda cookies, UA, JS state)
- `close()` deve ser chamado no shutdown (orquestrado pelo `index.ts`
  via SIGINT/SIGTERM)

### `src/sources/anvisa-api.ts` — fixes de schema
- Paginação 1-indexed: `page = params.pagina ?? 1` (sem `- 1`)
- Mapeamento dual: `mapListaItem` para schema legado (listagem),
  `getDetalhes` com fallback entre schema novo (`nomeComercial`,
  `codigoBulaPaciente`, `empresa` objeto) e schema legado
- Constructor aceita `HttpGet` opcional via DI (testes podem injetar mock
  sem instanciar Playwright real)

### `package.json`
- Dep `playwright ^1.55.0`
- `postinstall`: `playwright install chromium --with-deps || true`

## Trade-offs aceitos

- **+150-250MB de RAM** com Chromium ativo enquanto MCP estiver rodando
- **+2-3s latência na primeira chamada** (boot Chromium + warm-up)
- **~100-300ms latência nas chamadas subsequentes** (apenas page.evaluate)
- **+150MB de download no install** (Chromium binary)
- **Risco arquitetural futuro**: se ANVISA escalar Cloudflare para Turnstile
  (captcha humano), Playwright básico não bastará — vai exigir solução com
  cookie cf_clearance persistido manualmente, ou serviço de proxy especializado

## Validação final

- 45 unit tests passando
- 24 integration scenarios passando
- Canary contra API real: 10 registros de "dipirona" validados sem drift
- Tipos limpos (typecheck), formatação limpa (lint)
