# Runbook — O que fazer se o DATASUS mudar

**Versão:** 1.1.1
**Última atualização:** 2026-05-13

Este runbook descreve os procedimentos de resposta quando as fontes externas do MCP CNES mudam de forma inesperada.

---

## 1. Canário detectou drift de formato ou layout

**Sintoma:** O workflow `canary.yml` falha. Uma issue `[upstream-drift]` é aberta automaticamente.

**Tipos de drift detectáveis pelo canário:**

| Caso | Comportamento esperado |
|---|---|
| FTP inacessível | Canário falha imediato (exit 1) |
| Diretório de grupo vazio | Canário falha (exit 1), lista grupos faltantes |
| Formato de nome de arquivo mudou | Canário tenta lista de regex candidatas; se nenhuma bate, loga 10 amostras e falha |
| Schema baseline vs DBC real divergente | (futuro: ainda não implementado em v1.1.1) |

**Procedimento:**

1. Acesse os logs do workflow em **Actions > Upstream Canary**.
2. Identifique quais grupos (ST, LT, EQ, PF, SR) foram afetados e qual o sintoma.
3. Baixe manualmente uma amostra do arquivo DBC afetado:
   ```bash
   ftp ftp.datasus.gov.br
   cd /dissemin/publicos/CNES/200508_/Dados/<GRUPO>
   ls
   get <ARQUIVO>.dbc /tmp/amostra.dbc
   ```
4. Se o formato do nome mudou, ajuste `REGEX_CANDIDATES` em `scripts/canary.ts`.
5. Se o schema do DBC mudou (após conversão para CSV com `blast`), siga o procedimento abaixo.

**Correção de schema DBC:**

1. Converta para CSV com `blast`:
   ```bash
   blast /tmp/amostra.dbc /tmp/amostra.csv
   ```
2. Verifique as colunas presentes no CSV:
   ```bash
   head -1 /tmp/amostra.csv
   ```
3. Compare com o schema baseline em `src/sources/schemas/cnes_dbc_layout.v1.json`.
4. Identifique colunas adicionadas, removidas ou renomeadas.

**Aplicação:**
- Se coluna foi **renomeada**: atualize o mapper correspondente em `src/sync/mappers/<GRUPO>.ts` para aceitar o novo nome (adicione como alternativa no operador `??`). A coluna `extra_json` continua preservando o dado bruto enquanto o mapper tipado é ajustado.
- Se coluna foi **adicionada**: avalie se é relevante para o output. Já está disponível em `extra_json`. Adicione ao mapper tipado se quiser indexar/filtrar por ela.
- Se coluna foi **removida**: trate como `|| null` no mapper.
- Atualize `src/sources/schemas/cnes_dbc_layout.v1.json` refletindo o novo layout.
- Feche a issue `[upstream-drift]` com link para o PR de correção.

---

## 2. FTP DATASUS indisponível

**Sintoma:** `npm run canary` falha com "FTP inacessível". O MCP continua funcionando se o dataset já foi sincronizado.

**Procedimento:**

1. Confirme a indisponibilidade:
   ```bash
   curl -v ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/ --ftp-pasv
   ```
2. Verifique o status do DATASUS em: `https://datasus.saude.gov.br`
3. Se for manutenção programada (comum no início/fim de mês), aguarde 24–48h e re-execute o canário manualmente (`gh workflow run canary.yml`).
4. Se persistir por mais de 72h, abra chamado no DATASUS.

**Mitigação:**
- O MCP continua servindo o dataset local já sincronizado.
- Usuários verão `_meta.status: "stale"` quando a defasagem ultrapassar 75 dias.
- Usuários sem cache local recebem mensagem clara de que sync precisa ser executado.

---

## 3. Cache local vazio na máquina do usuário

**Sintoma:** Usuário relata que todas as tools retornam `aviso: "Cache local vazio. Execute primeiro: npx -y @mcpassure/mcp-cnes sync ..."` mesmo após instalação.

**Causa esperada:** O fluxo correto exige executar `sync` na primeira execução (v1.1.1 removeu o fallback online).

**Orientação ao usuário:**

```bash
# Sincronizar uma UF — mínimo necessário para começar
npx -y @mcpassure/mcp-cnes sync --uf SP --grupos ST

# Para tools completas (leitos, equipamentos, profissionais, serviços):
npx -y @mcpassure/mcp-cnes sync --uf SP --grupos ST LT EQ PF SR
```

**Roadmap:** v1.2 prevê pre-built database como GitHub Release artifact, eliminando esse passo para o caso 90% (consulta de leitura).

---

## 4. Mudança de codificação (latin1 ↔ utf-8)

**Sintoma:** Nomes de cidades e estabelecimentos aparecem com caracteres corrompidos (ex: `S?o Paulo` em vez de `São Paulo`).

**Diagnóstico:**
```bash
file /tmp/amostra.csv
head -5 /tmp/amostra.csv | cat -v
```

**Correção:**
- `src/sync/ingest.ts` usa `iconv-lite` com `"latin1"`. Se o DATASUS migrou para UTF-8:
  1. Altere o encoding em `src/sync/ingest.ts` (linha com `iconv-lite.decodeStream`).
  2. Atualize `cnes_dbc_layout.v1.json`: campo `"encoding"` de `"latin1"` para `"utf-8"`.
  3. Force re-ingestão com `npm run sync --uf <UF> --grupos ST --force`.
- O `extra_json` ajuda a inspecionar como o registro chegou raw, facilitando diagnóstico de encoding.

---

## 5. Referências

- Schema baseline: `src/sources/schemas/cnes_dbc_layout.v1.json`
- Mappers: `src/sync/mappers/*.ts`
- Canário workflow: `.github/workflows/canary.yml` + `scripts/canary.ts`
- FTP DATASUS: `ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/`
- DATASUS portal: `https://datasus.saude.gov.br`
- ~~REST TCU~~: removido em v1.1.1 (endpoint usa `codUnidade` ≠ CNES)
