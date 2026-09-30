// Fallback only: fetch Syndication data when X's in-page data lacks the video.
// Runs here because X's page CSP blocks cdn.syndication.twimg.com.

function syndicationToken(id) {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, '');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (message?.type !== 'syndication') return false;
  if (!/^\d{1,25}$/.test(message.id)) return false;

  const url =
    'https://cdn.syndication.twimg.com/tweet-result' +
    `?id=${message.id}&token=${syndicationToken(message.id)}`;

  fetch(url, { credentials: 'omit' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) =>
      sendResponse({ ok: false, error: String(error?.message || error) })
    );

  return true; // async response
});
