<div align="center">

<p align="center">
  <img src="assets/banner.png" alt="TabTag" width="100%">
</p>

**Marcadores visuais para organizar abas em navegadores baseados em Chromium, com persistência por URL e armazenamento local.**

<p align="center">
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/">
    <img src="https://img.shields.io/badge/Manifest-Manifest%20V3-blue?logo=googlechrome&logoColor=white" alt="Manifest V3">
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

A persistência também atravessa sessões do navegador. Se o Chrome for fechado ou o computador for reiniciado, a associação continua armazenada e pode ser restaurada quando aquela URL voltar a ser aberta.

## Compatibilidade

O TabTag foi desenvolvido para navegadores baseados em Chromium.

O projeto tem como alvo:

- Google Chrome
- Microsoft Edge
- Chromium

Outros navegadores baseados em Chromium, como Brave, Vivaldi e Opera, também podem funcionar com o TabTag, mas ainda não fazem parte da matriz de testes do projeto.

## Como funciona

Ao selecionar uma tag, o TabTag salva a associação entre a URL atual e o marcador em `chrome.storage.local`.

Em seguida, o marcador é aplicado como prefixo de `document.title`.

Conceitualmente:

```text
https://exemplo.com/projeto/42 → 🟦
```

A associação é feita pela URL. Endereços diferentes são tratados como registros diferentes.

O TabTag acompanha carregamentos, mudanças de URL e alterações de título usando eventos nativos do navegador.

Também restaura os marcadores quando o navegador é iniciado novamente e quando abas são recuperadas de uma sessão anterior.

Quando encontra uma URL marcada, consulta o estado salvo e verifica se o título já contém o marcador correto.

Se já estiver presente, nada é feito.

Se tiver desaparecido, o TabTag o reaplica.

## Páginas que alteram o título depois do carregamento

Aplicações como Gemini, YouTube, WhatsApp Web e Notion podem atualizar `document.title` depois que a interface já foi carregada.

O TabTag acompanha essas alterações pelos eventos do navegador:

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

Não é necessário manter um `MutationObserver` permanente ou polling (verificação contínua) dentro da página.

Essa é uma decisão de arquitetura do projeto: o TabTag deve continuar pequeno, orientado a eventos e sem monitoramento permanente do DOM.

## Persistência por URL

Enquanto existir uma tag salva para determinado endereço, o TabTag pode restaurá-la quando:

- a página é recarregada;
- o site altera o próprio título;
- a aba é fechada e a mesma URL é aberta novamente;
- a URL é aberta em outra aba;
- a URL é aberta em uma nova janela;
- o navegador é fechado e aberto novamente;
- o computador é reiniciado e a URL volta a ser aberta.

A persistência permanente fica em `chrome.storage.local`.

O `chrome.storage.session` é usado apenas para estado temporário das abas durante a sessão atual.

Ao remover o marcador pelo popup, a associação daquela URL também é apagada.

## Barra de endereços e histórico

Como o TabTag altera o título real da página, o marcador também pode aparecer em locais onde o navegador reutiliza esse título, como sugestões da barra de endereços e resultados do histórico.

Exemplo:

```text
🟪 TabTag - Google Gemini
🟦 GitHub - Projeto
🟥 Bug crítico - Aplicação
```

Isso permite reconhecer visualmente algumas páginas marcadas antes mesmo de reabri-las.

O comportamento exato dessas sugestões é controlado pelo próprio navegador.

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
edge://extensions
```

não recebem marcadores.

## Arquitetura

O projeto usa Manifest V3 e JavaScript puro.

Não há framework de frontend, backend, banco de dados remoto ou etapa de build.

```text
tabtag/
├── assets/
├── docs/
├── icons/
├── .gitignore
├── background.js
├── CHANGELOG.md
├── LICENSE
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

É o Service Worker (trabalhador de serviço) responsável pela restauração dos marcadores.

Ele acompanha:

