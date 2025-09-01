importScripts('/latte/uv.bundle.js')
importScripts('/latte/uv.config.js')
importScripts("/matcha/scramjet.all.js");
importScripts(__uv$config.sw || '/latte/uv.sw.js')
importScripts('/workerware/workerware.js')
importScripts('/adblock.js')




self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

const sw = new UVServiceWorker()
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
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
        return scramjet.fetch(event);
      }
      if (event.request.url.startsWith(location.origin + __uv$config.prefix)) {
        return await sw.fetch(event);
      }
      return await fetch(event.request);
    })()
  );
});

