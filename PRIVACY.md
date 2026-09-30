# Privacy Policy — X Quick Copy

_Last updated: 2026-09-30_

X Quick Copy does **not** collect, store, sell or share any personal data.

## What the extension does with data

- It runs only on `https://x.com/*` and `https://twitter.com/*`.
- It reads post data that is already loaded in the page (post ID, author handle, media URLs) **only at the moment you press Ctrl+C / ⌘+C** over a post, in order to build what gets copied.
- Copied content (an image, a media URL or a `fixupx.com` link) is written to **your local clipboard** and nowhere else.
- Double-click-to-Like clicks X's own Like button in the page; the extension sends nothing itself.

## Network requests

- Images are re-downloaded from X's own image CDN (`pbs.twimg.com`) at original size so they can be copied as PNG.
- If a video's URL is not present in the page, the extension requests the public post data for **that one post ID** from X's own endpoint `https://cdn.syndication.twimg.com/tweet-result`. The request contains only the post ID and is sent without cookies.

No request is ever sent to the developer or to any third-party analytics, advertising or tracking service.

## Storage

The extension keeps nothing on disk. A short-lived in-memory cache of post data is discarded when the tab is closed or reloaded.

## Contact

Questions: use the contact email shown on this extension's Chrome Web Store page, or open an issue at https://github.com/EnderWolf50/x-quick-copy.
