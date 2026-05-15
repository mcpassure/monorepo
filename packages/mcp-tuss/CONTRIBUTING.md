# Contribuindo para @mcpassure/mcp-tuss

**🇧🇷 Português (BR) · [🇺🇸 English](./CONTRIBUTING.en.md)**

---

Obrigado pelo interesse em contribuir!

## Como contribuir

1. Fork do repositório
2. Crie uma branch: `git checkout -b feat/minha-mudanca`
3. Commit com [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)
4. Abra um Pull Request

## Setup local

```bash
git clone https://github.com/mcpassure/monorepo.git
cd monorepo
pnpm install
pnpm --filter @mcpassure/mcp-tuss build
pnpm --filter @mcpassure/mcp-tuss test
```

## Padrões de código

- TypeScript strict
- Biome para lint/format
- Vitest para testes
- Cobertura mínima: 70%

## Antes de abrir PR

- [ ] Tests passam: `pnpm --filter @mcpassure/mcp-tuss test`
- [ ] Lint clean: `pnpm --filter @mcpassure/mcp-tuss lint`
- [ ] Typecheck OK: `pnpm --filter @mcpassure/mcp-tuss typecheck`
- [ ] Changeset adicionado se há mudança de versão: `pnpm changeset`

## Scope de contribuição

- **Tabelas TUSS** — código de procedimento, medicamento ou diária/taxa
- **Rol ANS** — cobertura mínima obrigatória (v0.2.0+)
- **Performance de queries** — índices, FTS5
- **Testes** — unitários e E2E de protocolo MCP

**Fora de escopo:**
- **CBHPM** — propriedade intelectual da AMB, não é base aberta. **Não será implementada.**
- Dados de pacientes ou PHI em qualquer forma

## Reportar bugs

Use [issues](https://github.com/mcpassure/monorepo/issues) com label `bug` e prefixo `[mcp-tuss]`.

Inclua: versão do pacote, SO e Node.js, reprodução mínima, comportamento esperado vs. observado.

## Code of Conduct

Este projeto segue o [Contributor Covenant](./CODE_OF_CONDUCT.md).
