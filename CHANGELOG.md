# Changelog

Todas as alterações relevantes do TabTag serão registradas neste arquivo.

## [1.2.3] - 02-10-2026

### Corrigido

- A chave **Aplicar a todo o domínio** agora salva o escopo assim que é alterada, sem exigir um novo clique em uma cor ou status.
- Ao ativar a chave em uma página já marcada, o marcador atual é promovido imediatamente para o domínio.
- Ao desligar a chave, um marcador de domínio é convertido para um marcador da URL atual.
- O estado da chave passa a persistir ao navegar entre páginas do mesmo `hostname`.

### Alterado

- O escopo selecionado passa a ser armazenado separadamente em `chrome.storage.local`.
- Regras de domínio criadas nas versões 1.2.0 a 1.2.2 continuam reconhecidas e recebem o novo estado de escopo durante a atualização.

---

## [1.2.2] - 02-10-2026

### Corrigido

- Reaplicação do marcador de domínio ao navegar entre rotas internas de aplicações SPA, como o LinkedIn.
- Tratamento específico de navegações feitas pela History API (`pushState`/`replaceState`) por meio de `chrome.webNavigation.onHistoryStateUpdated`.

### Alterado

- Adicionada a permissão `webNavigation` para acompanhar mudanças de rota sem observar o DOM.
- Após uma navegação interna, o TabTag faz uma única revalidação curta do título para cobrir atualizações assíncronas da página.

---

## [1.2.1] - 02-10-2026

### Corrigido

- O modo **Aplicar a todo o domínio** agora mantém a mesma tag ao navegar entre páginas do mesmo `hostname`, inclusive em aplicações SPA como o LinkedIn.
- Regras antigas por URL deixam de sobrescrever uma regra ativa de domínio.
- Na atualização para esta versão, URLs específicas cobertas por uma regra de domínio são removidas do armazenamento local.

### Alterado

- Os modos por URL e por domínio passam a ser exclusivos.
- Ao salvar uma tag para todo o domínio, o TabTag remove marcadores específicos daquele `hostname`.
- Ao salvar uma tag somente para a URL atual, uma regra de domínio existente é removida.
- Alterações em regras locais sincronizam as abas abertas do mesmo domínio.

---

## [1.2.0] - 02-10-2026

### Adicionado

- Chave seletora no popup para aplicar o marcador somente à URL atual ou a todo o domínio.
- Persistência de marcadores por domínio usando o `hostname` da página.
- Exibição do domínio atual abaixo da chave seletora.
- Fallback automático do marcador específico da URL para o marcador do domínio.

### Alterado

- Marcadores específicos de URL passam a ter prioridade sobre marcadores de domínio.
- Ao aplicar uma nova tag no modo de domínio, o marcador específico da URL atual é removido para que a regra do domínio tenha efeito imediato.
- O botão de remoção passa a respeitar o escopo selecionado no popup.
- A restauração automática agora resolve marcadores por URL e, na ausência deles, por domínio.
- Marcadores salvos por versões anteriores continuam compatíveis.

---

## [1.1.2] - 01-10-2026

### Corrigido

- Restauração dos marcadores após fechar e abrir novamente o Chrome.
- Restauração dos marcadores após reiniciar o Windows.
- Reconstrução do estado temporário das abas durante a inicialização do navegador.
- Restauração das tags em abas abertas ou recuperadas de uma sessão anterior.

### Alterado

- O Service Worker agora restaura os marcadores também durante a inicialização do Chrome.
- Abas recém-criadas passam por uma tentativa adicional de restauração do marcador.
- O estado persistente continua armazenado em `chrome.storage.local`, enquanto `chrome.storage.session` é usado apenas para o estado temporário da sessão.

---

## [1.1.1] - 30-09-2026

### Corrigido

- Preservação de emojis que já fazem parte do título original da página.
- Tratamento de mudanças de URL em aplicações SPA.
- Prevenção de reaplicações desnecessárias do marcador.
- Melhor tratamento de erros durante aplicação e remoção das tags.

### Alterado

- Redução das permissões da extensão.
- Ajustes de acessibilidade no popup.
- O popup agora aguarda a aplicação ou remoção do marcador antes de fechar.

---

## [1.1.0] - 30-09-2026

### Adicionado

- Persistência de marcadores por URL com `chrome.storage.local`.
- Restauração automática após recarregamento da página.
- Suporte a páginas que alteram `document.title` depois do carregamento.
- Oito marcadores de cor.
- Quatro marcadores de status e foco.
- Interface em modo escuro.
