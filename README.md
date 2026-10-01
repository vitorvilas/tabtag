<div align="center">

<p align="center">
  <img src="assets/banner.png" alt="TabTag" width="100%">
</p>

**Marcadores visuais para organizar abas do Chrome por contexto e status, com persistência por URL e armazenamento local.**

<p align="center">
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/">
    <img src="https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?logo=googlechrome&logoColor=white" alt="Chrome Manifest V3">
  </a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">
    <img src="https://img.shields.io/badge/Language-Vanilla%20JS-yellow?logo=javascript&logoColor=white" alt="JavaScript">
  </a>
  <a href="#privacidade-e-permissões">
    <img src="https://img.shields.io/badge/Data%20Privacy-100%25%20Local-success" alt="Privacidade">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-purple.svg" alt="Licença MIT">
  </a>
</p>

</div>

## O que é o TabTag

O TabTag adiciona marcadores visuais diretamente ao título das páginas para facilitar a identificação de abas abertas.

Você escolhe uma cor ou um status pelo popup da extensão:

```text
🟥 Bug crítico | Frontend
🟦 GitHub | TabTag
🟩 Documentação | Projeto
📌 Notion | Especificação
⏳ Deploy | Produção
🎯 Roadmap | Sprint atual
```

O marcador fica associado à URL e salvo no próprio navegador.

Isso permite fechar a aba e continuar com a organização depois. Ao abrir novamente a mesma URL, seja na mesma janela, em outra aba ou em uma nova janela, o TabTag restaura o marcador automaticamente.

## Como funciona

Ao selecionar uma tag, o TabTag salva a associação entre a URL atual e o marcador em `chrome.storage.local`.

Em seguida, o marcador é aplicado como prefixo de `document.title`.

Conceitualmente:

```text
https://exemplo.com/projeto/42 → 🟦
```

A associação é feita pela URL. Endereços diferentes são tratados como registros diferentes.

O Service Worker acompanha atualizações das abas com `chrome.tabs.onUpdated`. Quando uma página termina de carregar, muda de endereço ou altera o próprio título, o TabTag consulta o estado salvo e verifica se aquela URL possui uma tag.

Se o título já começa com o marcador correto, nada é feito.

Se a página tiver removido o marcador, ele é reaplicado.

## Páginas que alteram o título depois do carregamento

Aplicações como Gemini, YouTube, WhatsApp Web e Notion podem atualizar `document.title` depois que a interface já foi carregada.

O TabTag acompanha essas alterações pelos eventos do próprio Chrome.

```text
Página altera o título
        │
        ▼
chrome.tabs.onUpdated
        │
        ▼
Existe marcador para a URL?
        │
        ▼
Título já começa com ele?
        │
   ┌────┴────┐
   │         │
  sim       não
   │         │
encerra   reaplica
```

Não é necessário manter um `MutationObserver` permanente ou polling contínuo dentro da página.

## Persistência por URL

Enquanto existir uma tag salva para determinado endereço, o TabTag pode restaurá-la quando:

- a página é recarregada;
- o site altera o próprio título;
- a aba é fechada e a mesma URL é aberta novamente;
- a URL é aberta em outra aba;
- a URL é aberta em uma nova janela.

Ao remover o marcador pelo popup, a associação daquela URL também é apagada.

## Barra de endereços e histórico do Chrome

Como o TabTag altera o título real da página, o marcador também pode aparecer em locais onde o Chrome reutiliza esse título, como sugestões da barra de endereços e resultados do histórico.

Exemplo:

```text
🟪 TabTag - Google Gemini
🟦 GitHub - Projeto
🟥 Bug crítico - Aplicação
```

Isso permite reconhecer visualmente algumas páginas marcadas antes mesmo de reabri-las.

O comportamento exato das sugestões é controlado pelo próprio Chrome.

## Marcadores disponíveis

### Cores

| Marcador | Uso sugerido |
| :---: | --- |
| 🟥 | Urgente / Crítico |
| 🟧 | Pendente / Atenção |
| 🟨 | Rascunho / Ideia |
| 🟩 | Concluído / Finanças |
| 🟦 | Trabalho / Código |
| 🟪 | Pessoal / Leitura |
| 🟫 | Referência / Arquivo |
| ⬛ | Foco / Concluído |

Os significados são uma convenção visual. A extensão não associa comportamentos diferentes a cada cor.

### Status e foco

