# Runbook de Fonte — @mcpassure/mcp-tuss

Este runbook descreve o que fazer quando as fontes upstream mudam. O canário diário (`scripts/canary.ts`) detecta automaticamente as mudanças e abre issues com label `upstream-drift` ou `upstream-down`.

---

## 1. ANS mudou URL da correlação TUSS-ROL

**Sintomas:** Canário retorna `upstream-drift` para "Rol ANS". Log: "Arquivo de correlação TUSS-ROL não encontrado na página ANS".

**Como detectar:**
```bash
# Acessar manualmente:
# https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos
# Procurar link com "CorrelaoTUSS" no nome
```

**Como corrigir:**
1. Acessar a página do Rol ANS e localizar o novo arquivo de correlação
2. Atualizar a URL de fallback em `src/sync/ingestor.ts` (campo `TUSS_DIRECT_URLS["22"][0]`)
3. Executar `npm run sync` para verificar que o download funciona
4. Atualizar o hash em `data/cross_mapping.v1.json` após sincronização
5. Fechar a issue de drift com referência ao commit de correção

**SLA esperado:** 1-3 dias úteis após detecção. A ANS costuma manter links antigos por 30-60 dias.

---

## 2. ANS mudou estrutura de colunas da planilha de correlação

**Sintomas:** Canário OK, mas `npm run sync` falha com erro de parser. Log: "Cabeçalho inesperado na coluna X".

**Como detectar:**
```bash
npm run sync 2>&1 | grep -i "header\|coluna\|column"
```

**Como corrigir:**
1. Baixar manualmente o novo arquivo de correlação:
   ```bash
   curl -L -o /tmp/correlacao.xlsx "<URL_NOVA>"
   ```
2. Abrir em Excel/LibreOffice e verificar quais colunas mudaram
3. Atualizar o mapeamento de colunas em `src/sync/parser.ts` (função `parseCorrelacaoTussRol`)
4. Atualizar o schema baseline `src/sources/schemas/rol_ans_planilha.v1.json`:
   - Atualizar `column_indices`
   - Incrementar `version` para `v2` se mudança for significativa
5. Executar `npm run sync` e verificar que os dados são parseados corretamente
6. Executar `npm test` para garantir que os testes de parser passam

**SLA esperado:** 2-5 dias úteis. Mudança de colunas é rara — ANS tem mantido a estrutura estável desde 2021.

---

## 3. terminologia.saude.gov.br mudou estrutura do FHIR CodeSystem

**Sintomas:** Canário retorna `upstream-drift` para "TUSS". Log: "Campos ausentes no CodeSystem FHIR" ou "Número de concepts insuficiente".

**Como detectar:**
```bash
curl -s -H "Accept: application/fhir+json" \
  "https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS" \
  | python3 -m json.tool | head -50
```

**Como corrigir:**
1. Verificar quais campos mudaram no JSON da resposta
2. Se apenas campos opcionais mudaram:
   - Atualizar `src/sources/schemas/tuss_codesystem.v1.json`
   - Manter `version: "v1"` se compatível; incrementar para `v2` se quebra
3. Se o endpoint mudou completamente (URL, formato, auth):
   - Atualizar `FHIR_SYSTEM` em `src/constants.ts`
   - Atualizar o canário `scripts/canary.ts` (função `checkTuss`)
   - Considerar impacto no campo `sistema_fhir` retornado pelas tools

**SLA esperado:** 3-7 dias úteis. O MS costuma avisar mudanças com antecedência no RNDS.

---

## 4. AMB/CFM mudou publicação CBHPM

**Sintomas:** Canário retorna `upstream-drift` para "CBHPM". Log: "Site AMB retornou HTTP != 200".

**Observação importante:** A CBHPM é uma publicação com restrições autorais. Esta ferramenta usa apenas dados hierárquicos derivados da correlação ANS — **não dados da publicação diretamente**. O canário apenas verifica disponibilidade do site.

**Como detectar:**
```bash
curl -I https://www.amb.org.br
```

**Se nova edição CBHPM for publicada (ex: 7ª edição):**
1. Atualizar `CBHPM_EDICAO` em `src/constants.ts`
2. Atualizar `src/sources/schemas/cbhpm_amb.v1.json` (campo `expected_edition`)
3. Verificar se a correlação ANS foi atualizada para incluir hierarquia da nova edição
4. Consultar parecer jurídico antes de incorporar dados adicionais da nova edição

**SLA esperado:** A CBHPM é publicada anualmente pela AMB. Mudanças entre edições são gerenciadas manualmente.

---

## 5. Como atualizar os schemas baseline

Os schemas baseline em `src/sources/schemas/` documentam a estrutura esperada de cada fonte. Atualizar quando:
- Uma nova versão da fonte muda campos opcionais (update no v1)
- Uma nova versão quebra compatibilidade (criar v2 ao lado do v1)

```bash
# Verificar estado atual dos schemas
cat src/sources/schemas/tuss_codesystem.v1.json
cat src/sources/schemas/rol_ans_planilha.v1.json
cat src/sources/schemas/cbhpm_amb.v1.json

# Após atualizar, testar canário
npm run canary
```

---

## 6. Como forçar geração de nova versão do cross_mapping

O arquivo `data/cross_mapping.v1.json` é atualizado pelo ingestor após cada sincronização.

```bash
# Forçar nova sincronização e gerar cross_mapping atualizado:
npm run sync

# Verificar que o arquivo foi atualizado:
cat data/cross_mapping.v1.json | python3 -m json.tool
```

Para criar um `cross_mapping.v2.json` (mudança de schema):
1. Executar `npm run sync`
2. Renomear o arquivo gerado para `v2`
3. Atualizar referências no ingestor

---

## 7. Contatos e SLA por fonte

| Fonte | Contato | Canal | SLA esperado |
|-------|---------|-------|-------------|
| ANS — Rol de Procedimentos | Coordenação de Assistência | participacao@ans.gov.br | 5-15 dias úteis |
| terminologia.saude.gov.br | RNDS / DATASUS | https://rnds.saude.gov.br | 3-10 dias úteis |
| AMB — CBHPM | Departamento Técnico AMB | https://www.amb.org.br/contato | 5-30 dias úteis |

---

## 8. Checklist de validação pós-atualização

Após qualquer correção de drift:

- [ ] `npm run typecheck` — zero erros TypeScript
- [ ] `npm run lint` — zero warnings críticos
- [ ] `npm run sync` — sincronização completa sem erros
- [ ] `npm test` — todos os testes passando
- [ ] `npm run canary` — canário verde
- [ ] `STATUS.md` atualizado
- [ ] Issue de drift fechada com referência ao commit
- [ ] `data/cross_mapping.v1.json` gerado com hash correto
