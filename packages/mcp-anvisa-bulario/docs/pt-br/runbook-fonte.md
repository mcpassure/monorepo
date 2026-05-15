# Runbook — O que fazer se a ANVISA mudar URL ou Schema

**Arquivo:** `docs/pt-br/runbook-fonte.md`
**Audiência:** mantenedores do `@mcpassure/mcp-anvisa-bulario`

---

## Sintomas que indicam mudança upstream

1. Canário diário falha (issue `upstream-drift` aberta no GitHub)
2. `npm run canary` retorna exit code 1
3. Usuários reportam tool retornando `isError: true` com mensagem de autenticação ou conexão
4. `_meta.fonte` em responses passa a ser `"cache_local"` exclusivamente (fonte online inacessível)

---

## Cenário 1 — URL do endpoint mudou

**Diagnóstico:**
```bash
curl -H "Authorization: Guest" "https://consultas.anvisa.gov.br/api/consulta/bulario?count=1"
# Se 404 ou DNS falhar: URL mudou
```

**Procedimento:**
1. Acessar `https://consultas.anvisa.gov.br/#/bulario/` no browser
2. Abrir DevTools → Network — filtrar por `api/`
3. Executar uma busca manual e capturar o novo endpoint
4. Atualizar `src/sources/anvisa-api.ts`: método `_search`, `getDetalhes`, `getApresentacoes`, `getBulaLink`
5. Atualizar `4-spec.md` seção "Endpoints ANVISA consumidos"
6. Atualizar `docs/pt-br/runbook-fonte.md` (este arquivo) com nova URL
7. Executar `npm run test && npm run canary` localmente
8. PR + release patch (ex: `1.0.0` → `1.0.1`)

**Mitigação rápida enquanto URL não é encontrada:**
- `AnvisaDadosAbertosSource` (v1.1) pode assumir como fonte primária se cache CSV estiver populado

---

## Cenário 2 — Token "Guest" revogado / autenticação obrigatória

**Diagnóstico:**
```bash
curl -H "Authorization: Guest" "https://consultas.anvisa.gov.br/api/consulta/bulario?count=1"
# Se 401/403: token revogado
```

**Sintoma no código:** `SourceAuthError` lançado por `AnvisaApiSource`

**Procedimento:**
1. Verificar se a ANVISA publicou nova documentação de API ou portal de desenvolvedor
2. Tentar sem o header Authorization (às vezes a API muda para cookie/session)
3. Se autenticação for obrigatória e sem alternativa pública:
   - Marcar `AnvisaApiSource` como `deprecated` no `README.md`
   - Promover `AnvisaDadosAbertosSource` (v1.1) a source primária
   - Criar issue `auth-blocked` no repositório com detalhes
4. Se token público novo estiver disponível: atualizar `ANVISA_HEADERS` em `anvisa-api.ts`

**Mitigação:** cache local continua respondendo enquanto TTL não expirar (default: 24h para detalhes)

---

## Cenário 3 — Schema do response mudou

**Diagnóstico:**
```bash
npm run canary
# Saída com drift indica campos ausentes ou tipos inesperados
```

**Exemplos de mudança que quebram:**
- Campo `nomeProduto` renomeado para `nomeComercial`
- `razaoSocial` substituído por `laboratorio`
- `content[]` virou `items[]` ou `data[]`
- Campo `classesTerapeuticas` mudou de array para string

**Procedimento:**
1. Fazer chamada manual ao endpoint:
   ```bash
   curl -s -H "Authorization: Guest" "https://consultas.anvisa.gov.br/api/consulta/bulario?count=5&filter[nomeProduto]=dipirona" | jq .
   ```
2. Comparar com tipos em `src/sources/anvisa-api.ts` (`AnvisaBularioItem`, `AnvisaDetalhesResponse`)
3. Atualizar tipos internos e funções de mapeamento (`mapItem`, `extractClassesTerapeuticas`)
4. Verificar se mudança afeta campos obrigatórios — se sim, atualizar `MedicamentoResumo` / `MedicamentoDetalhes`
5. Atualizar `src/sources/schemas/anvisa_dados_abertos.v1.json` com novo baseline
6. Executar suite completa: `npm run lint && npm run type-check && npm run test && npm run canary`
7. PR + release patch ou minor conforme extensão da mudança

---

## Cenário 4 — API ANVISA intermitente (5xx / timeout)

**Diagnóstico:** canário falha com erro de conexão, não de schema

**Procedimento:**
1. Aguardar 30 minutos — a API ANVISA é instável fora do horário comercial
2. Se persistir > 2 horas: verificar https://status.anvisa.gov.br ou redes sociais da ANVISA
3. O cache local continua servindo requests enquanto TTL não expirar
4. Se intermitência durar > 24h: `_meta.status = "stale"` começa a aparecer nos responses — usuários são informados automaticamente
5. Quando a API voltar: `npm run canary` com `workflow_dispatch` para atualizar `STATUS.md`

---

## Referências rápidas

| Recurso | URL |
|---|---|
| Portal Bulário | https://consultas.anvisa.gov.br/#/bulario/ |
| API busca | `GET https://consultas.anvisa.gov.br/api/consulta/bulario` |
| API detalhes | `GET https://consultas.anvisa.gov.br/api/consulta/medicamento/produtos/{numProcesso}` |
| Dados Abertos | https://dados.gov.br/dados/conjuntos-dados/medicamentos-registrados-no-brasil |
| Schema baseline | `src/sources/schemas/anvisa_dados_abertos.v1.json` |
| Spec técnica | `02_modelos_variaveis_do_projeto/4-spec.md` |