| Marcador | Uso sugerido |
| :---: | --- |
| 📌 | Fixado / Importante |
| ⏳ | Aguardando / Em andamento |
| 🎯 | Foco / Prioridade |
| 🚀 | Ação / Em produção |

Para o TabTag, cores e status funcionam da mesma forma: são marcadores associados à URL.

## Troca e remoção

Ao escolher outra tag, o TabTag substitui o marcador que ele próprio adicionou ao início do título.

Emojis que façam parte do conteúdo original do título não são removidos apenas por também existirem na paleta da extensão.

O botão **Remover Marcador** apaga a associação salva para a URL atual e restaura o título sem a tag do TabTag.

## URLs suportadas

O TabTag atua em páginas HTTP e HTTPS:

```text
http://
https://
```

Páginas internas do navegador, como:

```text
chrome://extensions
chrome://settings
```

não recebem marcadores.

## Arquitetura

O projeto usa Manifest V3 e JavaScript puro.

Não há framework de frontend, backend, banco de dados remoto ou etapa de build.

```text
tabtag/
├── assets/
│   └── banner.png
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background.js
├── manifest.json
├── popup.html
├── popup.js
└── README.md
```

### `popup.html`

Contém a interface da extensão, com oito opções de cor, quatro marcadores de status e o botão para remover a tag atual.

### `popup.js`

Cuida da interação com o popup:

- identifica a aba ativa;
- valida a URL;
- salva o marcador;
- altera o título da página;
- troca um marcador existente;
- remove a tag e o registro local.

### `background.js`

É o Service Worker responsável por acompanhar carregamentos, mudanças de URL e alterações de título.

Quando encontra uma URL marcada, verifica o título atual e só executa a restauração quando necessário.

### `manifest.json`

Define a extensão em Manifest V3, suas permissões e os arquivos usados pelo Chrome.

## Instalação

O TabTag ainda não é distribuído pela Chrome Web Store.

A forma mais simples de instalar é baixar o ZIP publicado em **Releases**, descompactar e carregar a pasta pelo Chrome.

### Baixando a versão pronta

1. Abra a página **Releases** deste repositório.
2. Entre na versão mais recente.
3. Em **Assets**, baixe:

```text
tabtag-v1.1.1.zip
```

4. Descompacte o arquivo em uma pasta do computador.

> Não carregue o arquivo `.zip` diretamente no Chrome. A extensão precisa estar descompactada.

### Carregando no Chrome

Abra:

```text
chrome://extensions
```

Ative **Modo do desenvolvedor** no canto superior direito.

Depois clique em:

```text
Carregar sem compactação
```

Selecione a pasta do TabTag que contém:

```text
manifest.json
```

A extensão aparecerá na lista do Chrome.

Se quiser acesso rápido, fixe o TabTag na barra de ferramentas.

### Instalando pelo código-fonte

Quem quiser trabalhar diretamente com o código também pode clonar o repositório:

```bash
git clone URL_DO_REPOSITORIO
cd tabtag
```

Depois siga o mesmo processo em `chrome://extensions`:

1. ative **Modo do desenvolvedor**;
2. clique em **Carregar sem compactação**;
3. selecione a pasta raiz do projeto.

Durante o desenvolvimento, depois de alterar os arquivos locais, use o botão de recarregar da extensão em `chrome://extensions`.

## Privacidade e permissões

Os marcadores ficam armazenados localmente pelo Chrome.

O TabTag não possui backend para armazenar tags e não implementa telemetria.

A interface também não depende de bibliotecas ou scripts externos.

| Permissão | Uso |
| --- | --- |
| `scripting` | Executa o código que altera `document.title` |
| `storage` | Armazena a associação entre URL e marcador |
| `http://*/*` | Permite restaurar tags em páginas HTTP |
| `https://*/*` | Permite restaurar tags em páginas HTTPS |

## Limites atuais

A persistência é baseada na URL.

Por exemplo:

```text
https://exemplo.com/projeto/1
```

e:

```text
https://exemplo.com/projeto/2
```

são páginas diferentes para o TabTag.

Parâmetros e outras alterações que produzam URLs diferentes também podem gerar registros separados.

Cada URL mantém um marcador do TabTag por vez. Selecionar outra cor ou status substitui o anterior.

## Licença

Distribuído sob a licença **MIT**. Consulte [`LICENSE`](LICENSE) para mais informações.

<p align="center">
  Desenvolvido por <b>Vitor Vilas Boas</b>
</p>