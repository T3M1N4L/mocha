importScripts('/coffee/uv.bundle.js')
importScripts('/coffee/uv.config.js')
importScripts(__uv$config.sw || '/coffee/uv.sw.js')
importScripts('/workerware/workerware.js')
importScripts('/adblock.js')


self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

const sw = new UVServiceWorker()
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
      if (event.request.url.startsWith(location.origin + __uv$config.prefix)) {
        return await sw.fetch(event);
      }
      return await fetch(event.request);
    })()
  );
});
