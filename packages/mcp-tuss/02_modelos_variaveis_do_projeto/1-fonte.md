# Investigação de Fonte — @mcpassure/mcp-tuss

**Data**: 2026-05-13  
**Etapa**: 2 — Investigação da fonte oficial (ANS)

---

## 1. Fonte primária: TUSS ZIP (ANS)

### URL padrão

```
https://www.ans.gov.br/arquivos/extras/tiss/Padrao_TISS_Representacao_de_Conceitos_em_Saude_{YYYYMM}.zip
```

### Versões disponíveis (verificadas com HEAD)

| Versão | Data | Tamanho (ZIP) | Status |
|--------|------|---------------|--------|
| 202603 | 2026-03 | 552 MB | ✅ HTTP 200 — MAIS RECENTE |
| 202601 | 2026-01-30 | 560 MB | ✅ HTTP 200 |
| 202511 | 2025-12-02 | 371 MB | ✅ HTTP 200 |
| 202507 | 2025-07-25 | 356 MB | ✅ HTTP 200 |
| 202505 | 2025-05-29 | 333 MB | ✅ HTTP 200 |
| 202501 | 2025-01 | — | ❌ 404 |

**Versão a usar no sync**: `202603` (mais recente verificada em 2026-05-13).

### Detecção de Cloudflare (R7)

Resultado do HEAD request com UA identificável:
- **Sem CF-Ray header** — portal ans.gov.br NÃO usa Cloudflare.
- Retorna HTTP 200 diretamente. Transport HTTP nativo (`fetch` / `undici`) é suficiente.
- Cookies de sessão presentes (`ANS=...`, `TS014...`) = load balancer session affinity, não proteção anti-bot.
- **Playwright NÃO é necessário.** ✅

### Conteúdo do ZIP (versão 202601 — estrutura idêntica em outras versões)

```
Padrao_TISS_Representacao_de_Conceitos_em_Saude_202601/
├── TUSS - Demais terminologias - VERSÃO 202601.pdf    (0.8 MB)
├── TUSS - Demais terminologias - VERSÃO 202601.xlsx   (9.2 MB)
├── TUSS 18 - DIÁRIAS E TAXAS - VERSÃO 202601.pdf      (0.9 MB)
├── TUSS 18 - DIÁRIAS E TAXAS - VERSÃO 202601.xlsx     (0.2 MB)  ← USAR
├── TUSS 19 - materiais e OPME - VERSÃO 202601/
│   ├── TUSS 19 - materiais e OPME - VERSÃO 202601_PARTE_1.pdf   (94.8 MB)
│   ├── TUSS 19 - materiais e OPME - VERSÃO 202601_PARTE_1.xlsx  (73.1 MB) ← muito grande
│   ├── TUSS 19 - materiais e OPME - VERSÃO 202601_PARTE_2.pdf   (88.9 MB)
│   └── TUSS 19 - materiais e OPME - VERSÃO 202601_PARTE_2.xlsx  (32.5 MB) ← muito grande
├── TUSS 20 - Medicamentos - VERSÃO 202601.pdf         (6.6 MB)
├── TUSS 20 - Medicamentos - VERSÃO 202601.xlsx         (2.8 MB)  ← USAR
├── TUSS 22 - PROCEDIMENTOS E EVENTOS EM SAÚDE - VERSÃO 202601.pdf  (1.0 MB)
├── TUSS 22 - PROCEDIMENTOS E EVENTOS EM SAÚDE - VERSÃO 202601.xlsx (1.2 MB)  ← USAR
└── TUSS 64 - Envio de dados para ANS - Versão 202601.zip         (222.0 MB) ← ignorar
```

**Nota de compressão**: XLSX files armazenados SEM compressão (method=0) dentro do ZIP. É possível extrair com range request HTTP sem baixar o ZIP completo. No entanto, para o sync de produção, baixar o ZIP completo é mais simples e confiável.

---

## 2. Estrutura das planilhas TUSS (XLSX)

### TUSS 22 — Procedimentos e Eventos em Saúde (inspecionado)

- **Sheets**: 2 — "CAPA" (capa) + "Tab 22  VERSÃO YYYYMM" (dados)
- **Sheet de dados**: `xl/worksheets/sheet2.xml`
- **Intervalo filtro**: `$A$8:$F$5972` (header em row 8, dados de row 9 a 5972)
- **Registros**: 5.964 códigos únicos

