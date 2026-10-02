const TAB_STATE_PREFIX = 'tabtag:tab:';
const DOMAIN_KEY_PREFIX = 'tabtag:domain:';
const SCOPE_KEY_PREFIX = 'tabtag:scope:';
const DOMAIN_SCOPE_VALUE = 'domain';

document.addEventListener('DOMContentLoaded', async () => {
  const markerButtons = document.querySelectorAll('.color-btn');
  const clearButton = document.getElementById('clear');
  const domainScope = document.getElementById('domainScope');
  const domainHint = document.getElementById('domainHint');

  const tab = await getCurrentTab();

  if (!tab?.id || !isScriptableUrl(tab.url)) {
    setControlsDisabled(markerButtons, clearButton, domainScope, true);
    domainHint.textContent = 'Disponível apenas em páginas HTTP/HTTPS';
    return;
  }

  domainHint.textContent = getHostname(tab.url) || '';
  domainScope.checked = await getDomainScopeEnabled(tab.url);

  domainScope.addEventListener('change', async () => {
    const useDomain = domainScope.checked;
    setControlsDisabled(markerButtons, clearButton, domainScope, true);

    try {
      await changeScope(tab, useDomain);
      domainScope.checked = useDomain;
    } catch (error) {
      domainScope.checked = !useDomain;
      console.error('TabTag: não foi possível alterar o escopo do marcador.', error);
    } finally {
      setControlsDisabled(markerButtons, clearButton, domainScope, false);
    }
  });

  markerButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const marker = button.dataset.emoji;
      if (!marker) return;

      const useDomain = domainScope.checked;
      setControlsDisabled(markerButtons, clearButton, domainScope, true);

      try {
        await setMarker(tab, marker, useDomain);
        window.close();
      } catch (error) {
        console.error('TabTag: não foi possível aplicar o marcador.', error);
        setControlsDisabled(markerButtons, clearButton, domainScope, false);
      }
    });
  });

  clearButton.addEventListener('click', async () => {
    const useDomain = domainScope.checked;
    setControlsDisabled(markerButtons, clearButton, domainScope, true);

    try {
      await clearMarker(tab, useDomain);
      window.close();
    } catch (error) {
      console.error('TabTag: não foi possível remover o marcador.', error);
      setControlsDisabled(markerButtons, clearButton, domainScope, false);
    }
  });
});

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

function getScopeKey(url) {
  const hostname = getHostname(url);
  return hostname ? `${SCOPE_KEY_PREFIX}${hostname}` : null;
}

