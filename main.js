// X Quick Copy 8.6.0 — runs in the page's MAIN world so it can read
// X's React data (tweet objects with IDs and video variants).

(() => {
  'use strict';

  if (window.__xqcLoaded) return;
  window.__xqcLoaded = true;

  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
  const STATUS_RE = /^\/([^/]+)\/status\/(\d+)/;
  const VIEWER_RE = /^\/([^/]+)\/status\/(\d+)\/(photo|video)\/(\d+)/;
  const MEDIA_RE = /pbs\.twimg\.com\/media\//;

  let mouseX = null;
  let mouseY = null;

  // Tweet ID -> tweet object seen in the page.
  const tweetCache = new Map();

  // Tweet ID -> Promise<Syndication data>
  const syndicationCache = new Map();

  // ============================================================
  // Input
  // ============================================================

  document.addEventListener(
    'mousemove',
    (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    },
    { passive: true, capture: true }
  );

  document.addEventListener('keydown', onKeyDown, true);

  function onKeyDown(event) {
    if (event.code !== 'KeyC' || event.repeat) return;
    if (event.shiftKey || event.altKey) return;

    const modifier = IS_MAC
      ? event.metaKey && !event.ctrlKey
      : event.ctrlKey && !event.metaKey;

    if (!modifier) return;

    // Keep native copy in editors and for selected text.
    if (isEditable(document.activeElement)) return;

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString()) return;

    if (mouseX === null) return;

    // Re-hit-test now: the page may have scrolled since the last mousemove.
    const target = document.elementFromPoint(mouseX, mouseY);
    if (!target) return;

    const action = resolveAction(target);
    if (!action) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    // Clipboard writes start synchronously inside the key event,
    // so user activation is still valid even if data loads later.
    runAction(action);
  }

  // ============================================================
  // What is under the pointer?
  // ============================================================

  function resolveAction(target) {
    // X Image Viewer zoom layer handles its own Ctrl+C.
    if (target.closest('[data-xvp-layer]')) return null;

    const viewer = location.pathname.match(VIEWER_RE);
    const dialog = target.closest('[role="dialog"],[aria-modal="true"]');
    const article = target.closest('article');
    const inViewerMedia = Boolean(viewer && dialog && !article);

    let context = null;

    if (article) {
      context = contextFromElement(target, article);
    } else if (inViewerMedia) {
      context = {
        username: viewer[1],
        tweetID: viewer[2],
        tweet: findTweetById(viewer[2]),
        isQuote: false,
      };
    }

    if (!context) return null;

    const video = findVideoAtPointer(article || dialog || document);
    if (video) return { kind: 'video', context, video };

    const imageURL = findImageAtPointer(inViewerMedia ? dialog : null);
    if (imageURL) return { kind: 'image', context, imageURL };

    return { kind: 'link', context };
  }

  function contextFromElement(target, article) {
    const tweet = tweetFromFiber(target);

    if (tweet) {
      const shown = tweet.retweeted_status || tweet;
      const outer = tweetFromFiber(article);
      const outerShown = outer ? outer.retweeted_status || outer : null;

      remember(tweet);
      if (outer) remember(outer);

      return {
        username: screenName(shown),
        tweetID: shown.id_str,
        tweet: shown,
        isQuote: Boolean(outerShown && outerShown.id_str !== shown.id_str),
      };
    }

    // Fallback if X's internals change: timestamp link or page URL.
    const timeLink = [...article.querySelectorAll('a[href*="/status/"]')]
      .find((link) => link.querySelector('time'));

    const match = (timeLink?.getAttribute('href') || location.pathname)
      .match(STATUS_RE);

    if (!match) return null;

    return {
      username: match[1],
      tweetID: match[2],
      tweet: tweetCache.get(match[2]) || null,
      isQuote: false,
    };
  }

  // ============================================================
  // React data
  // ============================================================

  function fiberOf(element) {
    for (let el = element; el; el = el.parentElement) {
      const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
      if (key) return el[key];
    }
    return null;
  }

  // Innermost tweet wins, so a Quote card yields the quoted tweet.
  function tweetFromFiber(element) {
    let fiber = fiberOf(element);

    for (let i = 0; fiber && i < 150; i++, fiber = fiber.return) {
      const tweet = fiber.memoizedProps?.tweet;
      if (tweet && typeof tweet.id_str === 'string') return tweet;
    }

    return null;
  }

  function remember(tweet) {
    if (tweetCache.size > 500) tweetCache.clear();

    for (const t of [
      tweet,
      tweet.retweeted_status,
      tweet.quoted_status,
      tweet.retweeted_status?.quoted_status,
    ]) {
      if (t?.id_str) tweetCache.set(t.id_str, t);
    }
  }

  function findTweetById(id) {
    if (tweetCache.has(id)) return tweetCache.get(id);

    for (const article of document.querySelectorAll('article')) {
      const tweet = tweetFromFiber(article);
      if (!tweet) continue;

      remember(tweet);
      if (tweetCache.has(id)) return tweetCache.get(id);
    }

    return null;
  }

  function screenName(tweet) {
    return (
      tweet.user?.screen_name ||
      tweet.core?.user_results?.result?.core?.screen_name ||
      tweet.core?.user_results?.result?.legacy?.screen_name ||
      'i'
    );
  }

  // ============================================================
  // Video / GIF
  // ============================================================

  function findVideoAtPointer(scope) {
    for (const video of scope.querySelectorAll('video')) {
      const r = video.getBoundingClientRect();

      if (
        r.width > 0 &&
        r.height > 0 &&
        mouseX >= r.left &&
        mouseX <= r.right &&
        mouseY >= r.top &&
        mouseY <= r.bottom
      ) {
        return video;
      }
    }

    return null;
  }

  function stripQuery(url) {
    return (url || '').split('?')[0];
  }

  function bestMP4(variants) {
    const mp4s = (variants || [])
      .filter((v) => (v.content_type || v.type) === 'video/mp4' && typeof v.url === 'string')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    return mp4s[0]?.url || null;
  }

  function pickVideo(mediaLists, poster) {
    const videos = mediaLists
      .flat()
      .filter((m) => m?.video_info?.variants?.length);

    // Match the exact video by its poster (= media_url_https).
    if (poster) {
      const match = videos.find((m) => stripQuery(m.media_url_https) === poster);
      if (match) return bestMP4(match.video_info.variants);
    }

    return null;
  }

  function mediaOfTweet(tweet) {
    if (!tweet) return [];

    return [
      tweet,
      tweet.quoted_status,
      tweet.retweeted_status,
      tweet.retweeted_status?.quoted_status,
    ].map((t) =>
      t?.extended_entities?.media ||
      t?.legacy?.extended_entities?.media ||
      []
    );
  }

  function resolveVideoURL(context, video) {
    const poster = stripQuery(video.getAttribute('poster'));

    const local =
      pickVideo(mediaOfTweet(context.tweet), poster) ||
      pickVideo(mediaOfTweet(findTweetById(context.tweetID)), poster);

    if (local) return Promise.resolve(local);

    return fetchSyndication(context.tweetID).then((data) => {
      const lists = [data, data?.quoted_tweet].map((d) => d?.mediaDetails || []);
      const url = pickVideo(lists, poster);

      if (url) return url;

      // No poster match: use the only / first video in the tweet.
      const fallback = lists.flat().find((m) => m?.video_info?.variants?.length);
      if (fallback) return bestMP4(fallback.video_info.variants);

      throw new Error(`No MP4 variants for Tweet ${context.tweetID}`);
    });
  }

  // ============================================================
  // Syndication fallback (via bridge.js -> background.js)
  // ============================================================

  let requestSeq = 0;
  const pendingRequests = new Map();

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.__xqc !== 'res') return;

    const pending = pendingRequests.get(data.reqId);
    if (!pending) return;

    pendingRequests.delete(data.reqId);

    if (data.ok) pending.resolve(data.data);
    else pending.reject(new Error(data.error || 'Syndication failed'));
  });

  function fetchSyndication(tweetID) {
    if (syndicationCache.has(tweetID)) return syndicationCache.get(tweetID);

    const reqId = `${Date.now()}-${++requestSeq}`;

    const promise = new Promise((resolve, reject) => {
      pendingRequests.set(reqId, { resolve, reject });

      setTimeout(() => {
        if (pendingRequests.delete(reqId)) reject(new Error('Syndication timed out'));
      }, 15000);

      window.postMessage(
        { __xqc: 'req', type: 'syndication', id: tweetID, reqId },
        location.origin
      );
    });

    syndicationCache.set(tweetID, promise);
    promise.catch(() => syndicationCache.delete(tweetID));

    return promise;
  }

  // ============================================================
  // Images
  // ============================================================

  function mediaURLFrom(element) {
    if (element.tagName === 'IMG') {
      const src = element.currentSrc || element.src;
      if (MEDIA_RE.test(src)) return src;
    }

    const photo = element.closest?.('[data-testid="tweetPhoto"]');
    const photoImg = photo?.querySelector('img');

    if (photoImg && MEDIA_RE.test(photoImg.src)) return photoImg.src;

    const bg = element.style?.backgroundImage || '';
    const bgMatch = bg.match(/url\("?(https:\/\/pbs\.twimg\.com\/media\/[^")]+)"?\)/);

    return bgMatch ? bgMatch[1] : null;
  }

  function findImageAtPointer(viewerDialog) {
    for (const element of document.elementsFromPoint(mouseX, mouseY)) {
      const url = mediaURLFrom(element);
      if (url) return url;

      if (element.tagName === 'ARTICLE' || element === document.body) break;
    }

    // Full-screen viewer: X hides the <img> (opacity 0) and shows a
    // background image; take the slide at the center of the screen.
    if (viewerDialog) {
      const cx = window.innerWidth / 2;

      for (const slide of viewerDialog.querySelectorAll('ul > li')) {
        const r = slide.getBoundingClientRect();
        if (cx < r.left || cx > r.right) continue;

        for (const el of [slide, ...slide.querySelectorAll('img, div')]) {
          const url = mediaURLFrom(el);
          if (url) return url;
        }
      }
    }

    return null;
  }

  async function loadImageAsPNG(src) {
    const url = new URL(src, location.href);
    url.searchParams.set('name', 'orig');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'omit',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      if (blob.type === 'image/png') return blob;

      const bitmap = await createImageBitmap(blob);

      try {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        return await canvas.convertToBlob({ type: 'image/png' });
      } finally {
        bitmap.close();
      }
    } finally {
      clearTimeout(timer);
    }
  }

  // ============================================================
  // Clipboard
  // ============================================================

  function writeText(textPromise) {
    const blobPromise = textPromise.then(
      (text) => new Blob([text], { type: 'text/plain' })
    );

    return navigator.clipboard
      .write([new ClipboardItem({ 'text/plain': blobPromise })])
      .catch(async () => {
        // Rethrows if textPromise itself failed.
        const text = await textPromise;
        await navigator.clipboard.writeText(text);
      });
  }

  function writeImage(pngPromise) {
    return navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngPromise }),
    ]);
  }

  function makeFixupURL({ username, tweetID }) {
    return `https://fixupx.com/${username}/status/${tweetID}`;
  }

  function runAction(action) {
    let job;
    let success;
    let failure;

    if (action.kind === 'video') {
      showToast('Getting video URL…');
      job = writeText(resolveVideoURL(action.context, action.video));
      success = 'Video URL copied';
      failure = 'Video URL not found';
    } else if (action.kind === 'image') {
      showToast('Copying image…');
      job = writeImage(loadImageAsPNG(action.imageURL));
      success = 'Image copied';
      failure = 'Failed to copy image';
    } else {
      job = writeText(Promise.resolve(makeFixupURL(action.context)));
      success = action.context.isQuote ? 'Quote FixupX copied' : 'FixupX URL copied';
      failure = 'Failed to copy URL';
    }

    job.then(
      () => showToast(success),
      (error) => {
        console.error('[X Quick Copy]', error);
        showToast(failure, true);
      }
    );
  }

  // ============================================================
  // Double-click a tweet to toggle Like
  //
  // The first click is held back. If no second click arrives
  // within DOUBLE_CLICK_DELAY, it is replayed so X does what it
  // normally would (e.g. open the tweet).
  // ============================================================

  const DOUBLE_CLICK_DELAY = 300; // ms

  // Clicks on these keep their normal behavior, untouched —
  // except the tweet's own media surface (see isMediaSurface).
  const INTERACTIVE = [
    'a',
    'button',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[role="slider"]',
    '[role="menuitem"]',
    '[contenteditable="true"]',
    '[data-testid="card.wrapper"]',
  ].join(',');

  const MEDIA_BOX = '[data-testid="tweetPhoto"], [data-testid="videoPlayer"]';

  let pendingClick = null; // { scope, target, init, timer }

  // scope = a tweet <article>, or the full-screen viewer dialog.
  // Only take the Like button that belongs to the scope itself
  // (the viewer's side panel also contains tweet articles).
  function findLikeButton(scope) {
    const own = scope.tagName === 'ARTICLE' ? scope : null;

    return [...scope.querySelectorAll('[data-testid="like"], [data-testid="unlike"]')]
      .find((button) => button.closest('article') === own) || null;
  }

  // The image link, or the big overlay covering a video / GIF.
  // Small player controls (mute, seek bar, settings…) don't qualify.
  function isMediaSurface(element) {
    if (element.matches('a[href*="/photo/"], a[href*="/video/"]')) return true;
    if (element.matches('[role="slider"]')) return false;

    const box = element.closest(MEDIA_BOX);
    if (!box) return false;

    const b = box.getBoundingClientRect();
    const r = element.getBoundingClientRect();

    return r.width * r.height >= b.width * b.height * 0.6;
  }

  function likeScope(event) {
    // Our own replayed clicks are untrusted and pass straight through.
    if (!event.isTrusted || event.button !== 0) return null;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return null;

    const target = event.target;
    if (!(target instanceof Element)) return null;

    // X Image Viewer zoom layer: its own clicks / double-clicks.
    if (target.closest('[data-xvp-layer]')) return null;

    const article = target.closest('article');
    if (!article) return viewerScope(event, target);

    // Every interactive ancestor inside the tweet must be a media surface.
    // A Quote card ([role="link"]) therefore keeps its normal behavior.
    for (
      let el = target.closest(INTERACTIVE);
      el && el !== article && article.contains(el);
      el = el.parentElement?.closest(INTERACTIVE)
    ) {
      if (!isMediaSurface(el)) return null;
    }

    return findLikeButton(article) ? article : null;
  }

  // Full-screen viewer (/status/<id>/photo/N or /video/N).
  // Only the picture / video itself counts; the dark backdrop around
  // it keeps its normal behavior (a single click there closes the viewer).
  function viewerScope(event, target) {
    if (!VIEWER_RE.test(location.pathname)) return null;

    const dialog = target.closest('[role="dialog"], [aria-modal="true"]');
    if (!dialog) return null;

    for (
      let el = target.closest(INTERACTIVE);
      el && dialog.contains(el);
      el = el.parentElement?.closest(INTERACTIVE)
    ) {
      if (!isMediaSurface(el)) return null;
    }

    if (!isOnViewerMedia(target, dialog, event.clientX, event.clientY)) return null;

    return findLikeButton(dialog) ? dialog : null;
  }

  function isOnViewerMedia(target, dialog, x, y) {
    // One image's container (works for a single image and for carousels).
    const slide = target.closest('[data-testid="swipe-to-dismiss"]') || dialog;

    for (const el of slide.querySelectorAll('video, img, div')) {
      const isMedia =
        el.tagName === 'VIDEO' ||
        MEDIA_RE.test(el.tagName === 'IMG' ? el.src : el.style.backgroundImage);

      if (!isMedia) continue;

      const r = el.getBoundingClientRect();

      if (r.width && r.height && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return true;
      }
    }

    return false;
  }

  function flushPendingClick() {
    if (!pendingClick) return;

    const { target, init, timer } = pendingClick;
    clearTimeout(timer);
    pendingClick = null;

    if (target.isConnected) {
      target.dispatchEvent(new MouseEvent('click', init));
    }
  }

  // Stop the second press of a double-click from selecting a word.
  document.addEventListener(
    'mousedown',
    (event) => {
      if (event.detail < 2 || !pendingClick) return;

      const scope = likeScope(event);
      if (scope && scope === pendingClick.scope) event.preventDefault();
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      const scope = likeScope(event);
      if (!scope) return;

      // Finishing a text selection: leave it alone.
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString()) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      // Second click on the same tweet -> toggle Like.
      if (pendingClick && pendingClick.scope === scope) {
        clearTimeout(pendingClick.timer);
        pendingClick = null;
        findLikeButton(scope)?.click();
        return;
      }

      // Swallow the 3rd+ click of a rapid burst so it doesn't open the tweet.
      if (event.detail >= 3) return;

      // A different tweet: let the earlier click happen now.
      flushPendingClick();

      pendingClick = {
        scope,
        target: event.target,
        init: {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window,
          detail: 1,
          screenX: event.screenX,
          screenY: event.screenY,
          clientX: event.clientX,
          clientY: event.clientY,
          button: 0,
          buttons: 0,
        },
        timer: setTimeout(flushPendingClick, DOUBLE_CLICK_DELAY),
      };
    },
    true
  );

  // ============================================================
  // Helpers
  // ============================================================

  function isEditable(element) {
    if (!(element instanceof Element)) return false;

    return (
      element.isContentEditable ||
      Boolean(element.closest('input, textarea, select, [role="textbox"]'))
    );
  }

  let toastTimer = null;
  let toastElement = null;

  function showToast(message, isError = false) {
    if (!toastElement) {
      toastElement = document.createElement('div');

      Object.assign(toastElement.style, {
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        zIndex: '2147483647',
        padding: '10px 16px',
        borderRadius: '8px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '14px',
        fontWeight: '600',
        color: '#fff',
        pointerEvents: 'none',
        opacity: '0',
        transform: 'translateY(8px)',
        transition: 'opacity 120ms ease, transform 120ms ease',
      });

      document.documentElement.appendChild(toastElement);
    }

    toastElement.textContent = message;
    toastElement.style.background = isError
      ? 'rgba(220,38,38,.95)'
      : 'rgba(29,155,240,.95)';
    toastElement.style.opacity = '1';
    toastElement.style.transform = 'translateY(0)';

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toastElement.style.opacity = '0';
      toastElement.style.transform = 'translateY(8px)';
    }, 1400);
  }

})();
