# X Quick Copy

Chrome extension (Manifest V3) for X (x.com / twitter.com).

- **Ctrl+C** (⌘+C on macOS) while hovering a post copies:
  - an image → the original-size image as PNG
  - a video / GIF → its direct MP4 URL
  - anything else in a post → a `fixupx.com` link to the post
- **Double-click** a post to toggle Like.

Normal copy still works in text fields and when text is selected.

## Install (development)

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** → pick this folder.

## Files

| File | Role |
| --- | --- |
| `main.js` | Page (MAIN world) script: reads X's in-page tweet data, handles Ctrl+C and double-click. |
| `bridge.js` | Isolated-world relay between `main.js` and the service worker. |
| `background.js` | Fallback fetch from `cdn.syndication.twimg.com` when a video URL is missing from the page (X's CSP blocks it in-page). |

## Publish

```powershell
./package.ps1   # -> dist/x-quick-copy-<version>.zip
```

Store listing text, permission justifications and privacy answers: [`store/LISTING.md`](store/LISTING.md).
Privacy policy: [`PRIVACY.md`](PRIVACY.md).

Works alongside [X Image Viewer](https://github.com/EnderWolf50/x-image-viewer).

*Not affiliated with or endorsed by X Corp.*
