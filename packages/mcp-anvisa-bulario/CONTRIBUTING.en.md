# Contributing to @mcpassure/mcp-anvisa-bulario

**[🇧🇷 Português (BR)](./CONTRIBUTING.md) · 🇺🇸 English**

---

Thank you for wanting to contribute!

## How to contribute

1. Fork the repository
2. Create a branch: `git checkout -b feat/my-feature`
3. Install dependencies: `pnpm install` (from the monorepo root)
4. Make your changes and write tests
5. Verify everything passes: `pnpm --filter @mcpassure/mcp-anvisa-bulario lint && pnpm --filter @mcpassure/mcp-anvisa-bulario typecheck && pnpm --filter @mcpassure/mcp-anvisa-bulario test`
6. Add a changeset if needed: `pnpm changeset`
7. Open a Pull Request with a clear description of what changed and why

## Local setup

```bash
git clone https://github.com/mcpassure/monorepo.git
cd monorepo
pnpm install
pnpm --filter @mcpassure/mcp-anvisa-bulario build
```

## Rules

- All changes must include unit tests
- CI must pass before merge (lint + typecheck + test)
- No PHI/PII at any point — personal data must never be processed or logged
- Respect ANVISA's Terms of Use
- Follow the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Reporting bugs

Open an [issue](https://github.com/mcpassure/monorepo/issues) with label `bug` and prefix `[mcp-anvisa-bulario]`, including:

- Package and Node.js version
- Steps to reproduce
- Expected vs. observed behavior
- Relevant logs (no personal information)