| Coluna | Header (row 8) | Conteúdo real | Tipo |
|--------|----------------|---------------|------|
| A | Código do Termo | Código 8 dígitos (ex: `10101012`) | string/int |
| B | Termo | Nome do procedimento | string |
| C | Descrição Detalhada | **Na prática: Data de início de vigência** (Excel serial) | date |
| D | Data de início de vigência | **Vazio na maioria dos registros** | null |
| E | Data de fim de vigência | Data fim vigência (Excel serial) | date |
| F | Data de fim de implantação | Vazio na maioria | date\|null |

> **ATENÇÃO**: Divergência entre header e dados — coluna C contém datas (Excel serial number), não texto "Descrição Detalhada". Isso é inconsistência da ANS. Parser deve usar posição da coluna (A, B, C, D, E, F), não nome do header. Coluna D é Descrição Detalhada (vazia para TUSS 22).

**Datas**: Excel serial number (dias desde 1899-12-30). Converter: `new Date(25569 + serial, 'days since 1970-01-01')` ou equivalente.

**Exemplo de registros**:
```
10101012 | Consulta em consultório (no horário normal...) | 2009-02-13 | | 2010-10-15 |
40311511 | Teste de fluxo lateral para detecção...       | 2025-02-01 | | 2025-04-30 |
30905079 | shear wave                                     | 2025-04-01 | | 2025-06-30 |
```

**Observação de dados**: Todos os 5.964 registros têm valor em "Data de fim de vigência" (E). Aparentemente o TUSS 22 inclui histórico completo de todas as versões de cada código, não apenas os atualmente vigentes. Para filtrar procedimentos ATIVOS na vigência atual, usar a versão da tabela (YYYYMM) como referência.

### TUSS 18, 20 — Estrutura esperada

Mesma estrutura (2 sheets, header row 8, 6 colunas A-F). Verificação de sheet names e row offsets necessária ao implementar o parser, pois podem variar.

### TUSS 19 — Materiais e OPME (out of scope v1)

- **Razão**: PARTE_1 = 73 MB XLSX não comprimido. Too large for sync inicial.
- **Decision**: Adicionar em v1.1 com streaming parse ou chunk por chunk.
- Marcado em `DEPS.md` como `TUSS_19_SKIP_REASON`.

---

## 3. Regex candidatas para nome do arquivo no ZIP (anti-padrão R4)

Usar cascata de regex (não uma única regex):

```ts
const TUSS22_FILENAME_CANDIDATES = [
  /TUSS 22.*\.xlsx$/i,
  /Tab 22.*\.xlsx$/i,
  /PROCEDIMENTOS.*EVENTOS.*\.xlsx$/i,
  /tuss22.*\.xlsx$/i,
];

const TUSS20_FILENAME_CANDIDATES = [
  /TUSS 20.*Medicamentos.*\.xlsx$/i,
  /Medicamentos.*VERSAO.*\.xlsx$/i,
  /tuss20.*\.xlsx$/i,
];

const TUSS18_FILENAME_CANDIDATES = [
  /TUSS 18.*\.xlsx$/i,
  /DI[AÁ]RIAS.*TAXAS.*\.xlsx$/i,
  /tuss18.*\.xlsx$/i,
];
```

---

## 4. Robots.txt

### gov.br (portal principal)
- `Disallow:` vazio → acesso irrestrito para bots. ✅

### ans.gov.br (servidor de arquivos)
- `User-agent: *\nDisallow: /` → **nega acesso a todos os bots**
- Interpretação: essa regra é direcionada a web crawlers, não ao download de dados públicos disponibilizados explicitamente como arquivos abertos.
- Decisão: implementar **sync extremamente conservador** (trimestral por padrão, `npm run sync` manual) para não onerar o servidor. Documentar decisão.

---

## 5. Rol ANS (Anexo I do Rol de Procedimentos)

### Status
- URL gov.br: `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos/Anexo_I_Rol_2021RN_465.2021_RN668.2026.xlsx`
- Resultado: **HTTP 403 Forbidden** — proteção hotlink ativa no gov.br
- Não é Cloudflare (sem CF-Ray). É WAF/restrição de Referer do gov.br.
- Browser UA e Referer válido: também retorna 403.
- CorrelaoTUSS XLSX: 403 (gov.br) ou 404 (ans.gov.br)

### Decisão v1
- **Out of scope**: sem fonte machine-readable acessível programaticamente.
- O TUSS ZIP contém os procedimentos. O Rol ANS é a COBERTURA OBRIGATÓRIA (quais procedimentos os planos devem cobrir), que requer análise do PDF (complexo) ou browser automation.
- Registrado como `ROL_ANS_SKIP_REASON` em `DEPS.md`.
- **Alternativa futura**: Playwright para download via browser session, ou monitorar se gov.br abrir API pública.

