const TAB_STATE_PREFIX = 'tabtag:tab:';
const DOMAIN_KEY_PREFIX = 'tabtag:domain:';
const SCOPE_KEY_PREFIX = 'tabtag:scope:';
const HISTORY_RECHECK_DELAY_MS = 500;

const historyRecheckTimers = new Map();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!shouldHandleUpdate(changeInfo)) return;

  handleTabUpdate(tabId, tab).catch((error) => {
    console.warn('TabTag: falha ao atualizar marcador.', error);
  });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0 || !isScriptableUrl(details.url)) return;

  handleHistoryNavigation(details.tabId, details.url).catch((error) => {
    console.warn('TabTag: falha ao acompanhar navegação interna.', error);
  });

  scheduleHistoryRecheck(details.tabId);
});

chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.id || !isScriptableUrl(tab.url)) return;

  handleTabUpdate(tab.id, tab).catch(() => {
    // A aba pode ainda não estar pronta para receber scripts.
    // chrome.tabs.onUpdated fará uma nova tentativa durante o carregamento.
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const timer = historyRecheckTimers.get(tabId);
  if (timer) clearTimeout(timer);
  historyRecheckTimers.delete(tabId);

  chrome.storage.session.remove(getTabStateKey(tabId)).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  restoreOpenTabs().catch((error) => {
    console.warn('TabTag: falha ao restaurar marcadores na inicialização.', error);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  normalizeDomainRules()
    .then(() => restoreOpenTabs())
    .catch((error) => {
      console.warn(
        'TabTag: falha ao normalizar ou restaurar marcadores após instalação/atualização.',
        error
      );
    });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  const hostnames = getAffectedHostnames(changes);
  if (hostnames.size === 0) return;

  syncOpenTabsForHostnames(hostnames).catch((error) => {
    console.warn('TabTag: falha ao sincronizar abas após alteração de marcador.', error);
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

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getDomainKey(url) {
  const hostname = getHostname(url);
  return hostname ? `${DOMAIN_KEY_PREFIX}${hostname}` : null;
}

function getScopeKeyFromHostname(hostname) {
  return hostname ? `${SCOPE_KEY_PREFIX}${hostname}` : null;
}

function getHostnameFromStorageKey(key) {
  if (key.startsWith(DOMAIN_KEY_PREFIX)) {
    const hostname = key.slice(DOMAIN_KEY_PREFIX.length).trim().toLowerCase();
    return hostname || null;
  }

  if (key.startsWith(SCOPE_KEY_PREFIX)) {
    const hostname = key.slice(SCOPE_KEY_PREFIX.length).trim().toLowerCase();
    return hostname || null;
  }

  if (!isScriptableUrl(key)) return null;
  return getHostname(key);
}

function getAffectedHostnames(changes) {
  const hostnames = new Set();

  Object.keys(changes).forEach((key) => {
    const hostname = getHostnameFromStorageKey(key);
    if (hostname) hostnames.add(hostname);
  });

  return hostnames;
}

async function getEffectiveMarker(url) {
  const domainKey = getDomainKey(url);
  const keys = domainKey ? [domainKey, url] : [url];
  const stored = await chrome.storage.local.get(keys);

  if (domainKey && stored[domainKey]) {
    return {
      marker: stored[domainKey],
      scope: 'domain',
      key: domainKey
    };
  }

  if (stored[url]) {
    return {
      marker: stored[url],
      scope: 'url',
      key: url
    };
  }

  return {
    marker: null,
    scope: null,
    key: null
  };
}

async function normalizeDomainRules() {
  const stored = await chrome.storage.local.get(null);
  const domainHostnames = new Set();

  Object.keys(stored).forEach((key) => {
    if (!key.startsWith(DOMAIN_KEY_PREFIX)) return;

    const hostname = key.slice(DOMAIN_KEY_PREFIX.length).trim().toLowerCase();
    if (hostname) domainHostnames.add(hostname);
  });

  if (domainHostnames.size === 0) return;

  const scopeValues = {};

  domainHostnames.forEach((hostname) => {
    scopeValues[getScopeKeyFromHostname(hostname)] = 'domain';
  });

  await chrome.storage.local.set(scopeValues);

  const staleUrlKeys = Object.keys(stored).filter((key) => {
    if (!isScriptableUrl(key)) return false;

    const hostname = getHostname(key);
    return hostname && domainHostnames.has(hostname);
  });

  if (staleUrlKeys.length > 0) {
    await chrome.storage.local.remove(staleUrlKeys);
  }
}

async function handleHistoryNavigation(tabId, url) {
  const tab = await chrome.tabs.get(tabId);
  await handleTabUpdate(tabId, { ...tab, url });
}

function scheduleHistoryRecheck(tabId) {
  const previousTimer = historyRecheckTimers.get(tabId);
  if (previousTimer) clearTimeout(previousTimer);

  const timer = setTimeout(async () => {
    historyRecheckTimers.delete(tabId);

    try {
      const tab = await chrome.tabs.get(tabId);
      if (!isScriptableUrl(tab.url)) return;
      await handleTabUpdate(tabId, tab);
    } catch (error) {
      if (!String(error?.message || error).includes('No tab with id')) {
        console.warn('TabTag: falha ao revalidar navegação interna.', error);
      }
    }
  }, HISTORY_RECHECK_DELAY_MS);

  historyRecheckTimers.set(tabId, timer);
}

async function restoreOpenTabs() {
  const tabs = await chrome.tabs.query({});
  await settleTabUpdates(tabs);
}

async function syncOpenTabsForHostnames(hostnames) {
  const tabs = await chrome.tabs.query({});

  const matchingTabs = tabs.filter((tab) => {
    if (!tab.id || !isScriptableUrl(tab.url)) return false;
    const hostname = getHostname(tab.url);
    return hostname && hostnames.has(hostname);
  });

  await settleTabUpdates(matchingTabs);
}

async function settleTabUpdates(tabs) {
  const jobs = tabs
    .filter((tab) => tab.id && isScriptableUrl(tab.url))
    .map((tab) => handleTabUpdate(tab.id, tab));

  const results = await Promise.allSettled(jobs);

  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.warn('TabTag: uma aba não pôde ser sincronizada.', result.reason);
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

  const effective = await getEffectiveMarker(tab.url);

  if (!effective.marker) {
    if (previousState?.marker) {
      await removeMarkerFromTitle(tabId, previousState.marker);
    }

    await chrome.storage.session.set({
      [stateKey]: {
        url: tab.url,
        marker: null,
        scope: null,
        key: null
      }
    });

    return;
  }

  const previousMarker =
    previousState?.marker && previousState.marker !== effective.marker
      ? previousState.marker
      : null;

  await applyMarkerToTitle(tabId, effective.marker, previousMarker);

  await chrome.storage.session.set({
    [stateKey]: {
      url: tab.url,
      marker: effective.marker,
      scope: effective.scope,
      key: effective.key
    }
  });
}

async function applyMarkerToTitle(tabId, marker, previousMarker) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (savedMarker, oldMarker) => {
      const originalTitle = document.title;
      const markerTokens = [savedMarker, oldMarker].filter(Boolean);
      const notificationCounters = [];
      let title = originalTitle.trimStart();
      let foundTabTagMarker = false;

      while (title) {
        let matchedMarker = false;

        for (const markerToken of markerTokens) {
          const prefix = `${markerToken} `;

          if (title.startsWith(prefix)) {
            title = title.slice(prefix.length).trimStart();
            foundTabTagMarker = true;
            matchedMarker = true;
            break;
          }
        }

        if (matchedMarker) continue;

        const counterMatch = title.match(/^\((\d+\+?)\)\s+/);

        if (counterMatch) {
          notificationCounters.push(counterMatch[0].trim());
          title = title.slice(counterMatch[0].length).trimStart();
          continue;
        }

        break;
      }

      const counters = foundTabTagMarker
        ? [...new Set(notificationCounters)]
        : notificationCounters;

      const prefixParts = [savedMarker, ...counters];
      const normalizedTitle = title
        ? `${prefixParts.join(' ')} ${title}`
        : prefixParts.join(' ');

      if (normalizedTitle !== originalTitle) {
        document.title = normalizedTitle;
      }
    },
    args: [marker, previousMarker]
  });
}

async function removeMarkerFromTitle(tabId, marker) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (savedMarker) => {
      const originalTitle = document.title;
      const notificationCounters = [];
      let title = originalTitle.trimStart();
      let foundTabTagMarker = false;

      while (title) {
        const markerPrefix = `${savedMarker} `;

        if (title.startsWith(markerPrefix)) {
          title = title.slice(markerPrefix.length).trimStart();
          foundTabTagMarker = true;
          continue;
        }

        const counterMatch = title.match(/^\((\d+\+?)\)\s+/);

        if (counterMatch) {
          notificationCounters.push(counterMatch[0].trim());
          title = title.slice(counterMatch[0].length).trimStart();
          continue;
        }

        break;
      }

      if (!foundTabTagMarker) return;

      const counters = [...new Set(notificationCounters)];
      const prefix = counters.join(' ');
      const normalizedTitle = prefix && title
        ? `${prefix} ${title}`
        : prefix || title;

      if (normalizedTitle !== originalTitle) {
        document.title = normalizedTitle;
      }
    },
    args: [marker]
  });
}
