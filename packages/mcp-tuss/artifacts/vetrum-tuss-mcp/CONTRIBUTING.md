# Contribuindo com o vetrum-tuss-mcp

Obrigado pelo interesse em contribuir! Este projeto faz parte do catálogo Vetrum Brasil de MCPs para saúde suplementar.

## Antes de contribuir

- Leia o [SECURITY.md](SECURITY.md) — dados de saúde têm requisitos especiais.
- Este servidor **não processa dados pessoais identificáveis (PHI/PII)**. As tabelas TUSS/CBHPM/Rol são listas de códigos públicos.
- Confirme que suas alterações não introduzem processamento de dados clínicos de pacientes.

## Como contribuir

### Reportar problemas

- Use o GitHub Issues.
- Para bugs de cobertura ANS ou código TUSS incorreto, cite a RN ou publicação oficial de referência.
- Para vulnerabilidades de segurança, siga o [SECURITY.md](SECURITY.md).

### Pull Requests

1. Fork o repositório e crie uma branch a partir de `main`.
2. Instale as dependências: `npm install`
3. Faça suas alterações.
4. Execute os testes: `npm test && npm run evals`
5. Execute o type check: `npm run typecheck`
6. Abra um PR com descrição clara do que foi alterado e por quê.

### Manter dados atualizados

Se a ANS publicar uma nova versão da correlação TUSS-ROL ou das tabelas TISS:

1. Execute `npx vetrum-tuss-mcp sync --force` localmente.
2. Verifique que os testes continuam passando.
3. Atualize a versão em `package.json` se necessário.
4. Abra um PR com o título `sync: atualizar para correlação TUSS AAAANN`.

## Estrutura do projeto

```
src/
  constants.ts       — URLs, constantes regulatórias
  types.ts           — Interfaces TypeScript
  db/                — Schema, cliente SQLite, queries
  sync/              — Download, parser XLSX, ingestor
  tools/             — 7 ferramentas MCP
  server.ts          — Registro das ferramentas
  index.ts           — Entrypoint
tests/               — Testes unitários (Vitest)
evals/               — Evals de negócio (12 cenários)
scripts/             — CLI de sincronização
```

## Padrões de código

- TypeScript estrito (`strict: true`)
- Sem comentários desnecessários — o código deve ser autoexplicativo
- Todas as ferramentas MCP devem incluir `structuredContent` e `disclaimer`
- Zod para validação de input em todas as ferramentas
