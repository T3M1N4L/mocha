importScripts('/latte/uv.bundle.js')
importScripts('/latte/uv.config.js')
importScripts("/matcha/scramjet.all.js");
importScripts(__uv$config.sw || '/latte/uv.sw.js')
importScripts('/workerware/workerware.js')
importScripts('/adblock.js')


self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const uv = new UVServiceWorker()
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const blacklist = {};

let adblockEnabled = false;

fetch('/blocklist/blocklist.json').then((request) => {
  request.json().then((jsonData) => {
    jsonData.forEach((domain) => {
      const domainTld = domain.replace(/.+(?=\.\w)/, '');
      if (!blacklist.hasOwnProperty(domainTld)) blacklist[domainTld] = [];
      blacklist[domainTld].push(
        encodeURIComponent(domain.slice(0, -domainTld.length))
          .replace(/([()])/g, '\\$1')
          .replace(/(\*\.)|\./g, (match, firstExpression) =>
            firstExpression ? '(?:.+\\.)?' : '\\' + match
          )
      );
    });
    for (let [domainTld, domainList] of Object.entries(blacklist))
      blacklist[domainTld] = new RegExp(`^(?:${domainList.join('|')})$`);
    Object.freeze(blacklist);
  });
});

const ww = new WorkerWare({});

const SETTINGS_CACHE = 'mocha-settings-v1';

async function persistAdblockSetting(enabled) {
  try {
    const cache = await caches.open(SETTINGS_CACHE);
    await cache.put(
      'adblock-setting',
      new Response(JSON.stringify({ enabled }), { headers: { 'content-type': 'application/json' } })
    );
  } catch (e) {}
}

async function loadAdblockSetting() {
  try {
    const cache = await caches.open(SETTINGS_CACHE);
    const res = await cache.match('adblock-setting');
    if (!res) return null;
    const data = await res.json().catch(() => ({}));
    return typeof data?.enabled === 'boolean' ? !!data.enabled : null;
  } catch (e) {
    return null;
  }
}

loadAdblockSetting()
  .then((val) => {
    if (val !== null) {
      adblockEnabled = val;
      try { applyWWAdblockMiddleware(adblockEnabled); } catch (e) {}
    }
  })
  .catch(() => {});

function applyWWAdblockMiddleware(enabled) {
  const exists = ww.get().some((mw) => mw.name === "Adblock");
  if (enabled) {
    if (!exists && self?.adblockExt?.filterRequest) {
      ww.use({
        function: self.adblockExt.filterRequest,
        events: ["fetch"],
        name: "Adblock",
      });
    }
  } else {
    if (exists) ww.deleteByName("Adblock");
  }
}

applyWWAdblockMiddleware(adblockEnabled);

self.addEventListener("message", (event) => {
  const data = event?.data;
  if (data && data.type === "setAdblockEnabled") {
    adblockEnabled = !!data.enabled;
    if (!adblockEnabled) {
      try { ww.deleteByName("Adblock"); } catch (e) {}
    }

    applyWWAdblockMiddleware(adblockEnabled);

    persistAdblockSetting(adblockEnabled);

    if (event.ports && event.ports[0]) {
      try {
        event.ports[0].postMessage({ ok: true });
      } catch (e) {}
    }
  }
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      // Sync latest persisted adblock setting before running any middleware
      try {
        const latest = await loadAdblockSetting();
        if (latest !== null && latest !== adblockEnabled) {
          adblockEnabled = latest;
          try { applyWWAdblockMiddleware(adblockEnabled); } catch (e) {}
        }
      } catch (e) {}

      // Always run WorkerWare; Adblock is just one middleware among others.
      let mwResponse = await ww.run(event)();
      if (mwResponse.includes(null)) {
        return;
      }

      await scramjet.loadConfig();
      if (scramjet.route(event)) {
        try {
          const targetUrl = new URL(
            Function(`return ${scramjet.config.codec.decode}`)()(
              new URL(event.request.url).pathname.replace(scramjet.config.prefix, '')
            )
          );
          const domain = targetUrl.hostname;
          const domainTld = domain.replace(/.+(?=\.\w)/, '');
          if (
            adblockEnabled &&
            blacklist.hasOwnProperty(domainTld) &&
            blacklist[domainTld].test(domain.slice(0, -domainTld.length))
          ) {
            return new Response(new Blob(), { status: 406 });
          }
        } catch (e) {}
        return scramjet.fetch(event);
      }
      if (uv.route(event)) {
        try {
          const targetUrl = new URL(
            uv.config.decodeUrl(
              new URL(event.request.url).pathname.replace(uv.config.prefix, '')
            )
          );
          const domain = targetUrl.hostname;
          const domainTld = domain.replace(/.+(?=\.\w)/, '');
          if (
            adblockEnabled &&
            blacklist.hasOwnProperty(domainTld) &&
            blacklist[domainTld].test(domain.slice(0, -domainTld.length))
          ) {
            return new Response(new Blob(), { status: 406 }); // Blocked
          }
        } catch (e) {}
        return await uv.fetch(event);
      }
      return await fetch(event.request);
    })()
  );
});
