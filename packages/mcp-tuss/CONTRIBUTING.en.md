# Contributing to @mcpassure/mcp-tuss

**[🇧🇷 Português (BR)](./CONTRIBUTING.md) · 🇺🇸 English**

---

Thank you for your interest in contributing!

## How to contribute

1. Fork the repository
2. Create a branch: `git checkout -b feat/my-change`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
4. Open a Pull Request

## Local setup

```bash
git clone https://github.com/mcpassure/monorepo.git
cd monorepo
pnpm install
pnpm --filter @mcpassure/mcp-tuss build
pnpm --filter @mcpassure/mcp-tuss test
```

## Code standards

- TypeScript strict mode
- Biome for lint/format
- Vitest for tests
- Minimum coverage: 70%

## Before opening a PR

- [ ] Tests pass: `pnpm --filter @mcpassure/mcp-tuss test`
- [ ] Lint clean: `pnpm --filter @mcpassure/mcp-tuss lint`
- [ ] Typecheck OK: `pnpm --filter @mcpassure/mcp-tuss typecheck`
- [ ] Changeset added if version change: `pnpm changeset`

## Contribution scope

- **TUSS tables** — procedures, medications, hospital fees
- **ANS Rol** — mandatory minimum coverage (v0.2.0+)
- **Query performance** — indexes, FTS5
- **Tests** — unit and MCP protocol E2E

**Out of scope:**
- **CBHPM** — intellectual property of AMB (Brazilian Medical Association), not an open dataset. **Will not be implemented.**
- Patient data or PHI in any form

## Reporting bugs

Open an [issue](https://github.com/mcpassure/monorepo/issues) with label `bug` and prefix `[mcp-tuss]`.

Include: package version, OS and Node.js version, minimal reproduction, expected vs. observed behavior.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).
