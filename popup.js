const TAB_STATE_PREFIX = 'tabtag:tab:';

document.addEventListener('DOMContentLoaded', () => {
  const markerButtons = document.querySelectorAll('.color-btn');
  const clearButton = document.getElementById('clear');

  markerButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const marker = button.dataset.emoji;
      const tab = await getCurrentTab();

      if (!marker || !tab?.id || !isScriptableUrl(tab.url)) return;

      try {
        await setMarker(tab, marker);
        window.close();
      } catch (error) {
        console.error('TabTag: não foi possível aplicar o marcador.', error);
      }
    });
  });

  clearButton.addEventListener('click', async () => {
    const tab = await getCurrentTab();

    if (!tab?.id || !isScriptableUrl(tab.url)) return;

    try {
      await clearMarker(tab);
      window.close();
    } catch (error) {
      console.error('TabTag: não foi possível remover o marcador.', error);
    }
  });
});

function isScriptableUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

function getTabStateKey(tabId) {
  return `${TAB_STATE_PREFIX}${tabId}`;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function setMarker(tab, marker) {
  const previousResult = await chrome.storage.local.get(tab.url);
  const previousMarker = previousResult[tab.url] || null;

  await chrome.storage.local.set({ [tab.url]: marker });

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
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

    await chrome.storage.session.set({
      [getTabStateKey(tab.id)]: { url: tab.url, marker }
    });
  } catch (error) {
    if (previousMarker) {
      await chrome.storage.local.set({ [tab.url]: previousMarker });
    } else {
      await chrome.storage.local.remove(tab.url);
    }

    throw error;
  }
}

async function clearMarker(tab) {
  const previousResult = await chrome.storage.local.get(tab.url);
  const previousMarker = previousResult[tab.url] || null;

  if (!previousMarker) return;

  await chrome.storage.local.remove(tab.url);

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (marker) => {
        const prefix = `${marker} `;
        let title = document.title;

        while (title.startsWith(prefix)) {
          title = title.slice(prefix.length);
        }

        if (title !== document.title) {
          document.title = title;
        }
      },
      args: [previousMarker]
    });

    await chrome.storage.session.set({
      [getTabStateKey(tab.id)]: { url: tab.url, marker: null }
    });
  } catch (error) {
    await chrome.storage.local.set({ [tab.url]: previousMarker });
    throw error;
  }
}
