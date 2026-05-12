const DEFAULTS = {
  globalEnabled: true,
  siteSettings: {},
  stats: { chars: 0, conversions: 0 }
};

chrome.runtime.onInstalled.addListener(async () => {
  const { globalEnabled } = await chrome.storage.sync.get('globalEnabled');
  if (globalEnabled === undefined) {
    await chrome.storage.sync.set(DEFAULTS);
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});