- carregamentos e alterações de título com `chrome.tabs.onUpdated`;
- novas abas com `chrome.tabs.onCreated`;
- inicialização do navegador com `chrome.runtime.onStartup`;
- instalação ou atualização da extensão com `chrome.runtime.onInstalled`.

Quando encontra uma URL marcada, verifica o título atual e só executa a restauração quando necessário.

### `manifest.json`

Define a extensão em Manifest V3, suas permissões e os arquivos usados pelo navegador.

## Princípios do projeto

O TabTag nasceu para ser simples e deve continuar assim.

A extensão usa APIs nativas do navegador e evita manter lógica executando continuamente dentro das páginas.

Alguns princípios orientam o projeto:

- usar eventos nativos do navegador;
- evitar observação contínua do DOM;
- manter armazenamento e funcionamento locais;
- evitar dependências sem necessidade;
- usar o menor conjunto possível de permissões;
- preservar uma base de código pequena e fácil de entender.

O TabTag não pretende se tornar um gerenciador completo de abas.

Funcionalidades que exijam observação permanente do DOM, acompanhamento de componentes internos dos sites ou infraestrutura desproporcional ao objetivo da extensão ficam fora do escopo do projeto.

## Instalação

O TabTag ainda não é distribuído pela Chrome Web Store.

A forma mais simples de instalar é baixar o ZIP publicado em **Releases**, descompactar e carregar a pasta como extensão local.

### Baixando a versão pronta

1. Abra a página **Releases** deste repositório.
2. Entre na versão mais recente.
3. Em **Assets**, baixe:

```text
tabtag-v1.1.2.zip
```

4. Descompacte o arquivo em uma pasta permanente no computador.

> Não carregue o arquivo `.zip` diretamente. O navegador precisa da pasta já descompactada.

### Google Chrome e Chromium

Abra:

```text
chrome://extensions
```

Ative **Modo do desenvolvedor**.

Depois clique em:

```text
Carregar sem compactação
```

Selecione a pasta do TabTag que contém:

```text
manifest.json
```

### Microsoft Edge

Abra:

```text
edge://extensions
```

Ative **Modo do desenvolvedor**.

Depois clique em:

```text
Carregar descompactado
```

Selecione a pasta do TabTag que contém o `manifest.json`.

### Instalando pelo código-fonte

Quem quiser trabalhar diretamente com o código pode clonar o repositório:

```bash
git clone https://github.com/vitorvilas/tabtag.git
cd tabtag
```

Depois carregue a própria pasta clonada como extensão descompactada.

Não é necessário copiar os arquivos para outra pasta. Arquivos como `README.md`, `CHANGELOG.md`, `LICENSE` e o conteúdo de `docs/` não interferem no funcionamento da extensão.

Durante o desenvolvimento, depois de alterar os arquivos locais, use o botão de recarregar disponível na página de extensões do navegador.

## Atualização manual

Enquanto o TabTag for distribuído por ZIP, atualizações também são feitas manualmente.

Para atualizar:

1. baixe a nova versão em **Releases**;
2. substitua a pasta local pela nova versão;
3. abra a página de extensões;
4. clique em **Recarregar** no TabTag.

As associações salvas em `chrome.storage.local` pertencem à instalação da extensão e não aos arquivos da pasta do projeto.

## Privacidade e permissões

Os marcadores ficam armazenados localmente pelo navegador.

O TabTag não possui backend para armazenar tags e não implementa telemetria.

A interface também não depende de bibliotecas ou scripts externos.

| Permissão | Uso |
| --- | --- |
| `scripting` | Executa o código que altera `document.title` |
| `storage` | Armazena os marcadores e o estado temporário da sessão |
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

## Histórico de versões

Consulte [`CHANGELOG.md`](CHANGELOG.md) para ver as alterações de cada versão.

## Licença

Distribuído sob a licença **MIT**. Consulte [`LICENSE`](LICENSE) para mais informações.

## Autor

Desenvolvido por **Vitor Vilas Boas**.