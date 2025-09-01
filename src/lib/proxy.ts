import store from 'store2'
import type { TransportData, WispData } from './types'
import { transports } from './transport'
import { BareMuxConnection } from '@mercuryworkshop/bare-mux'
import { setProxyStatus } from '../routes/route'

export const DEFAULT_WISP_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/wisp/`;

async function ensureScramjetLoaded() {
  if (typeof window.$scramjetLoadController === "function") return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/matcha/scramjet.all.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Scramjet bundle"));
    document.head.appendChild(script);
  });
}

export async function setupProxy() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      for await (const registration of registrations) {
        await registration.unregister()
      }

      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.update().then(() => {
          console.log('Service worker registered')
        })
      })

      navigator.serviceWorker.ready.then(async () => {
        console.log('Service worker ready')
      })
    })

    await ensureScramjetLoaded();

    if (typeof window.$scramjetLoadController === "function") {
      const { ScramjetController } = window.$scramjetLoadController();
      const scramjet = new ScramjetController({
        files: {
          wasm: "/matcha/scramjet.wasm.wasm",
          all: "/matcha/scramjet.all.js",
          sync: "/matcha/scramjet.sync.js",
        }
      });
      scramjet.init();
    } else {
      console.warn("Scramjet bundle not loaded!");
    }

    const transportData = store('transport') as TransportData
    console.log('Using', transports[transportData.transport])

    const wispData = store('wisp') as WispData
    const wisp = (wispData && wispData.url) ? wispData.url : DEFAULT_WISP_URL

    const connection = new BareMuxConnection('/bare-mux/worker.js')
    await connection.setTransport(
      transports[transportData.transport],
      [{
        wisp
      }]
    );
    setProxyStatus(true)
  }
}