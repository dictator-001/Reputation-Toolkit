(function initShared(globalScope) {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const usesPromiseApi = typeof browser !== "undefined";

  function extensionLastError() {
    return api.runtime?.lastError || (typeof chrome !== "undefined" ? chrome.runtime?.lastError || null : null);
  }

  function storageGet(defaults) {
    if (usesPromiseApi) {
      return api.storage.local.get(defaults);
    }

    return new Promise((resolve, reject) => {
      api.storage.local.get(defaults, (result) => {
        const lastError = extensionLastError();
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(result);
      });
    });
  }

  function storageSet(values) {
    if (usesPromiseApi) {
      return api.storage.local.set(values);
    }

    return new Promise((resolve, reject) => {
      api.storage.local.set(values, () => {
        const lastError = extensionLastError();
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  function createTab(details) {
    if (usesPromiseApi) {
      return api.tabs.create(details);
    }

    return new Promise((resolve, reject) => {
      api.tabs.create(details, (tab) => {
        const lastError = extensionLastError();
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(tab);
      });
    });
  }

  function buildVendorUrl(template, value) {
    const encodedValue = encodeURIComponent(value);
    return template
      .replaceAll("{value}", encodedValue)
      .replaceAll("{raw}", value);
  }

  function isSafeUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  globalScope.Shared = {
    api,
    usesPromiseApi,
    extensionLastError,
    storageGet,
    storageSet,
    createTab,
    buildVendorUrl,
    isSafeUrl
  };
})(globalThis);
