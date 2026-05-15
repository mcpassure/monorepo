# Contribuindo para @mcpassure/mcp-cnes

**🇧🇷 Português (BR) · [🇺🇸 English](./CONTRIBUTING.en.md)**

---

Obrigado por contribuir! Este projeto segue os padrões do catálogo MCPAssure Brasil.

## Pré-requisitos

- Node.js >= 22
- pnpm >= 10
- `blast` (para testes de sincronização DBC): veja instruções no README

## Setup local

```bash
git clone https://github.com/mcpassure/monorepo.git
cd monorepo
pnpm install
pnpm --filter @mcpassure/mcp-cnes build
pnpm --filter @mcpassure/mcp-cnes test
```

## Fluxo de trabalho

1. Fork o repositório e crie um branch: `git checkout -b feat/nome-da-feature`
2. Implemente a mudança com testes
3. Verifique qualidade: `pnpm --filter @mcpassure/mcp-cnes lint && pnpm --filter @mcpassure/mcp-cnes typecheck && pnpm --filter @mcpassure/mcp-cnes test`
4. Commit com [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)
5. Adicione changeset se há mudança de versão: `pnpm changeset`
6. Abra um Pull Request descrevendo a mudança e motivação

## Padrões de código

- TypeScript estrito (`strict: true`)
- Biome para lint e formatação
- Vitest para testes
- Sem dados de pacientes (PHI/PII) em nenhum teste, fixture ou exemplo

## Antes de abrir PR

- [ ] Tests passam: `pnpm --filter @mcpassure/mcp-cnes test`
- [ ] Lint clean: `pnpm --filter @mcpassure/mcp-cnes lint`
- [ ] Typecheck OK: `pnpm --filter @mcpassure/mcp-cnes typecheck`
- [ ] Changeset adicionado se necessário

## Reportar bugs

Abra uma [Issue](https://github.com/mcpassure/monorepo/issues) com label `bug` e prefixo `[mcp-cnes]`, descrevendo:

- Versão do pacote e do Node.js
- SO
- Reprodução mínima
- Comportamento esperado vs. observado

## Code of Conduct

Este projeto segue o [Contributor Covenant](./CODE_OF_CONDUCT.md). Espera-se que todos os contribuidores respeitem.
