# Case Converter - Any to Title Case

A browser extension that automatically converts text to Title Case (Abc Def Ghi) in real-time on any website. Works with `<input>`, `<textarea>`, and `contenteditable` elements.

## Features

- **Real-time conversion** — automatically capitalizes text as you type
- **Global on/off toggle** — master switch for all sites
- **Per-site control** — enable/disable on specific domains
- **Stats tracking** — see how many characters and conversions have been made
- **Smart input handling** — skips passwords, hidden fields, checkboxes, and other non-text inputs
- **Preserves caret position** — cursor stays where you left off during conversion
- **ContentEditable support** — works with rich text editors
- **Settings page** — manage sites, view stats, reset all data

## Installation

1. Download the extension from the [Chrome Web Store](https://chromewebstore.google.com) (coming soon)
2. Or load it unpacked:
   - Go to `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the extension directory

## Usage

Click the extension icon in the toolbar to open the popup:

- **Global toggle** — enable/disable on all websites
- **Current Site toggle** — enable/disable on the current domain
- **Stats** — view characters converted and total conversion count
- **Settings** — open the full settings page for advanced management

## Permissions

- `storage` — saves your preferences and stats
- `<all_urls>` — runs the content script on all websites to perform conversion

## Files

```
├── manifest.json          Extension manifest (Manifest V3)
├── background/
│   └── background.js      Service worker
├── content/
│   └── content.js         Content script — performs text conversion
├── popup/
│   ├── popup.html         Popup UI
│   ├── popup.js           Popup logic
│   └── popup.css          Popup styles
├── options/
│   ├── options.html       Settings page
│   ├── options.js         Settings logic
│   └── options.css        Settings styles
└── icons/                 Extension icons (16, 48, 128)
```