function setControlsDisabled(markerButtons, clearButton, domainScope, disabled) {
  markerButtons.forEach((button) => {
    button.disabled = disabled;
  });

  clearButton.disabled = disabled;
  domainScope.disabled = disabled;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getDomainScopeEnabled(url) {
  const domainKey = getDomainKey(url);
  const scopeKey = getScopeKey(url);

  if (!domainKey || !scopeKey) return false;

  const stored = await chrome.storage.local.get([scopeKey, domainKey]);

  if (stored[scopeKey] === DOMAIN_SCOPE_VALUE) return true;

  // Compatibilidade com regras de domínio criadas nas versões 1.2.0 a 1.2.2.
  return Boolean(stored[domainKey]);
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

async function getUrlKeysForHostname(hostname) {
  const stored = await chrome.storage.local.get(null);

  return Object.keys(stored).filter((key) => {
    if (!isScriptableUrl(key)) return false;
    return getHostname(key) === hostname;
  });
}

async function changeScope(tab, useDomain) {
  const hostname = getHostname(tab.url);
  const domainKey = getDomainKey(tab.url);
  const scopeKey = getScopeKey(tab.url);

  if (!hostname || !domainKey || !scopeKey) return;

  const previousEffective = await getEffectiveMarker(tab.url);
  const urlKeys = await getUrlKeysForHostname(hostname);
  const affectedKeys = [...new Set([scopeKey, domainKey, ...urlKeys, tab.url])];
  const snapshot = await chrome.storage.local.get(affectedKeys);

  try {
    if (useDomain) {
      const values = {
        [scopeKey]: DOMAIN_SCOPE_VALUE
      };

      if (previousEffective.marker) {
        values[domainKey] = previousEffective.marker;
      }

      await chrome.storage.local.set(values);

      if (urlKeys.length > 0) {
        await chrome.storage.local.remove(urlKeys);
      }
    } else {
      if (previousEffective.marker) {
        await chrome.storage.local.set({
          [tab.url]: previousEffective.marker
        });
      }

      await chrome.storage.local.remove([domainKey, scopeKey]);
    }

    const nextEffective = await getEffectiveMarker(tab.url);
    await syncCurrentTabState(tab, previousEffective.marker, nextEffective);
  } catch (error) {
    await restoreStoredValues(affectedKeys, snapshot);
    throw error;
  }
}

async function setMarker(tab, marker, useDomain) {
  const hostname = getHostname(tab.url);
  const domainKey = getDomainKey(tab.url);
  const scopeKey = getScopeKey(tab.url);

  if (!hostname || !domainKey || !scopeKey) return;

  const previousEffective = await getEffectiveMarker(tab.url);
  const urlKeys = await getUrlKeysForHostname(hostname);
  const affectedKeys = [...new Set([scopeKey, domainKey, ...urlKeys, tab.url])];
  const snapshot = await chrome.storage.local.get(affectedKeys);

  try {
    if (useDomain) {
      await chrome.storage.local.set({
        [scopeKey]: DOMAIN_SCOPE_VALUE,
        [domainKey]: marker
      });

      if (urlKeys.length > 0) {
        await chrome.storage.local.remove(urlKeys);
      }
    } else {
      await chrome.storage.local.set({
        [tab.url]: marker
      });

      await chrome.storage.local.remove([domainKey, scopeKey]);
    }

    await applyMarkerToTitle(tab.id, marker, previousEffective.marker);

    await chrome.storage.session.set({
      [getTabStateKey(tab.id)]: {
        url: tab.url,
        marker,
        scope: useDomain ? 'domain' : 'url',
        key: useDomain ? domainKey : tab.url
      }
    });
  } catch (error) {
    await restoreStoredValues(affectedKeys, snapshot);
    throw error;
  }
}

async function clearMarker(tab, useDomain) {
  const hostname = getHostname(tab.url);
  const domainKey = getDomainKey(tab.url);
  const scopeKey = getScopeKey(tab.url);

  if (!hostname || !domainKey || !scopeKey) return;

  const previousEffective = await getEffectiveMarker(tab.url);
  const urlKeys = await getUrlKeysForHostname(hostname);
  const affectedKeys = [...new Set([scopeKey, domainKey, ...urlKeys, tab.url])];
  const snapshot = await chrome.storage.local.get(affectedKeys);

  try {
    if (useDomain) {
      await chrome.storage.local.remove([domainKey, ...urlKeys]);
      await chrome.storage.local.set({ [scopeKey]: DOMAIN_SCOPE_VALUE });
    } else {
      await chrome.storage.local.remove(tab.url);
    }

    const nextEffective = await getEffectiveMarker(tab.url);
    await syncCurrentTabState(tab, previousEffective.marker, nextEffective);
  } catch (error) {
    await restoreStoredValues(affectedKeys, snapshot);
    throw error;
  }
}

async function syncCurrentTabState(tab, previousMarker, nextEffective) {
  if (nextEffective.marker) {
    await applyMarkerToTitle(tab.id, nextEffective.marker, previousMarker);
  } else if (previousMarker) {
    await removeMarkerFromTitle(tab.id, previousMarker);
  }

  await chrome.storage.session.set({
    [getTabStateKey(tab.id)]: {
      url: tab.url,
      marker: nextEffective.marker,
      scope: nextEffective.scope,
      key: nextEffective.key
    }
  });
}

async function restoreStoredValues(keys, snapshot) {
  const valuesToRestore = {};
  const keysToRemove = [];

  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      valuesToRestore[key] = snapshot[key];
    } else {
      keysToRemove.push(key);
    }
  });

  if (Object.keys(valuesToRestore).length > 0) {
    await chrome.storage.local.set(valuesToRestore);
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
}

async function applyMarkerToTitle(tabId, marker, previousMarker) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (newMarker, oldMarker) => {
      const newPrefix = `${newMarker} `;
      let title = document.title;

      if (title.startsWith(newPrefix)) return;

      if (oldMarker) {
        const oldPrefix = `${oldMarker} `;

        while (title.startsWith(oldPrefix)) {
          title = title.slice(oldPrefix.length);
        }
      }

      document.title = `${newPrefix}${title}`;
    },
    args: [marker, previousMarker]
  });
}

async function removeMarkerFromTitle(tabId, marker) {
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
