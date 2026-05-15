# Contributing to @mcpassure/mcp-cnes

**[🇧🇷 Português (BR)](./CONTRIBUTING.md) · 🇺🇸 English**

---

Thank you for contributing! This project follows MCPAssure Brasil catalog standards.

## Prerequisites

- Node.js >= 22
- pnpm >= 10
- `blast` (for DBC sync tests): see README for installation instructions

## Local setup

```bash
git clone https://github.com/mcpassure/monorepo.git
cd monorepo
pnpm install
pnpm --filter @mcpassure/mcp-cnes build
pnpm --filter @mcpassure/mcp-cnes test
```

## Workflow

1. Fork the repository and create a branch: `git checkout -b feat/feature-name`
2. Implement the change with tests
3. Verify quality: `pnpm --filter @mcpassure/mcp-cnes lint && pnpm --filter @mcpassure/mcp-cnes typecheck && pnpm --filter @mcpassure/mcp-cnes test`
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
5. Add changeset if version changes: `pnpm changeset`
6. Open a Pull Request describing the change and motivation

## Code standards

- Strict TypeScript (`strict: true`)
- Biome for lint and formatting
- Vitest for tests
- No patient data (PHI/PII) in any test, fixture, or example

## Before opening a PR

- [ ] Tests pass: `pnpm --filter @mcpassure/mcp-cnes test`
- [ ] Lint clean: `pnpm --filter @mcpassure/mcp-cnes lint`
- [ ] Typecheck OK: `pnpm --filter @mcpassure/mcp-cnes typecheck`
- [ ] Changeset added if needed

## Reporting bugs

Open an [issue](https://github.com/mcpassure/monorepo/issues) with label `bug` and prefix `[mcp-cnes]`, describing:

- Package and Node.js version
- OS
- Minimal reproduction
- Expected vs. observed behavior

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). All contributors are expected to comply.
