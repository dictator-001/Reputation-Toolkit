if (typeof importScripts === "function") {
  if (typeof VendorDefaults === "undefined") {
    importScripts("vendors.js");
  }
  if (typeof Shared === "undefined") {
    importScripts("shared.js");
  }
}

const { api, storageGet, storageSet, createTab, buildVendorUrl, isSafeUrl } = Shared;
const ROOT_MENU_ID = "reputation-toolkit-root";
const OPEN_MATCHING_ID = "reputation-toolkit-open-matching";
const MANAGE_ID = "reputation-toolkit-manage";
const OPEN_ALL_PREFIX = "reputation-toolkit-open-all:";
const VENDOR_PREFIX = "reputation-toolkit-vendor:";
const TYPE_ORDER = ["ip", "domain", "hash", "url"];
const TYPE_LABELS = Object.fromEntries(VendorDefaults.types.map((type) => [type.id, type.label]));
let menuRebuildQueue = Promise.resolve();

function removeAllMenus() {
  if (Shared.usesPromiseApi) {
    return api.contextMenus.removeAll();
  }

  return new Promise((resolve, reject) => {
    api.contextMenus.removeAll(() => {
      const lastError = Shared.extensionLastError();
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

function openOptionsPage() {
  if (Shared.usesPromiseApi && api.runtime.openOptionsPage) {
    return api.runtime.openOptionsPage();
  }

  if (api.runtime.openOptionsPage) {
    return new Promise((resolve, reject) => {
      api.runtime.openOptionsPage(() => {
        const lastError = Shared.extensionLastError();
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  return createTab({ url: api.runtime.getURL("options.html"), active: true });
}

async function loadVendors() {
  const stored = await storageGet({
    [VendorDefaults.storageKey]: null,
    [VendorDefaults.versionKey]: null
  });
  const vendors = stored[VendorDefaults.storageKey];

  if (Array.isArray(vendors)) {
    return vendors;
  }

  await storageSet({
    [VendorDefaults.storageKey]: VendorDefaults.vendors,
    [VendorDefaults.versionKey]: VendorDefaults.version
  });
  return VendorDefaults.vendors;
}

function enabledVendorsForType(vendors, type) {
  return vendors
    .filter((vendor) => vendor.enabled !== false)
    .filter((vendor) => Array.isArray(vendor.types) && vendor.types.includes(type))
    .filter((vendor) => vendor.name && vendor.urlTemplate)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function createMenu(item) {
  return new Promise((resolve, reject) => {
    try {
      api.contextMenus.create(item, () => {
        const lastError = Shared.extensionLastError();
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function rebuildContextMenus() {
  const vendors = await loadVendors();
  await removeAllMenus();

  await createMenu({
    id: ROOT_MENU_ID,
    title: "Reputation Toolkit",
    contexts: ["selection"]
  });

  await createMenu({
    id: OPEN_MATCHING_ID,
    parentId: ROOT_MENU_ID,
    title: "Open matching vendors",
    contexts: ["selection"]
  });

  await createMenu({
    id: `${ROOT_MENU_ID}:separator-top`,
    parentId: ROOT_MENU_ID,
    type: "separator",
    contexts: ["selection"]
  });

  for (const type of TYPE_ORDER) {
    const typeMenuId = `${ROOT_MENU_ID}:type:${type}`;
    const typeVendors = enabledVendorsForType(vendors, type);

    await createMenu({
      id: typeMenuId,
      parentId: ROOT_MENU_ID,
      title: TYPE_LABELS[type],
      contexts: ["selection"]
    });

    await createMenu({
      id: `${OPEN_ALL_PREFIX}${type}`,
      parentId: typeMenuId,
      title: "Open in all",
      contexts: ["selection"],
      enabled: typeVendors.length > 0
    });

    await createMenu({
      id: `${typeMenuId}:separator`,
      parentId: typeMenuId,
      type: "separator",
      contexts: ["selection"]
    });

    for (const vendor of typeVendors) {
      await createMenu({
        id: `${VENDOR_PREFIX}${type}:${vendor.id}`,
        parentId: typeMenuId,
        title: vendor.name,
        contexts: ["selection"]
      });
    }
  }

  await createMenu({
    id: `${ROOT_MENU_ID}:separator-bottom`,
    parentId: ROOT_MENU_ID,
    type: "separator",
    contexts: ["selection"]
  });

  await createMenu({
    id: MANAGE_ID,
    parentId: ROOT_MENU_ID,
    title: "Manage vendors...",
    contexts: ["selection"]
  });
}

function queueContextMenuRebuild() {
  menuRebuildQueue = menuRebuildQueue
    .catch(() => {})
    .then(() => rebuildContextMenus());

  return menuRebuildQueue;
}

function cleanSelection(text) {
  return String(text || "")
    .trim()
    .replace(/^[\s"'`<([{]+/, "")
    .replace(/[\s"'`>.,;:)\]}]+$/, "");
}

function normalizeIp(text) {
  const cleaned = cleanSelection(text);
  const ipv4Match = cleaned.match(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/);
  if (ipv4Match) {
    return ipv4Match[0];
  }

  const ipv6Match = cleaned.match(/(?:^|[\s:])([a-fA-F0-9]{1,4}(?::[a-fA-F0-9]{1,4}){2,7})(?:$|[\s/])/);
  return ipv6Match ? ipv6Match[1] : "";
}

function normalizeHash(text) {
  const cleaned = cleanSelection(text);
  const hashMatch = cleaned.match(/\b[a-fA-F0-9]{32}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{64}\b/);
  return hashMatch ? hashMatch[0].toLowerCase() : "";
}

function normalizeUrl(text) {
  const cleaned = cleanSelection(text);
  if (!cleaned) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned)) {
    try {
      return new URL(cleaned).href;
    } catch {
      return cleaned;
    }
  }

  if (/^[^\s]+\.[^\s]{2,}/.test(cleaned) && /[/?:#]/.test(cleaned)) {
    return cleaned;
  }

  return "";
}

function normalizeDomain(text) {
  let cleaned = cleanSelection(text);
  if (!cleaned) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned)) {
    try {
      cleaned = new URL(cleaned).hostname;
    } catch {
      return "";
    }
  } else {
    cleaned = cleaned.replace(/^[*.]+/, "");
    cleaned = cleaned.split(/[/?#]/)[0];
    cleaned = cleaned.replace(/:\d+$/, "");
  }

  cleaned = cleaned.toLowerCase().replace(/\.$/, "");

  if (normalizeIp(cleaned)) {
    return "";
  }

  const labels = cleaned.split(".");
  const valid = labels.length >= 2 && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  return valid ? cleaned : "";
}

function normalizeForType(text, type) {
  if (type === "ip") {
    return normalizeIp(text);
  }
  if (type === "domain") {
    return normalizeDomain(text);
  }
  if (type === "hash") {
    return normalizeHash(text);
  }
  if (type === "url") {
    return normalizeUrl(text) || cleanSelection(text);
  }
  return cleanSelection(text);
}

function detectTypes(text) {
  const detected = [];
  const ip = normalizeIp(text);
  const hash = normalizeHash(text);
  const url = normalizeUrl(text);
  const domain = normalizeDomain(text);

  if (ip) {
    detected.push("ip");
  }
  if (hash) {
    detected.push("hash");
  }
  if (url) {
    detected.push("url");
  }
  if (domain) {
    detected.push("domain");
  }

  return detected;
}

async function openVendor(vendor, selectedText, type, active) {
  const normalizedValue = normalizeForType(selectedText, type);
  if (!normalizedValue) {
    return;
  }

  const targetUrl = buildVendorUrl(vendor.urlTemplate, normalizedValue);
  if (!isSafeUrl(targetUrl)) {
    return;
  }

  await createTab({ url: targetUrl, active });
}

async function openAllForType(vendors, selectedText, type) {
  const typeVendors = enabledVendorsForType(vendors, type);
  for (let index = 0; index < typeVendors.length; index += 1) {
    await openVendor(typeVendors[index], selectedText, type, index === 0);
  }
}

async function handleMenuClick(info) {
  const menuItemId = String(info.menuItemId);

  if (menuItemId === MANAGE_ID) {
    await openOptionsPage();
    return;
  }

  const selectedText = info.selectionText || "";
  const vendors = await loadVendors();

  if (menuItemId === OPEN_MATCHING_ID) {
    const [detectedType] = detectTypes(selectedText);
    if (detectedType) {
      await openAllForType(vendors, selectedText, detectedType);
    }
    return;
  }

  if (menuItemId.startsWith(OPEN_ALL_PREFIX)) {
    const type = menuItemId.slice(OPEN_ALL_PREFIX.length);
    await openAllForType(vendors, selectedText, type);
    return;
  }

  if (menuItemId.startsWith(VENDOR_PREFIX)) {
    const [, type, vendorId] = menuItemId.match(/^reputation-toolkit-vendor:([^:]+):(.+)$/) || [];
    const vendor = vendors.find((item) => item.id === vendorId);
    if (type && vendor) {
      await openVendor(vendor, selectedText, type, true);
    }
  }
}

api.runtime.onInstalled.addListener(() => {
  queueContextMenuRebuild().catch((error) => console.error("Context menu setup failed", error));
});

api.runtime.onStartup?.addListener(() => {
  queueContextMenuRebuild().catch((error) => console.error("Context menu setup failed", error));
});

api.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[VendorDefaults.storageKey]) {
    queueContextMenuRebuild().catch((error) => console.error("Context menu refresh failed", error));
  }
});

api.contextMenus.onClicked.addListener((info) => {
  handleMenuClick(info).catch((error) => console.error("Reputation lookup failed", error));
});

queueContextMenuRebuild().catch((error) => console.error("Context menu setup failed", error));
