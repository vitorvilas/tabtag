# Arquitetura

O TabTag foi criado para permanecer pequeno.

Sua função é adicionar marcadores ao `document.title` e persistir essa associação por URL.

## Princípios

- usar APIs nativas do Chrome;
- reagir a eventos do navegador;
- evitar observação contínua do DOM;
- não depender de backend;
- não adicionar dependências sem necessidade;
- manter o menor conjunto possível de permissões;
- preservar armazenamento local e funcionamento offline.

## Limites do projeto

O TabTag não pretende se tornar um gerenciador completo de abas.

Recursos que exijam observar continuamente o DOM, acompanhar componentes internos das páginas ou injetar lógica persistente em sites ficam fora do escopo.

O projeto deve continuar baseado principalmente em:

- `chrome.tabs`;
- `chrome.runtime`;
- `chrome.storage`;
- `chrome.scripting`;
- `document.title`.

## Por quê

Aplicações modernas já executam sua própria lógica de atualização de interface e podem utilizar mecanismos de observação do DOM.

Adicionar observadores persistentes apenas para ampliar funcionalidades do TabTag aumentaria a complexidade e o custo de execução sem servir ao objetivo original da extensão.

Se uma funcionalidade exigir esse tipo de arquitetura para existir, ela deve ser tratada como fora do escopo do TabTag.