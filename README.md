# Reputation Toolkit Extension

Reputation Toolkit is a Chrome and Firefox WebExtension for looking up selected IOCs. Select an IP address, domain, hash, or URL on any page, right-click, then choose a vendor from **Reputation Toolkit**. The extension opens the vendor in a new tab with the selected value already placed into that vendor's search URL.

## Build

No dependencies are required.

```powershell
npm run build
```

The build command creates:

- `dist/chrome` for Chrome, Edge, Brave, and other Chromium browsers.
- `dist/firefox` for Firefox.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `dist/chrome`.

## Load In Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `dist/firefox/manifest.json`.

## Use

1. Select an IOC such as `8.8.8.8`, `example.com`, a SHA256 hash, or a URL.
2. Right-click the selected text.
3. Open **Reputation Toolkit**.
4. Pick **IP**, **Domain**, **Hash**, or **URL**.
5. Click a vendor or **Open in all**.

The **Open matching vendors** item detects the selected IOC type and opens the matching vendor list.

## Manage Vendors

Open the extension options page or click **Manage vendors...** from the context menu. From there you can:

- Add a new vendor.
- Edit or delete existing vendors.
- Enable or disable vendors in the right-click menu.
- Import or export the toolbase as JSON.
- Reset back to the built-in vendor list.

Vendor templates support:

- `{value}` for URL-encoded selected text.
- `{raw}` for the exact selected text.

Example:

```text
https://www.virustotal.com/gui/search/{value}
```

Some vendors require a login, block automated queries, or change their URL patterns over time. In those cases, update the vendor template in the options page.
