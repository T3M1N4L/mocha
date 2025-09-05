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

let adblockEnabled = true;

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

const ww = new WorkerWare({})
ww.use({
  function: self.adblockExt.filterRequest,
  events: ["fetch"],
  name: "Adblock",
})


self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
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


let playgroundData;
self.addEventListener('message', (event) => {
  if (event.data.type === 'playgroundData') {
    playgroundData = event.data;
  } else if (event.data.type === 'setAdblockEnabled') {
    adblockEnabled = !!event.data.enabled;
    try {
      event.ports && event.ports[0] && event.ports[0].postMessage({ ok: true, enabled: adblockEnabled });
    } catch (e) {}
  } else if (event.data.type === 'requestAC') {
    const requestPort = event.ports[0];
    requestPort.addEventListener('message', async (event) => {
      const response = await scramjet.fetch(event.data);
      const responseType = response.headers.get('content-type');
      let responseJSON = {};
      if (responseType && responseType.indexOf('application/json') !== -1)
        responseJSON = await response.json();
      else
        try {
          responseJSON = await response.text();
          try {
            responseJSON = JSON.parse(responseJSON);
          } catch (e) {
            responseJSON = JSON.parse(
              responseJSON.replace(/^[^[{]*|[^\]}]*$/g, '')
            );
          }
        } catch (e) {
        }
      requestPort.postMessage({
        responseJSON: responseJSON,
        searchType: event.data.type,
        time: event.data.request.headers.get('Date'),
      });
    });
    requestPort.start();
  }
});