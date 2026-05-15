# Contribuindo para @mcpassure/mcp-anvisa-bulario

**🇧🇷 Português (BR) · [🇺🇸 English](./CONTRIBUTING.en.md)**

---

Obrigado por querer contribuir!

## Como contribuir

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Instale as dependências: `pnpm install` (na raiz do monorepo)
4. Faça suas alterações e escreva testes
5. Verifique que tudo passa: `pnpm --filter @mcpassure/mcp-anvisa-bulario lint && pnpm --filter @mcpassure/mcp-anvisa-bulario typecheck && pnpm --filter @mcpassure/mcp-anvisa-bulario test`
6. Adicione changeset se necessário: `pnpm changeset`
7. Abra um Pull Request com descrição clara do que foi alterado e por quê

## Setup local

```bash
git clone https://github.com/mcpassure/monorepo.git
cd monorepo
pnpm install
pnpm --filter @mcpassure/mcp-anvisa-bulario build
```

## Regras

- Toda alteração deve incluir testes unitários
- O CI deve passar antes do merge (lint + typecheck + test)
- Sem PHI/PII em nenhum momento — dados pessoais nunca devem ser processados ou logados
- Respeitar os Termos de Uso da ANVISA
- Seguir o [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Reportar bugs

Abra uma [Issue](https://github.com/mcpassure/monorepo/issues) com label `bug` e prefixo `[mcp-anvisa-bulario]`, incluindo:

- Versão do pacote e do Node.js
- Passos para reproduzir
- Comportamento esperado vs. observado
- Logs relevantes (sem informações pessoais)
