// Isolated-world relay: page script (main.js) <-> background service worker.

window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  const data = event.data;
  if (!data || data.__xqc !== 'req' || data.type !== 'syndication') return;

  const id = String(data.id);
  if (!/^\d{1,25}$/.test(id)) return;

  const reply = (payload) =>
    window.postMessage({ __xqc: 'res', reqId: data.reqId, ...payload }, location.origin);

  chrome.runtime
    .sendMessage({ type: 'syndication', id })
    .then((response) => reply(response || { ok: false, error: 'No response' }))
    .catch((error) => reply({ ok: false, error: String(error?.message || error) }));
});
