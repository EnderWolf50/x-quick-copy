# Chrome Web Store listing — X Quick Copy

Copy-paste material for the Developer Dashboard (https://chrome.google.com/webstore/devconsole).

## Package

Run `./package.ps1` and upload `dist/x-quick-copy-<version>.zip`.

## Store listing

**Name:** X Quick Copy

**Summary (≤132 chars)** — from `manifest.json`:
> Ctrl+C on X copies the hovered image, video/GIF URL, or a FixupX link. Double-click a tweet to toggle Like.

**Category:** Tools (alt: Social & Communication)
**Language:** English (add 中文（繁體） with the zh-TW text below)

**Description (English):**
```
Copy things from X (Twitter) with one keystroke.

Hover a post and press Ctrl+C (⌘+C on macOS):
• Over an image → the original-size image is copied as PNG, ready to paste anywhere.
• Over a video or GIF → its direct MP4 URL is copied.
• Anywhere else in the post → a fixupx.com link to the post is copied (embeds nicely in Discord, Telegram, etc.).

Also: double-click a post to toggle Like.

Normal copy is untouched: in text boxes, or when you have text selected, Ctrl+C works as usual.

Works in the timeline, on post pages and in the full-screen media viewer. Pairs well with X Image Viewer.

Privacy: no data collection, no analytics, no accounts. Everything stays on your device.

Not affiliated with or endorsed by X Corp.
```

**Description (中文（繁體）):**
```
在 X（Twitter）上一鍵複製。

滑鼠移到貼文上按 Ctrl+C（macOS 為 ⌘+C）：
• 指向圖片 → 以 PNG 複製原尺寸圖片，可直接貼上。
• 指向影片或 GIF → 複製 MP4 直連網址。
• 指向貼文其他位置 → 複製 fixupx.com 連結（在 Discord、Telegram 等處有完整預覽）。

另外：雙擊貼文即可切換「喜歡」。

不影響一般複製：在輸入框中或已選取文字時，Ctrl+C 照常運作。

支援時間軸、貼文頁面與全螢幕媒體檢視器，可搭配 X Image Viewer 使用。

隱私：不收集任何資料、無追蹤、無需帳號，一切只在你的裝置上處理。

本擴充功能與 X Corp. 無關，亦未獲其背書。
```

## Graphics

| Asset | Size | File |
| --- | --- | --- |
| Store icon | 128×128 | `icons/icon128.png` |
| Small promo tile (required) | 440×280 | `store/promo-small-440x280.png` |
| Screenshots (1–5, required ≥1) | 1280×800 or 640×400 | **TODO — capture on x.com** |

Suggested screenshots: (1) hovering an image with a "copied" paste result beside it, (2) a pasted fixupx link embed in Discord, (3) video URL copy.

## Privacy practices tab

**Single purpose:**
> Copy the image, video URL or link of the X post under the mouse pointer with Ctrl+C, and toggle Like by double-clicking a post.

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| Host permission `https://cdn.syndication.twimg.com/*` | Fallback only: when a video's MP4 URL is not present in the page data, the background service worker fetches the public data of that single post from X's syndication endpoint. X's page CSP blocks this request from the page, so it must run in the extension. Only the post ID is sent, without cookies. |
| Content scripts on `x.com` / `twitter.com` | Needed to detect the post under the pointer, handle Ctrl+C and double-click, and write the result to the clipboard. |

**Remote code:** No, I am not using remote code. (All JS is in the package.)

**Data usage:** tick **none** of the data categories. Certify:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** a public URL to `PRIVACY.md` (the repo is private — see note below).

## Notes before submitting

- The privacy policy URL must be publicly reachable. Options: make the repo public and link
  `https://github.com/EnderWolf50/x-quick-copy/blob/main/PRIVACY.md`, or publish `PRIVACY.md` as a public gist.
- Names containing a third-party brand ("X") can be flagged for impersonation; the "Not affiliated with X Corp." line and a non-X-logo icon help. If rejected, rename to e.g. "Quick Copy for X".
