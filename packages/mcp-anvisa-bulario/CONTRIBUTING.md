# Contributing

Obrigado por querer contribuir com o `@vetrum/mcp-anvisa-bulario`!

## Como contribuir

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Instale as dependências: `npm install`
4. Faça suas alterações e escreva testes
5. Verifique que tudo passa: `npm run lint && npm run type-check && npm run test`
6. Abra um Pull Request com descrição clara do que foi alterado e por quê

## Regras

- Toda alteração deve incluir testes unitários
- O CI deve passar antes do merge (lint + type-check + test + evals)
- Sem PHI/PII em nenhum momento — dados pessoais nunca devem ser processados ou logados
- Respeitar os Termos de Uso da ANVISA
- Seguir o [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Reportar bugs

Abra uma issue com:
- Versão do pacote e do Node.js
- Passos para reproduzir
- Comportamento esperado vs. observado
- Logs relevantes (sem informações pessoais)
