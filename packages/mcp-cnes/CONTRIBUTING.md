# Contribuindo com o @vetrum/mcp-cnes

Obrigado por contribuir! Este projeto segue os padrões do catálogo Vetrum Brasil.

## Pré-requisitos

- Node.js >= 18
- npm >= 9
- `blast` (para testes de sincronização DBC): veja instruções de instalação no README

## Setup

```bash
git clone https://github.com/vetrum/mcp-cnes
cd mcp-cnes
npm install
```

## Fluxo de trabalho

1. Fork o repositório e crie um branch: `git checkout -b feat/nome-da-feature`
2. Implemente a mudança com testes
3. Verifique qualidade: `npm run lint && npm run typecheck && npm run test`
4. Commit com mensagem descritiva em PT-BR ou EN
5. Abra um Pull Request descrevendo a mudança e motivação

## Padrões de código

- TypeScript estrito (`strict: true`)
- Biome para lint e formatação (rodar `npm run lint:fix` antes do commit)
- Testes obrigatórios para toda nova tool ou função de query
- Sem dados de pacientes (PHI) em nenhum teste, fixture ou exemplo

## Reportar bugs

Abra uma Issue descrevendo:
- Versão do MCP (`npx @vetrum/mcp-cnes --version`)
- SO e versão do Node.js
- Reprodução mínima
- Comportamento esperado vs. observado

## Dúvidas

Abra uma Discussion no GitHub.
