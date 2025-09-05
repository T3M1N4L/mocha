importScripts('/latte/uv.bundle.js')
importScripts('/latte/uv.config.js')
importScripts("/matcha/scramjet.all.js");
importScripts(__uv$config.sw || '/latte/uv.sw.js')
importScripts('/workerware/workerware.js')

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

const sw = new UVServiceWorker()
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const blacklist = {};

fetch('{{route}}{{/public/blocklist/blocklist.json}}').then((request) => {
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
            blacklist.hasOwnProperty(domainTld) &&
            blacklist[domainTld].test(domain.slice(0, -domainTld.length))
          ) {
            return new Response(new Blob(), { status: 406 });
          }
        } catch (e) {}
        return scramjet.fetch(event);
      }
      if (event.request.url.startsWith(location.origin + __uv$config.prefix)) {
        try {
          const targetUrl = new URL(
            sw.config.decodeUrl(
              new URL(event.request.url).pathname.replace(sw.config.prefix, '')
            )
          );
          const domain = targetUrl.hostname;
          const domainTld = domain.replace(/.+(?=\.\w)/, '');
          if (
            blacklist.hasOwnProperty(domainTld) &&
            blacklist[domainTld].test(domain.slice(0, -domainTld.length))
          ) {
            return new Response(new Blob(), { status: 406 }); // Blocked
          }
        } catch (e) {}
        return await sw.fetch(event);
      }
      return await fetch(event.request);
    })()
  );
});
