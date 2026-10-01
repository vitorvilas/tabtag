# Changelog

Todas as alterações relevantes do TabTag serão registradas neste arquivo.

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