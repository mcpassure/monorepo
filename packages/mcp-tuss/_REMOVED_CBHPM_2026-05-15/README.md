# ⚠️ Artefatos vestigiais de CBHPM — REMOVIDOS DO ESCOPO

**Data da remoção:** 2026-05-15
**Motivo:** CBHPM é propriedade intelectual da AMB (Associação Médica Brasileira), vendida em livro impresso/digital pela própria entidade em https://amb.org.br/adquirir-cbhpm. **Não é base aberta.** Distribuí-la via MCP público viola direito autoral da AMB.

## Decisão definitiva

CBHPM **nunca** entra no MCPAssure, em nenhum formato:
- ❌ Sem dados CBHPM no SQLite
- ❌ Sem schema de ingestão CBHPM
- ❌ Sem tool de consulta CBHPM
- ❌ Sem cross-reference TUSS ↔ CBHPM no produto
- ❌ Sem menção no nome, descrição ou roadmap

## Arquivos movidos para esta pasta

Os arquivos abaixo eram vestígios de uma tentativa anterior de incluir CBHPM no escopo. Foram movidos pra cá em 2026-05-15 e devem ser **apagados manualmente** após verificação:

### Código (artifacts/vetrum-tuss-mcp/)
- `cbhpm-repository.ts` (domínio)
- `cbhpm_amb.v1.json` (schema)
- `consultar-hierarquia-cbhpm.ts` (tool)
- `cbhpm-repository.test.ts` (teste)
- `consultar-hierarquia-cbhpm.test.ts` (teste)

### Integration tests
- `06-cbhpm.ts` (bin)
- `06-cbhpm.json` (resultado)

## Próximos passos

1. Verificar que nenhum código de produção importa esses arquivos
2. Apagar esta pasta inteira (`_REMOVED_CBHPM_2026-05-15/`)
3. Considerar renomear a pasta raiz `3- mcp- TUSS  CBHPM  Rol ANS/` → `3-mcp-tuss-rol-ans/`

## Referências jurídicas

- AMB venda oficial: https://amb.org.br/adquirir-cbhpm/
- Página oficial CBHPM: https://amb.org.br/cbhpm/
- Lei 9.610/98 (Lei de Direitos Autorais)

**O Rol ANS, em contraste, é dado público** (publicado em Resolução Normativa da ANS, disponível gratuitamente) e está sendo incorporado ao MCP como escopo v0.2.0.
