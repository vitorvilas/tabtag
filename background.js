const TAB_STATE_PREFIX = 'tabtag:tab:';

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!shouldHandleUpdate(changeInfo)) return;

  handleTabUpdate(tabId, tab).catch((error) => {
    console.warn('TabTag: falha ao atualizar marcador.', error);
  });
});

chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.id || !isScriptableUrl(tab.url)) return;

  handleTabUpdate(tab.id, tab).catch(() => {
    // A aba pode ainda não estar pronta para receber scripts.
    // chrome.tabs.onUpdated fará uma nova tentativa durante o carregamento.
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(getTabStateKey(tabId)).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  restoreOpenTabs().catch((error) => {
    console.warn(
      'TabTag: falha ao restaurar marcadores na inicialização.',
      error
    );
  });
});

chrome.runtime.onInstalled.addListener(() => {
  restoreOpenTabs().catch((error) => {
    console.warn(
      'TabTag: falha ao restaurar marcadores após instalação/atualização.',
      error
    );
  });
});

function shouldHandleUpdate(changeInfo) {
  return (
    changeInfo.status === 'complete' ||
    typeof changeInfo.title === 'string' ||
    typeof changeInfo.url === 'string'
  );
}

function isScriptableUrl(url) {
  return (
    typeof url === 'string' &&
    (url.startsWith('http://') || url.startsWith('https://'))
  );
}

function getTabStateKey(tabId) {
  return `${TAB_STATE_PREFIX}${tabId}`;
}

async function restoreOpenTabs() {
  const tabs = await chrome.tabs.query({});

  const jobs = tabs
    .filter((tab) => tab.id && isScriptableUrl(tab.url))
    .map((tab) => handleTabUpdate(tab.id, tab));

  const results = await Promise.allSettled(jobs);

  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.warn(
        'TabTag: uma aba não pôde ser restaurada.',
        result.reason
      );
    }
  });
}

async function handleTabUpdate(tabId, tab) {
  if (!tabId || !tab) return;

  const stateKey = getTabStateKey(tabId);

  const previousStateResult = await chrome.storage.session.get(stateKey);
  const previousState = previousStateResult[stateKey] || null;

  if (!isScriptableUrl(tab.url)) {
    await chrome.storage.session.remove(stateKey);
    return;
  }

  const storedMarkerResult = await chrome.storage.local.get(tab.url);
  const marker = storedMarkerResult[tab.url] || null;

  if (!marker) {
    if (
      previousState?.marker &&
      previousState.url !== tab.url
    ) {
      await removeMarkerFromTitle(
        tabId,
        previousState.marker
      );
    }

    await chrome.storage.session.set({
      [stateKey]: {
        url: tab.url,
        marker: null
      }
    });

    return;
  }

  const previousMarker =
    previousState?.marker &&
    previousState.marker !== marker
      ? previousState.marker
      : null;

  await applyMarkerToTitle(
    tabId,
    marker,
    previousMarker
  );

  await chrome.storage.session.set({
    [stateKey]: {
      url: tab.url,
      marker
    }
  });
}

async function applyMarkerToTitle(
  tabId,
  marker,
  previousMarker
) {
  await chrome.scripting.executeScript({
    target: { tabId },

    func: (savedMarker, oldMarker) => {
      const savedPrefix = `${savedMarker} `;
      let title = document.title;

      if (title.startsWith(savedPrefix)) {
        return;
      }

      if (oldMarker) {
        const oldPrefix = `${oldMarker} `;

        while (title.startsWith(oldPrefix)) {
          title = title.slice(oldPrefix.length);
        }
      }

      document.title = `${savedPrefix}${title}`;
    },

    args: [marker, previousMarker]
  });
}

async function removeMarkerFromTitle(
  tabId,
  marker
) {
  await chrome.scripting.executeScript({
    target: { tabId },

    func: (savedMarker) => {
      const prefix = `${savedMarker} `;
      let title = document.title;

      while (title.startsWith(prefix)) {
        title = title.slice(prefix.length);
      }

      if (title !== document.title) {
        document.title = title;
      }
    },

    args: [marker]
  });
}