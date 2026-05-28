const api = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
const usesPromiseApi = typeof browser !== "undefined";
const storageKey = VendorDefaults.storageKey;
const versionKey = VendorDefaults.versionKey;
const typeLabels = Object.fromEntries(VendorDefaults.types.map((type) => [type.id, type.label]));
let vendors = [];
let activeFilter = "all";

const elements = {
  form: document.querySelector("#vendor-form"),
  vendorId: document.querySelector("#vendor-id"),
  vendorName: document.querySelector("#vendor-name"),
  vendorTemplate: document.querySelector("#vendor-template"),
  vendorEnabled: document.querySelector("#vendor-enabled"),
  typeCheckboxes: document.querySelector("#type-checkboxes"),
  formTitle: document.querySelector("#form-title"),
  cancelEdit: document.querySelector("#cancel-edit"),
  testVendor: document.querySelector("#test-vendor"),
  formMessage: document.querySelector("#form-message"),
  vendorsTable: document.querySelector("#vendors-table"),
  vendorCount: document.querySelector("#vendor-count"),
  rowTemplate: document.querySelector("#vendor-row-template"),
  resetVendors: document.querySelector("#reset-vendors"),
  exportVendors: document.querySelector("#export-vendors"),
  importFile: document.querySelector("#import-file"),
  filters: document.querySelectorAll(".filter")
};

function extensionLastError() {
  return typeof chrome !== "undefined" ? chrome.runtime?.lastError || null : null;
}