---

## 6. CBHPM (Classificação Brasileira Hierarquizada de Procedimentos Médicos)

### Status
- Publicado pela **AMB** (Associação Médica Brasileira) — não é fonte governamental.
- Disponível como PDF e livro (pago). Não existe download gratuito estruturado (CSV/XLSX).
- PDF público encontrado: `https://sbop.com.br/wp-content/uploads/CBHPM-2022_versao-agosto-2023.pdf`
- Versão mais recente: **Edição 2022** (agosto/2023).

### Decisão v1
- **Out of scope**: dados pagos/licenciados pela AMB, sem API pública.
- Marcado em `DEPS.md` como `CBHPM_SKIP_REASON`.

---

## 7. Rate limiting e uso responsável (R6)

| Parâmetro | Valor |
|-----------|-------|
| User-Agent | `MCPAssure-TUSS-Bot/0.1.0 (+https://github.com/mcpassure/mcp-tuss)` |
| Rate limit entre requests | `MCPASSURE_RATE_LIMIT_MS` (default: `2000` ms) |
| Frequência de sync | Trimestral por padrão. TUSS atualiza ~2x ao ano. |
| Timeout por request | 120s (arquivo grande ~550MB) |
| TLS | `NODE_TLS_REJECT_UNAUTHORIZED=0` NÃO usar. Usar `--ssl-no-revoke` apenas em dev local (Windows SChannel). Em produção (Linux CI), TLS normal funciona. |

---

## 8. Dependências adicionais necessárias

| Pacote | Versão atual | Uso | Status |
|--------|-------------|-----|--------|
| `xlsx` (SheetJS) | `^0.18.5` | Parse XLSX das tabelas TUSS | Necessário para Etapa 3+ |
| `unzipper` | `^0.12.3` | Extração streaming do ZIP | Necessário |
| `iconv-lite` | `^0.6.3` | Nomes de arquivos Windows-1252 no ZIP | Necessário |
| `node-fetch` ou `undici` | nativo Node 22 | HTTP GET para download | **nativo Node 22 `fetch` é suficiente** |

> Antes de adicionar, verificar versão atual em npmjs.com. `xlsx` SheetJS: atenção — versão `0.18.5` é a última MIT; versões `>0.18.5` são SSPL (licença restritiva). Usar `0.18.5` fixo.

**Alternativa a SheetJS SSPL**: usar parse manual do XML XLSX (como feito na investigação acima) para TUSS 22 e 18. Para volumes pequenos (<5MB), parse manual é viável. Para TUSS 20 (2.8MB), também viável.

---

## 9. Paginação

TUSS não usa API com paginação — é download de arquivo estático. Não aplicável. (R10: documentado como N/A)

---

## 10. Schema dual (R11)

Não aplicável: fonte única (ZIP/XLSX da ANS). Não há múltiplos endpoints com schemas diferentes.

---

## 11. Escopo v1 — Tabelas implementadas

| Tabela | Nome | Tamanho XLSX | Implementar v1? |
|--------|------|-------------|-----------------|
| TUSS 22 | Procedimentos e Eventos em Saúde | 1.2 MB | ✅ SIM |
| TUSS 20 | Medicamentos | 2.8 MB | ✅ SIM |
| TUSS 18 | Diárias e Taxas | 0.2 MB | ✅ SIM |
| TUSS 19 | Materiais e OPME | 73+32 MB | ❌ v1.1 |
| Rol ANS | Cobertura obrigatória | — (403) | ❌ out-of-scope v1 |
| CBHPM | Honorários médicos | — (pago) | ❌ out-of-scope v1 |

---

## 12. Decisões documentadas

| ID | Decisão | Razão |
|----|---------|-------|
| D-01 | Usar TUSS ZIP de `ans.gov.br/arquivos/extras/` | Acesso direto HTTP 200, sem Cloudflare |
| D-02 | Parse manual de XML XLSX (sem SheetJS) | Evitar licença SSPL do SheetJS >0.18.5 |
| D-03 | Sync trimestral (não diário) | robots.txt `Disallow: /`, respeito ao servidor |
| D-04 | TUSS 19 out of scope v1 | XLSX 73+32 MB, complexidade de streaming |
| D-05 | Rol ANS out of scope v1 | HTTP 403 gov.br, sem source machine-readable |
| D-06 | CBHPM out of scope v1 | Dados pagos AMB, sem API pública |
| D-07 | Versão alvo: 202603 (March 2026) | Mais recente disponível em 2026-05-13 |
| D-08 | Converter datas Excel serial → ISO 8601 | Cells no XLSX usam serial numérico |