function storageGet(defaults) {
  if (!api?.storage?.local) {
    return Promise.resolve(defaults);
  }

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
  if (!api?.storage?.local) {
    return Promise.resolve(values);
  }

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
  if (!api?.tabs?.create) {
    window.open(details.url, "_blank", "noopener");
    return Promise.resolve();
  }

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

function cloneDefaults() {
  return JSON.parse(JSON.stringify(VendorDefaults.vendors));
}

async function loadVendors() {
  const stored = await storageGet({
    [storageKey]: null
  });

  vendors = Array.isArray(stored[storageKey]) ? stored[storageKey] : cloneDefaults();
  await persistVendors();
  render();
}

async function persistVendors() {
  await storageSet({
    [storageKey]: vendors,
    [versionKey]: VendorDefaults.version
  });
}

function createTypeInputs() {
  elements.typeCheckboxes.textContent = "";

  for (const type of VendorDefaults.types) {
    const label = document.createElement("label");
    label.className = "type-option";
    label.htmlFor = `vendor-type-${type.id}`;

    const span = document.createElement("span");
    span.textContent = type.label;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `vendor-type-${type.id}`;
    input.value = type.id;

    label.append(span, input);
    elements.typeCheckboxes.append(label);
  }
}

function selectedTypes() {
  return [...elements.typeCheckboxes.querySelectorAll("input:checked")].map((input) => input.value);
}

function setSelectedTypes(types) {
  const selected = new Set(types);
  for (const input of elements.typeCheckboxes.querySelectorAll("input")) {
    input.checked = selected.has(input.value);
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function validateTemplate(template) {
  let parsedUrl;
  try {
    parsedUrl = new URL(template.replaceAll("{value}", "test").replaceAll("{raw}", "test"));
  } catch {
    return "Enter a valid http or https URL template.";
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return "Only http and https vendor URLs are supported.";
  }

  if (!template.includes("{value}") && !template.includes("{raw}")) {
    return "Add {value} or {raw} where the selected text should be inserted.";
  }

  return "";
}

function buildVendorUrl(template, value) {
  return template
    .replaceAll("{value}", encodeURIComponent(value))
    .replaceAll("{raw}", value);
}

function setMessage(text, type = "") {
  elements.formMessage.textContent = text;
  elements.formMessage.className = `message ${type}`.trim();
}

function resetForm() {
  elements.form.reset();
  elements.vendorId.value = "";
  elements.vendorEnabled.checked = true;
  setSelectedTypes([]);
  elements.formTitle.textContent = "Add Vendor";
  elements.cancelEdit.classList.add("hidden");
  setMessage("");
}

function vendorMatchesFilter(vendor) {
  return activeFilter === "all" || vendor.types.includes(activeFilter);
}

function renderTypePills(types) {
  const fragment = document.createDocumentFragment();

  for (const type of types) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = typeLabels[type] || type;
    fragment.append(pill);
  }

  return fragment;
}

function render() {
  const filteredVendors = vendors.filter(vendorMatchesFilter);
  elements.vendorsTable.textContent = "";
  elements.vendorCount.textContent = `${filteredVendors.length} shown, ${vendors.length} total`;

  for (const vendor of filteredVendors) {
    const row = elements.rowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.vendorId = vendor.id;
    row.querySelector(".vendor-name").textContent = vendor.name;
    row.querySelector(".vendor-types").append(renderTypePills(vendor.types));
    row.querySelector(".vendor-template").textContent = vendor.urlTemplate;

    const status = row.querySelector(".vendor-status");
    const statusText = document.createElement("span");
    statusText.className = `status ${vendor.enabled === false ? "off" : ""}`.trim();
    statusText.textContent = vendor.enabled === false ? "Disabled" : "Enabled";
    status.append(statusText);

    elements.vendorsTable.append(row);
  }
}

async function saveVendor(event) {
  event.preventDefault();

  const name = elements.vendorName.value.trim();
  const urlTemplate = elements.vendorTemplate.value.trim();
  const types = selectedTypes();
  const enabled = elements.vendorEnabled.checked;
  const existingId = elements.vendorId.value;

  if (!name) {
    setMessage("Enter a vendor name.", "error");
    return;
  }

  if (types.length === 0) {
    setMessage("Select at least one supported value type.", "error");
    return;
  }

  const templateError = validateTemplate(urlTemplate);
  if (templateError) {
    setMessage(templateError, "error");
    return;
  }

  const id = existingId || `custom-${Date.now()}-${slugify(name) || "vendor"}`;
  const nextVendor = { id, name, types, urlTemplate, enabled };
  const index = vendors.findIndex((vendor) => vendor.id === id);

  if (index >= 0) {
    vendors[index] = nextVendor;
  } else {
    vendors.push(nextVendor);
  }

  vendors.sort((a, b) => a.name.localeCompare(b.name));
  await persistVendors();
  resetForm();
  render();
  setMessage("Vendor saved.", "success");
}

function editVendor(id) {
  const vendor = vendors.find((item) => item.id === id);
  if (!vendor) {
    return;
  }

  elements.vendorId.value = vendor.id;
  elements.vendorName.value = vendor.name;
  elements.vendorTemplate.value = vendor.urlTemplate;
  elements.vendorEnabled.checked = vendor.enabled !== false;
  setSelectedTypes(vendor.types);
  elements.formTitle.textContent = "Edit Vendor";
  elements.cancelEdit.classList.remove("hidden");
  setMessage("");
  elements.vendorName.focus();
}

async function deleteVendor(id) {
  const vendor = vendors.find((item) => item.id === id);
  if (!vendor) {
    return;
  }

  const confirmed = confirm(`Delete ${vendor.name}?`);
  if (!confirmed) {
    return;
  }

  vendors = vendors.filter((item) => item.id !== id);
  await persistVendors();
  render();
}

function testVendor() {
  const template = elements.vendorTemplate.value.trim();
  const templateError = validateTemplate(template);
  if (templateError) {
    setMessage(templateError, "error");
    return;
  }

  const sampleByType = {
    ip: "8.8.8.8",
    domain: "example.com",
    hash: "44d88612fea8a8f36de82e1278abb02f",
    url: "https://example.com/login"
  };
  const [type] = selectedTypes();
  const sampleValue = sampleByType[type] || "example.com";
  createTab({ url: buildVendorUrl(template, sampleValue), active: true });
}

async function resetVendors() {
  const confirmed = confirm("Reset the toolbase to the built-in vendor list?");
  if (!confirmed) {
    return;
  }

  vendors = cloneDefaults();
  await persistVendors();
  resetForm();
  render();
}

function exportVendors() {
  const data = JSON.stringify({ version: VendorDefaults.version, vendors }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "reputation-toolkit-vendors.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importVendors(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const contents = await file.text();
    const parsed = JSON.parse(contents);
    const importedVendors = Array.isArray(parsed) ? parsed : parsed.vendors;
    if (!Array.isArray(importedVendors)) {
      throw new Error("JSON must contain a vendors array.");
    }

    for (const vendor of importedVendors) {
      if (!vendor.id || !vendor.name || !Array.isArray(vendor.types) || !vendor.urlTemplate) {
        throw new Error("Each vendor needs id, name, types, and urlTemplate.");
      }

      const templateError = validateTemplate(vendor.urlTemplate);
      if (templateError) {
        throw new Error(`${vendor.name}: ${templateError}`);
      }
    }

    vendors = importedVendors.map((vendor) => ({
      id: String(vendor.id),
      name: String(vendor.name),
      types: vendor.types.filter((type) => typeLabels[type]),
      urlTemplate: String(vendor.urlTemplate),
      enabled: vendor.enabled !== false
    }));
    await persistVendors();
    resetForm();
    render();
    setMessage("Vendor list imported.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    elements.importFile.value = "";
  }
}

function handleTableClick(event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const row = event.target.closest("tr");
  const id = row?.dataset.vendorId;
  if (!id) {
    return;
  }

  if (button.classList.contains("edit")) {
    editVendor(id);
  }

  if (button.classList.contains("delete")) {
    deleteVendor(id);
  }
}

function setFilter(filter) {
  activeFilter = filter;
  for (const button of elements.filters) {
    button.classList.toggle("active", button.dataset.filter === filter);
  }
  render();
}

createTypeInputs();
elements.form.addEventListener("submit", saveVendor);
elements.cancelEdit.addEventListener("click", resetForm);
elements.testVendor.addEventListener("click", testVendor);
elements.resetVendors.addEventListener("click", resetVendors);
elements.exportVendors.addEventListener("click", exportVendors);
elements.importFile.addEventListener("change", importVendors);
elements.vendorsTable.addEventListener("click", handleTableClick);
for (const button of elements.filters) {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
}

loadVendors().catch((error) => {
  setMessage(error.message, "error");
});
