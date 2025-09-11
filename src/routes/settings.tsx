import { createEffect, createSignal, onMount, onCleanup } from "solid-js";
import toast from "solid-toast";
import store from "store2";
import { handleTabCloak } from "../lib/cloak";
import { handleDebug } from "../lib/debug";
import { handleTheme, themes } from "../lib/theme";
import type {
  DebugData,
  PanicData,
  TabData,
  ThemeData,
  TransportData,
  DevtoolsData,
  SearchEngineData,
  WispData,
  CloakData,
} from "../lib/types";

import { CircleCheck, CircleHelp, Trash } from "lucide-solid";
import { exportData, importData, resetData } from "../lib/browsingdata";
import { handleTransport } from "../lib/transport";
import { DEFAULT_WISP_URL } from "../lib/proxy";

export const [exportSuccessful, setExportStatus] = createSignal(false);
export const [importSuccessful, setImportStatus] = createSignal(false);

export default function Settings() {
  const [tabName, setTabName] = createSignal("");
  const [tabIcon, setTabIcon] = createSignal("");

  const [panicKey, setPanicKey] = createSignal("");
  const [panicUrl, setPanicUrl] = createSignal(
    "https://classroom.google.com/h",
  );

  const [cloakMode, setCloakMode] = createSignal<
    "none" | "aboutblank" | "blob"
  >("none");

  const [theme, setTheme] = createSignal("default");
  const [themeOpen, setThemeOpen] = createSignal(false);

  const [debug, setDebug] = createSignal("disabled");

  const [devtools, setDevtools] = createSignal("enabled");
  const [adblock, setAdblock] = createSignal("enabled");

  const [transport, setTransport] = createSignal("epoxy");
  const [wispUrl, setWispUrl] = createSignal(DEFAULT_WISP_URL);
  const [wispModalUrl, setWispModalUrl] = createSignal(DEFAULT_WISP_URL);
  const [wispPresets, setWispPresets] = createSignal<string[]>([
    "wss://anura.pro/wisp/",
    "wss://wisp.terbiumon.top/wisp/",
    "wss://student.studentvue.my.cdn.cloudflare.net/wisp/",
    "wss://nebulaservices.org/wisp/",
  ]);

  const [searchEngine, setSearchEngine] = createSignal("google");
  const [searchCustomUrl, setSearchCustomUrl] = createSignal(
    "https://google.com/search?q=%s",
  );
  const [searchPresets, setSearchPresets] = createSignal<
    { name: string; url: string }[]
  >([
    { name: "Google", url: "https://google.com/search?q=%s" },
    { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s" },
    { name: "Ecosia", url: "https://www.ecosia.org/search?q=%s" },
    { name: "Bing", url: "https://bing.com/search?q=%s" },
  ]);

  const [cloakPresets, setCloakPresets] = createSignal<
    { title: string; icon: string }[]
  >([{ title: "Google", icon: "/img/google.png" }]);
  const [searchPresetName, setSearchPresetName] = createSignal("Custom");
  const [cloakPresetTitle, setCloakPresetTitle] = createSignal("Google");
  const [cloakPresetIcon, setCloakPresetIcon] = createSignal("/img/google.png");

  const [proxyEngine, setProxyEngine] = createSignal<"uv" | "scramjet">("uv");
  const [proxyOpen, setProxyOpen] = createSignal(false);

  const [moreInfoTitle, setMoreInfoTitle] = createSignal("");
  const [moreInfoContent, setMoreInfoContent] = createSignal("");
  const [moreInfoVisibility, setMoreInfoVisiblity] = createSignal(false);

  let fileImport!: HTMLInputElement;
  let exportWarning!: HTMLDialogElement;
  let importWarning!: HTMLDialogElement;
  let deleteWarning!: HTMLDialogElement;
  let moreInfo!: HTMLDialogElement;
  let wispModal!: HTMLDialogElement;
  let searchModal!: HTMLDialogElement;
  let cloakModal!: HTMLDialogElement;

  onMount(() => {
    const tabData = store.local.get("tab") as TabData;
    if (tabData?.name) setTabName(tabData.name);
    if (tabData?.icon) setTabIcon(tabData.icon);

    const panicData = store.local.get("panic") as PanicData;
    if (panicData?.key) setPanicKey(panicData.key);
    if (panicData?.url) setPanicUrl(panicData.url);

    const cloak = store.local.get("cloak") as CloakData;
    setCloakMode(cloak?.mode ?? "none");

    const themeData = store.local.get("theme") as ThemeData;
    if (themeData?.theme) setTheme(themeData.theme);

    const debugData = store.local.get("debug") as DebugData;
    setDebug(debugData?.enabled ? "enabled" : "disabled");

    const devtoolsData = store.local.get("devtools") as DevtoolsData;
    setDevtools(devtoolsData?.enabled ? "enabled" : "disabled");

    const adblockData = store.local.get("adblock") as { enabled: boolean };
    setAdblock(adblockData?.enabled ? "enabled" : "disabled");
    // Ensure SW reflects current setting immediately on load
    syncAdblockToSW(adblock() === "enabled");

    const transportData = store.local.get("transport") as TransportData;
    if (transportData?.transport) setTransport(transportData.transport);

    const wispData = store.local.get("wisp") as WispData;
    if (wispData && wispData.url) setWispUrl(wispData.url);

    // Load Wisp presets
    const savedWispPresets = store.local.get("wispPresets") as string[];
    if (Array.isArray(savedWispPresets) && savedWispPresets.length) {
      setWispPresets(savedWispPresets);
    } else {
      store.local.set("wispPresets", wispPresets());
    }

    const searchEngineData = store.local.get(
      "searchEngine",
    ) as SearchEngineData;
    if (searchEngineData?.engine) setSearchEngine(searchEngineData.engine);
    if (searchEngineData?.engine === "custom" && searchEngineData.url) {
      setSearchCustomUrl(searchEngineData.url);
    }

    // Load Search presets
    const savedSearchPresets = store.local.get("searchPresets") as {
      name: string;
      url: string;
    }[];
    if (Array.isArray(savedSearchPresets) && savedSearchPresets.length) {
      setSearchPresets(savedSearchPresets);
    } else {
      store.local.set("searchPresets", searchPresets());
    }

    // Load Cloak presets
    const savedCloakPresets = store.local.get("cloakPresets") as {
      title: string;
      icon: string;
    }[];
    if (Array.isArray(savedCloakPresets) && savedCloakPresets.length) {
      setCloakPresets(savedCloakPresets);
    } else {
      store.local.set("cloakPresets", cloakPresets());
    }

    const proxyEngineData = store.local.get("proxyEngine") as {
      engine: "uv" | "scramjet";
    };
    if (proxyEngineData && proxyEngineData.engine)
      setProxyEngine(proxyEngineData.engine);

    // Re-sync Adblock setting to SW when controller changes (first control or after update)
    if ("serviceWorker" in navigator) {
      const handler = () => {
        try {
          syncAdblockToSW(adblock() === "enabled");
        } catch (e) {}
      };
      navigator.serviceWorker.addEventListener("controllerchange", handler);
      onCleanup(() => {
        try {
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            handler,
          );
        } catch (e) {}
      });
    }
  });

  async function syncAdblockToSW(enabled: boolean) {
    try {
      if (!("serviceWorker" in navigator)) return;

      // Prefer the current controller (the SW controlling this page)
      const ctrl = navigator.serviceWorker.controller;
      if (ctrl) {
        try {
          const ch = new MessageChannel();
          ctrl.postMessage({ type: "setAdblockEnabled", enabled }, [ch.port2]);
        } catch (_) {}
      }

      // Also inform any active registrations (covers cases before control changes)
      const regs = await navigator.serviceWorker
        .getRegistrations()
        .catch(() => []);
      for (const reg of regs) {
        const active = reg.active;
        if (active) {
          try {
            const ch2 = new MessageChannel();
            active.postMessage({ type: "setAdblockEnabled", enabled }, [
              ch2.port2,
            ]);
          } catch (_) {}
        }
      }

      // Fallback: when 'ready' resolves, send again
      const ready = await navigator.serviceWorker.ready.catch(() => undefined);
      const sw = ready?.active;
      if (sw) {
        try {
          const ch3 = new MessageChannel();
          sw.postMessage({ type: "setAdblockEnabled", enabled }, [ch3.port2]);
        } catch (_) {}
      }
    } catch (e) {}
  }

  function save() {
    store.local.set("tab", {
      name: tabName(),
      icon: tabIcon(),
    });

    store.local.set("panic", {
      key: panicKey(),
      url: panicUrl(),
    });

    store.local.set("cloak", {
      mode: cloakMode(),
    } as CloakData);

    store.local.set("theme", {
      theme: theme(),
    });

    store.local.set("debug", {
      enabled: debug() === "enabled",
    });

    store.local.set("devtools", {
      enabled: devtools() === "enabled",
    });

    store.local.set("adblock", {
      enabled: adblock() === "enabled",
    });

    store.local.set("transport", {
      transport: transport(),
    });

    store.local.set("wisp", {
      url: wispUrl(),
    });

    if (searchEngine() === "custom") {
      store.local.set("searchEngine", {
        engine: "custom",
        url: searchCustomUrl(),
        name: "Custom",
      } as SearchEngineData);
    } else {
      store.local.set("searchEngine", {
        engine: searchEngine(),
      } as SearchEngineData);
    }

    store.local.set("proxyEngine", {
      engine: proxyEngine(),
    });

    handleTabCloak();
    handleDebug();
    handleTheme();
    handleTransport();
    syncAdblockToSW(adblock() === "enabled");

    toast.custom(() => {
      return (
        <div class="toast toast-center toast-top z-[9999]">
          <div class="alert alert-success w-80">
            <CircleCheck />
            <span>Settings saved.</span>
          </div>
        </div>
      );
    });
  }

  createEffect(() => {
    if (importSuccessful()) {
      importWarning.close();
    }

    if (exportSuccessful()) {
      exportWarning.close();
    }
  });

  createEffect(() => {
    if (moreInfoVisibility()) moreInfo.showModal();
  });

  // Keep SW in sync whenever Adblock setting changes (no need to hit Save).
  // Also persist immediately so other parts of the app (like SW-ready bootstrap) see the latest state.
  createEffect(() => {
    const enabled = adblock() === "enabled";
    try {
      store.local.set("adblock", { enabled });
    } catch (e) {}
    syncAdblockToSW(enabled);
  });

  return (
    <div class="flex flex-col items-center gap-4">
      <div class="box-border flex flex-wrap justify-center gap-6 pt-8">
        <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
          <h1 class="text-2xl font-semibold">Cloaking</h1>
          <p class="text-center text-xs">
            Change how Mocha appears in your browser
          </p>
          {/* Inputs moved into modal */}
          <button
            class="btn btn-outline w-full"
            type="button"
            onClick={() => cloakModal.showModal()}
          >
            Configure Cloak
          </button>

          <span
            class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
            onMouseDown={() => {
              setMoreInfoTitle("Tab Cloaking");
              setMoreInfoContent(
                "Changing these settings change how the tab in your browser looks. You can make it look like Google Docs, Quizlet, or another learning site. The Tab Icon field requires an image URL - search one on Google and copy it's image address.",
              );
              setMoreInfoVisiblity(true);
            }}
          >
            <CircleHelp class="h-5 w-5" />
          </span>
        </div>

        <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
          <h1 class="text-2xl font-semibold">Panic Key</h1>
          <p class="text-center text-xs">
            Press a key to redirect to a URL (works in proxy)
          </p>
          <input
            type="text"
            class="input input-bordered w-full"
            value={panicKey()}
            onInput={(e) => setPanicKey(e.target.value)}
            placeholder="Panic key"
          />
          <input
            type="text"
            class="input input-bordered w-full"
            value={panicUrl()}
            onInput={(e) => setPanicUrl(e.target.value)}
            placeholder="Panic URL"
          />

          <span
            class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
            onMouseDown={() => {
              setMoreInfoTitle("Panic Key");
              setMoreInfoContent(
                "Set the Panic Key field to automatically redirect to a website when you press that key. It's useful for when teachers are coming and you need to quickly close Mocha. The panic button also works when you're browsing inside the proxy!",
              );
              setMoreInfoVisiblity(true);
            }}
          >
            <CircleHelp class="h-5 w-5" />
          </span>
        </div>

        <div class="flex relative group w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
          <h1 class="text-2xl font-semibold">Cloaking (AB & Blob)</h1>
          <p class="text-center text-xs">
            Choose how Mocha opens in a disguised tab
          </p>
          <div class="relative w-full max-w-xs">
            <div class="grid grid-cols-3 rounded-box border border-base-300 bg-base-200 relative p-1">
              <div
                class={
                  cloakMode() === "none"
                    ? "absolute top-1 bottom-1 left-1 right-[66.666%] rounded-box bg-base-content transition-all z-0"
                    : cloakMode() === "aboutblank"
                      ? "absolute top-1 bottom-1 left-[33.333%] right-[33.333%] rounded-box bg-base-content transition-all z-0"
                      : "absolute top-1 bottom-1 left-[66.666%] right-1 rounded-box bg-base-content transition-all z-0"
                }
              />
              <button
                type="button"
                class={`btn btn-ghost flex-1 z-10 rounded-box ${cloakMode() === "none" ? "text-base-100" : "text-base-content"}`}
                onClick={() => setCloakMode("none")}
              >
                None
              </button>
              <button
                type="button"
                class={`btn btn-ghost flex-1 z-10 rounded-box ${cloakMode() === "aboutblank" ? "text-base-100" : "text-base-content"}`}
                onClick={() => setCloakMode("aboutblank")}
              >
                about:blank
              </button>
              <button
                type="button"
                class={`btn btn-ghost flex-1 z-10 rounded-box ${cloakMode() === "blob" ? "text-base-100" : "text-base-content"}`}
                onClick={() => setCloakMode("blob")}
              >
                Blob
              </button>
            </div>
          </div>

          <span
            class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
            onMouseDown={() => {
              setMoreInfoTitle("Cloaking");
              setMoreInfoContent(
                "Choose how Mocha appears in a new tab: 'about:blank' hides history and looks like a system page; 'Blob' uses an in-memory HTML wrapper. Select 'None' to disable cloaking.",
              );
              setMoreInfoVisiblity(true);
            }}
          >
            <CircleHelp class="h-5 w-5" />
          </span>
        </div>

        <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
          <h1 class="text-2xl font-semibold">Theme</h1>
          <p class="text-center text-xs">Change the styling of Mocha's UI</p>
          <div class="relative w-full max-w-xs">
            <button
              type="button"
              class="select select-bordered w-full flex items-center justify-between"
              onClick={() => setThemeOpen(!themeOpen())}
              onBlur={() => setThemeOpen(false)}
            >
              <span class="capitalize">
                {theme() === "default"
                  ? "default"
                  : theme().charAt(0).toUpperCase() + theme().slice(1)}
              </span>
            </button>
            {themeOpen() && (
              <ul
                class="absolute left-0 top-full mt-1 z-50 w-full menu bg-base-200 border border-base-300 rounded-box shadow-lg"
                onMouseDown={(e) => e.preventDefault()}
              >
                {themes.map((item) => {
                  return (
                    <li>
                      <button
                        type="button"
                        class="flex items-center gap-2 hover:bg-base-300 w-full text-left px-3 py-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTheme(item);
                          setThemeOpen(false);
                        }}
                      >
                        <span class="capitalize">
                          {item === "default"
                            ? "default"
                            : item.charAt(0).toUpperCase() + item.slice(1)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <span
            class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
            onMouseDown={() => {
              setMoreInfoTitle("Themes");
              setMoreInfoContent(
                "It's simple - themes change the colors of Mocha's UI.",
              );
              setMoreInfoVisiblity(true);
            }}
          >
            <CircleHelp class="h-5 w-5" />
          </span>
        </div>

        <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
          <h1 class="text-2xl font-semibold">Search Engine</h1>
          <p class="text-center text-xs">Change the search engine</p>
          <button
            class="btn btn-outline w-full"
            type="button"
            onClick={() => searchModal.showModal()}
          >
            Configure Search Engine
          </button>

          <span
            class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
            onMouseDown={() => {
              setMoreInfoTitle("Search Engine");
              setMoreInfoContent(
                "Changes the search engine used when you type a search query into Mocha.",
              );
              setMoreInfoVisiblity(true);
            }}
          >
            <CircleHelp class="h-5 w-5" />
          </span>
        </div>

        <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
          <h1 class="text-2xl font-semibold">Proxy Engine</h1>
          <p class="text-center text-xs">Switch the current engine</p>
          <div class="relative w-full max-w-xs">
            <button
              type="button"
              class="select select-bordered w-full flex items-center gap-2 justify-between"
              onClick={() => setProxyOpen(!proxyOpen())}
              onBlur={() => setProxyOpen(false)}
            >
              <span class="flex items-center gap-2">
                <img
                  src={
                    proxyEngine() === "uv"
                      ? "/img/ultraviolet.png"
                      : "/img/scramjet.png"
                  }
                  alt=""
                  class="w-5 h-5"
                />
                <span>{proxyEngine() === "uv" ? "UV" : "Scramjet"}</span>
              </span>
            </button>
            {proxyOpen() && (
              <ul
                class="absolute left-0 top-full mt-1 z-50 w-full menu bg-base-200 border border-base-300 rounded-box shadow-lg"
                onMouseDown={(e) => e.preventDefault()}
              >
                <li>
                  <button
                    type="button"
                    class="flex items-center gap-2 hover:bg-base-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProxyEngine("uv");
                      setProxyOpen(false);
                    }}
                  >
                    <img src="/img/ultraviolet.png" alt="" class="w-5 h-5" />
                    <span>UV</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    class="flex items-center gap-2 hover:bg-base-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProxyEngine("scramjet");
                      setProxyOpen(false);
                    }}
                  >
                    <img src="/img/scramjet.png" alt="" class="w-5 h-5" />
                    <span>Scramjet</span>
                  </button>
                </li>
              </ul>
            )}
          </div>

          <span
            class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
            onMouseDown={() => {
              setMoreInfoTitle("Proxy Engine");
              setMoreInfoContent(
                "Choose which proxy engine to use for browsing: UV uses XOR-encoded paths, Scramjet uses plain paths.",
              );
              setMoreInfoVisiblity(true);
            }}
          >
            <CircleHelp class="h-5 w-5" />
          </span>
        </div>

        <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
          <h1 class="text-2xl font-semibold">Adblock</h1>
          <p class="text-center text-xs">Enable or disable request blocking</p>
          <div class="relative w-full max-w-xs">
            <div class="grid grid-cols-2 rounded-box border border-base-300 bg-base-200 relative p-1">
              <div
                class={
                  adblock() === "enabled"
                    ? "absolute top-1 bottom-1 left-1/2 right-1 rounded-box bg-base-content transition-all z-0"
                    : "absolute top-1 bottom-1 left-1 right-1/2 rounded-box bg-base-content transition-all z-0"
                }
              />
              <button
                type="button"
                class={`btn btn-ghost flex-1 z-10 rounded-box ${adblock() === "disabled" ? "text-base-100" : "text-base-content"}`}
                onClick={() => setAdblock("disabled")}
              >
                Disabled
              </button>
              <button
                type="button"
                class={`btn btn-ghost flex-1 z-10 rounded-box ${adblock() === "enabled" ? "text-base-100" : "text-base-content"}`}
                onClick={() => setAdblock("enabled")}
              >
                Enabled
              </button>
            </div>
          </div>
          <span
            class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
            onMouseDown={() => {
              setMoreInfoTitle("Adblock");
              setMoreInfoContent(
                "Block ads throguh alu-adblocker (which uses workerware), and a blocklist.json which is how holy-ubo does adblocking",
              );
              setMoreInfoVisiblity(true);
            }}
          >
            <CircleHelp class="h-5 w-5" />
          </span>
        </div>

        <div class="collapse collapse-arrow">
          <input type="checkbox" />
          <div class="collapse-title left-1/2 w-1/3 -translate-x-1/2 text-xl font-medium">
            Advanced
          </div>
          <div class="collapse-content mt-6">
            <div class="flex flex-wrap justify-center gap-6">
              <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
                <h1 class="text-2xl font-semibold">Debug</h1>
                <p class="text-center text-xs">
                  Enable Eruda devtools (helps with debugging)
                </p>
                <div class="relative w-full max-w-xs">
                  <div class="grid grid-cols-2 rounded-box border border-base-300 bg-base-200 relative p-1">
                    <div
                      class={
                        debug() === "enabled"
                          ? "absolute top-1 bottom-1 left-1/2 right-1 rounded-box bg-base-content transition-all z-0"
                          : "absolute top-1 bottom-1 left-1 right-1/2 rounded-box bg-base-content transition-all z-0"
                      }
                    />
                    <button
                      type="button"
                      class={`btn btn-ghost flex-1 z-10 rounded-box ${debug() === "disabled" ? "text-base-100" : "text-base-content"}`}
                      onClick={() => setDebug("disabled")}
                    >
                      Disabled
                    </button>
                    <button
                      type="button"
                      class={`btn btn-ghost flex-1 z-10 rounded-box ${debug() === "enabled" ? "text-base-100" : "text-base-content"}`}
                      onClick={() => setDebug("enabled")}
                    >
                      Enabled
                    </button>
                  </div>
                </div>

                <span
                  class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
                  onMouseDown={() => {
                    setMoreInfoTitle("Debug Menu");
                    setMoreInfoContent(
                      "Enabling this enables the Eruda devtools menu. This puts a little wrench icon in the bottom right of your screen and can be used in conjunction with Mocha's dev team to diagnose issues, even when you don't have normal Chrome devtools enabled on your device.",
                    );
                    setMoreInfoVisiblity(true);
                  }}
                >
                  <CircleHelp class="h-5 w-5" />
                </span>
              </div>

              <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
                <h1 class="text-2xl font-semibold">Proxy Devtools</h1>
                <p class="text-center text-xs">
                  Enable a devtools option inside the proxy
                </p>
                <div class="relative w-full max-w-xs">
                  <div class="grid grid-cols-2 rounded-box border border-base-300 bg-base-200 relative p-1">
                    <div
                      class={
                        devtools() === "enabled"
                          ? "absolute top-1 bottom-1 left-1/2 right-1 rounded-box bg-base-content transition-all z-0"
                          : "absolute top-1 bottom-1 left-1 right-1/2 rounded-box bg-base-content transition-all z-0"
                      }
                    />
                    <button
                      type="button"
                      class={`btn btn-ghost flex-1 z-10 rounded-box ${devtools() === "disabled" ? "text-base-100" : "text-base-content"}`}
                      onClick={() => setDevtools("disabled")}
                    >
                      Disabled
                    </button>
                    <button
                      type="button"
                      class={`btn btn-ghost flex-1 z-10 rounded-box ${devtools() === "enabled" ? "text-base-100" : "text-base-content"}`}
                      onClick={() => setDevtools("enabled")}
                    >
                      Enabled
                    </button>
                  </div>
                </div>

                <span
                  class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
                  onMouseDown={() => {
                    setMoreInfoTitle("Proxy Devtools");
                    setMoreInfoContent(
                      "When enabled, a devtools button will appear on your browsing bar to open a devtools panel inside the proxy. This can be used to run JavaScript or inspect element on a proxied site.",
                    );
                    setMoreInfoVisiblity(true);
                  }}
                >
                  <CircleHelp class="h-5 w-5" />
                </span>
              </div>

              <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
                <h1 class="text-2xl font-semibold">Transport</h1>
                <p class="text-center text-xs">
                  Change how Mocha's proxy handles requests
                </p>
                <select
                  class="select select-bordered w-full max-w-xs"
                  value={transport()}
                  onChange={(e) => setTransport(e.target.value)}
                >
                  <option value="epoxy">Epoxy</option>
                  <option value="libcurl">Libcurl</option>
                </select>
                <button
                  class="btn btn-outline w-full"
                  type="button"
                  onClick={() => {
                    setWispModalUrl(wispUrl());
                    wispModal.showModal();
                  }}
                >
                  Configure Wisp
                </button>

                <span
                  class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
                  onMouseDown={() => {
                    setMoreInfoTitle("Transports");
                    setMoreInfoContent(
                      "Changing the transport changes how Mocha fetches proxied requests. Each transport has its own method of doing this - changing it may improve compatibility with sites.",
                    );
                    setMoreInfoVisiblity(true);
                  }}
                >
                  <CircleHelp class="h-5 w-5" />
                </span>
              </div>

              <div class="flex group relative w-80 flex-col items-center gap-4 rounded-box bg-base-200 p-4 border border-base-300">
                <h1 class="text-2xl font-semibold">Browsing Data</h1>
                <p class="text-center text-xs">
                  Export, import, or delete your proxy browsing data
                </p>
                <div class="flex w-full gap-2">
                  <button
                    class="btn btn-outline flex-1"
                    type="button"
                    onClick={() => exportWarning.showModal()}
                  >
                    Export
                  </button>
                  <button
                    class="btn btn-outline flex-1"
                    type="button"
                    onClick={() => importWarning.showModal()}
                  >
                    Import
                  </button>
                </div>
                <button
                  class="btn btn-error w-full"
                  type="button"
                  onClick={() => deleteWarning.showModal()}
                >
                  Delete
                </button>

                <input
                  type="file"
                  class="hidden"
                  ref={
                    // biome-ignore lint: needs to be here for Solid refs
                    fileImport!
                  }
                />

                <span
                  class="absolute top-2.5 right-2.5 text-base-content/50 opacity-0 group-hover:opacity-100 duration-150 cursor-pointer"
                  onMouseDown={() => {
                    setMoreInfoTitle("Browsing Data");
                    setMoreInfoContent(
                      "This section allows you to import or export Mocha's browsing data. This stores all of your logged in sites, history, and other data you would normally have in a typical browser into a single file. This means you can periodically download your browsing data and import it into a new Mocha link in case the one you're on now gets blocked. It's VERY IMPORTANT to know that you DO NOT SHARE this file with ANYONE.",
                    );
                    setMoreInfoVisiblity(true);
                  }}
                >
                  <CircleHelp class="h-5 w-5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-4 py-4">
        <button class="btn btn-primary px-16" type="button" onClick={save}>
          Save
        </button>
        <button
          class="btn btn-error px-16"
          type="button"
          onClick={() => {
            setTabIcon("");
            setTabName("");
            setPanicKey("");
            setPanicUrl("https://classroom.google.com/h");
            setCloakMode("none");
            setTheme("amoled");
            setDebug("disabled");
            setDevtools("enabled");
            setAdblock("enabled");
            setTransport("epoxy");
            setWispUrl(DEFAULT_WISP_URL);
            setSearchEngine("google");
            setProxyEngine("uv");
            save();
          }}
        >
          Reset
        </button>
      </div>

      <dialog
        class="modal"
        ref={
          // biome-ignore lint: needs to be here for Solid refs
          wispModal!
        }
      >
        <div class="modal-box">
          <h3 class="text-lg font-bold">Configure Wisp</h3>
          <p class="py-2 text-sm">
            Select a preset or enter a custom Wisp URL.
          </p>
          <div class="py-2 flex flex-col gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Presets</span>
              </label>
              <div class="flex flex-col gap-2">
                {wispPresets().map((url, i) => (
                  <div
                    class="flex justify-between items-center bg-base-200 hover:bg-base-300 duration-200 min-h-12 w-full rounded-box px-3 py-2 group border border-base-300 cursor-pointer gap-2"
                    onClick={() => {
                      setWispModalUrl(url);
                      toast.custom(() => {
                        return (
                          <div class="toast toast-center toast-top z-[9999]">
                            <div class="alert alert-success w-80">
                              <CircleCheck />
                              <span>Wisp preset selected.</span>
                            </div>
                          </div>
                        );
                      });
                    }}
                  >
                    <div class="flex-1 text-left whitespace-normal break-all font-geist-mono">
                      {url}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = wispPresets().filter(
                          (_, idx) => idx !== i,
                        );
                        setWispPresets(next);
                        store.local.set("wispPresets", next);
                        toast.custom(() => {
                          return (
                            <div class="toast toast-center toast-top z-[9999]">
                              <div class="alert alert-success w-80">
                                <CircleCheck />
                                <span>Wisp preset deleted.</span>
                              </div>
                            </div>
                          );
                        });
                      }}
                      class="btn btn-square btn-ghost btn-sm shrink-0 sm:opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200"
                    >
                      <Trash class="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Custom URL</span>
              </label>
              <div class="flex gap-2 items-stretch">
                <input
                  type="text"
                  class="input input-bordered w-full"
                  value={wispModalUrl()}
                  onInput={(e) =>
                    setWispModalUrl((e.target as HTMLInputElement).value)
                  }
                  placeholder="wss://..."
                />
                <button
                  class="btn btn-outline border-base-300 h-12 min-h-12 px-4"
                  type="button"
                  title="Add preset"
                  onClick={() => {
                    const url = wispModalUrl().trim();
                    if (url.startsWith("ws")) {
                      if (!wispPresets().includes(url)) {
                        const next = [...wispPresets(), url];
                        setWispPresets(next);
                        store.local.set("wispPresets", next);
                      }
                      toast.custom(() => {
                        return (
                          <div class="toast toast-center toast-top z-[9999]">
                            <div class="alert alert-success w-80">
                              <CircleCheck />
                              <span>Wisp preset added.</span>
                            </div>
                          </div>
                        );
                      });
                    } else {
                      toast.custom(() => {
                        return (
                          <div class="toast toast-center toast-top z-[9999]">
                            <div class="alert alert-error w-80">
                              <span>Enter a valid ws:// or wss:// URL</span>
                            </div>
                          </div>
                        );
                      });
                    }
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div class="modal-action flex gap-2">
            <button
              class="btn w-28"
              type="button"
              onClick={() => wispModal.close()}
            >
              Cancel
            </button>
            <button
              class="btn btn-primary w-28"
              type="button"
              onClick={() => {
                const url = wispModalUrl().trim();
                if (url) {
                  setWispUrl(url);
                  toast.custom(() => {
                    return (
                      <div class="toast toast-center toast-top z-[9999]">
                        <div class="alert alert-success w-80">
                          <CircleCheck />
                          <span>Wisp applied.</span>
                        </div>
                      </div>
                    );
                  });
                }
                wispModal.close();
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        class="modal"
        ref={
          // biome-ignore lint: needs to be here for Solid refs
          searchModal!
        }
      >
        <div class="modal-box">
          <h3 class="text-lg font-bold">Configure Search Engine</h3>
          <p class="py-2 text-sm">Select a preset or add your own.</p>
          <div class="py-2 flex flex-col gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Presets</span>
              </label>
              <div class="flex flex-col gap-2">
                {searchPresets().map((p, i) => (
                  <div
                    class="flex justify-between items-center bg-base-200 hover:bg-base-300 duration-200 min-h-12 w-full rounded-box px-3 py-2 group border border-base-300 cursor-pointer gap-2"
                    onClick={() => {
                      if (p.name === "Google") {
                        setSearchEngine("google");
                      } else if (p.name === "DuckDuckGo") {
                        setSearchEngine("duckduckgo");
                      } else if (p.name === "Ecosia") {
                        setSearchEngine("ecosia");
                      } else if (p.name === "Bing") {
                        setSearchEngine("bing");
                      } else {
                        setSearchEngine("custom");
                        setSearchCustomUrl(p.url);
                      }
                      toast.custom(() => {
                        return (
                          <div class="toast toast-center toast-top z-[9999]">
                            <div class="alert alert-success w-80">
                              <CircleCheck />
                              <span>Search engine preset selected.</span>
                            </div>
                          </div>
                        );
                      });
                    }}
                  >
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <img
                        src={
                          {
                            Google: "/img/google.png",
                            DuckDuckGo: "/img/duckduckgo.png",
                            Ecosia: "/img/ecosia.png",
                            Bing: "/img/bing.png",
                          }[p.name] || "/globe.svg"
                        }
                        alt=""
                        class="w-4 h-4 shrink-0"
                      />
                      <div class="text-left whitespace-normal break-all">
                        {p.name} |{" "}
                        <span class="font-geist-mono ml-1">{p.url}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = searchPresets().filter(
                          (_, idx) => idx !== i,
                        );
                        setSearchPresets(next);
                        store.local.set("searchPresets", next);
                        toast.custom(() => {
                          return (
                            <div class="toast toast-center toast-top z-[9999]">
                              <div class="alert alert-success w-80">
                                <CircleCheck />
                                <span>Search preset deleted.</span>
                              </div>
                            </div>
                          );
                        });
                      }}
                      class="btn btn-square btn-ghost btn-sm shrink-0 sm:opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200"
                    >
                      <Trash class="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Add custom preset</span>
              </label>
              <div class="flex flex-col gap-2">
                <input
                  type="text"
                  class="input input-bordered w-full"
                  value={searchPresetName()}
                  onInput={(e) =>
                    setSearchPresetName((e.target as HTMLInputElement).value)
                  }
                  placeholder="Preset name"
                />
                <div class="flex gap-2 items-stretch">
                  <input
                    type="text"
                    class="input input-bordered w-full font-geist-mono"
                    value={searchCustomUrl()}
                    onInput={(e) =>
                      setSearchCustomUrl((e.target as HTMLInputElement).value)
                    }
                    placeholder="https://example.com/search?q=%s"
                  />
                  <button
                    class="btn btn-outline border-base-300 h-12 min-h-12 px-4"
                    type="button"
                    title="Add preset"
                    onClick={() => {
                      const name = searchPresetName().trim() || "Custom";
                      const url = searchCustomUrl().trim();
                      if (!url.includes("%s")) {
                        toast.custom(() => {
                          return (
                            <div class="toast toast-center toast-top z-[9999]">
                              <div class="alert alert-error w-80">
                                <span>
                                  Custom engine must include %s where the query
                                  goes.
                                </span>
                              </div>
                            </div>
                          );
                        });
                        return;
                      }
                      const next = [...searchPresets(), { name, url }];
                      setSearchPresets(next);
                      store.local.set("searchPresets", next);
                      setSearchEngine("custom");
                      toast.custom(() => {
                        return (
                          <div class="toast toast-center toast-top z-[9999]">
                            <div class="alert alert-success w-80">
                              <CircleCheck />
                              <span>Search preset added.</span>
                            </div>
                          </div>
                        );
                      });
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-action flex gap-2">
            <button
              class="btn w-28"
              type="button"
              onClick={() => searchModal.close()}
            >
              Close
            </button>
            <button
              class="btn btn-primary w-28"
              type="button"
              onClick={() => {
                const url = searchCustomUrl().trim();
                if (url && url.includes("%s")) {
                  setSearchEngine("custom");
                  setSearchCustomUrl(url);
                  toast.custom(() => {
                    return (
                      <div class="toast toast-center toast-top z-[9999]">
                        <div class="alert alert-success w-80">
                          <CircleCheck />
                          <span>Custom search engine applied.</span>
                        </div>
                      </div>
                    );
                  });
                } else {
                  toast.custom(() => {
                    return (
                      <div class="toast toast-center toast-top z-[9999]">
                        <div class="alert alert-success w-80">
                          <CircleCheck />
                          <span>Search engine selection applied.</span>
                        </div>
                      </div>
                    );
                  });
                }
                searchModal.close();
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        class="modal"
        ref={
          // biome-ignore lint: needs to be here for Solid refs
          exportWarning!
        }
      >
        <div class="modal-box">
          <h3 class="text-lg font-bold">Continue with export?</h3>
          <p class="py-4">
            Warning! This file contains all the data that would normally be
            stored in your browser if you were to visit websites un-proxied on
            your computer. This includes any logins you used while inside the
            proxy.{" "}
            <span class="font-bold underline">
              Don't give this file to other people.
            </span>
          </p>
          <div class="modal-action flex gap-2">
            <button
              class="btn w-28"
              type="button"
              onClick={() => exportWarning.close()}
            >
              Cancel
            </button>
            <button
              class="btn btn-success w-28"
              type="button"
              onClick={exportData}
            >
              Proceed
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        class="modal"
        ref={
          // biome-ignore lint: needs to be here for Solid refs
          cloakModal!
        }
      >
        <div class="modal-box">
          <h3 class="text-lg font-bold">Configure Cloak</h3>
          <p class="py-2 text-sm">
            Choose a preset or add your own tab title and favicon.
          </p>
          <div class="py-2 flex flex-col gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Presets</span>
              </label>
              <div class="flex flex-col gap-2">
                {cloakPresets().map((p, i) => (
                  <div
                    class="flex justify-between items-center bg-base-200 hover:bg-base-300 duration-200 min-h-12 w-full rounded-box px-3 py-2 group border border-base-300 cursor-pointer gap-2"
                    onClick={() => {
                      setTabName(p.title);
                      setTabIcon(p.icon);
                      toast.custom(() => {
                        return (
                          <div class="toast toast-center toast-top z-[9999]">
                            <div class="alert alert-success w-80">
                              <CircleCheck />
                              <span>Cloak preset selected.</span>
                            </div>
                          </div>
                        );
                      });
                    }}
                  >
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <img src={p.icon} alt="" class="w-4 h-4 shrink-0" />
                      <div class="whitespace-normal break-all">{p.title}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = cloakPresets().filter(
                          (_, idx) => idx !== i,
                        );
                        setCloakPresets(next);
                        store.local.set("cloakPresets", next);
                        toast.custom(() => {
                          return (
                            <div class="toast toast-center toast-top z-[9999]">
                              <div class="alert alert-success w-80">
                                <CircleCheck />
                                <span>Cloak preset deleted.</span>
                              </div>
                            </div>
                          );
                        });
                      }}
                      class="btn btn-square btn-ghost btn-sm shrink-0 sm:opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200"
                    >
                      <Trash class="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Add custom preset</span>
              </label>
              <input
                type="text"
                class="input input-bordered w-full"
                value={cloakPresetTitle()}
                onInput={(e) =>
                  setCloakPresetTitle((e.target as HTMLInputElement).value)
                }
                placeholder="Title (e.g., Google)"
              />
              <div class="flex gap-2 mt-2 items-stretch">
                <input
                  type="text"
                  class="input input-bordered w-full"
                  value={cloakPresetIcon()}
                  onInput={(e) =>
                    setCloakPresetIcon((e.target as HTMLInputElement).value)
                  }
                  placeholder="Favicon URL (/img/google.png or https://...)"
                />
                <button
                  class="btn btn-outline border-base-300 h-12 min-h-12 px-4"
                  type="button"
                  title="Add preset"
                  onClick={() => {
                    const title = cloakPresetTitle().trim();
                    const icon = cloakPresetIcon().trim();
                    if (!title || !icon) {
                      toast.custom(() => {
                        return (
                          <div class="toast toast-center toast-top z-[9999]">
                            <div class="alert alert-error w-80">
                              <span>Enter both title and icon URL.</span>
                            </div>
                          </div>
                        );
                      });
                      return;
                    }
                    const next = [...cloakPresets(), { title, icon }];
                    setCloakPresets(next);
                    store.local.set("cloakPresets", next);
                    toast.custom(() => {
                      return (
                        <div class="toast toast-center toast-top z-[9999]">
                          <div class="alert alert-success w-80">
                            <CircleCheck />
                            <span>Cloak preset added.</span>
                          </div>
                        </div>
                      );
                    });
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div class="modal-action flex gap-2">
            <button
              class="btn w-28"
              type="button"
              onClick={() => cloakModal.close()}
            >
              Close
            </button>
            <button
              class="btn btn-primary w-28"
              type="button"
              onClick={() => {
                const title = cloakPresetTitle().trim();
                const icon = cloakPresetIcon().trim();
                if (title || icon) {
                  if (title) setTabName(title);
                  if (icon) setTabIcon(icon);
                  toast.custom(() => {
                    return (
                      <div class="toast toast-center toast-top z-[9999]">
                        <div class="alert alert-success w-80">
                          <CircleCheck />
                          <span>Cloak applied.</span>
                        </div>
                      </div>
                    );
                  });
                }
                cloakModal.close();
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        class="modal"
        ref={
          // biome-ignore lint: needs to be here for Solid refs
          importWarning!
        }
      >
        <div class="modal-box">
          <h3 class="text-lg font-bold">
            Current browsing data will be removed
          </h3>
          <p class="py-4">
            Warning! By proceeding, your proxy browsing data will be replaced by
            the imported data. This is irreversible. Continue?
          </p>
          <div class="modal-action flex gap-2">
            <button
              class="btn w-28"
              type="button"
              onClick={() => importWarning.close()}
            >
              Cancel
            </button>
            <button
              class="btn btn-error w-28"
              type="button"
              onClick={() => importData(fileImport)}
            >
              Proceed
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        class="modal"
        ref={
          // biome-ignore lint: needs to be here for Solid refs
          deleteWarning!
        }
      >
        <div class="modal-box">
          <h3 class="text-lg font-bold">
            Current browsing data will be deleted
          </h3>
          <p class="py-4">
            Warning! By proceeding, your proxy browsing data will be wiped
            completely. This is irreversible. Continue?
          </p>
          <div class="modal-action">
            <form method="dialog" class="flex gap-2">
              <button class="btn w-28" type="submit">
                Cancel
              </button>
              <button
                class="btn btn-error w-28"
                type="button"
                onClick={() => resetData()}
              >
                Proceed
              </button>
            </form>
          </div>
        </div>
      </dialog>

      <dialog
        class="modal"
        ref={
          // biome-ignore lint: needs to be here for Solid refs
          moreInfo!
        }
      >
        <div class="modal-box">
          <h3 class="text-lg font-bold">{moreInfoTitle()}</h3>
          <p class="py-4">{moreInfoContent()}</p>
          <div class="modal-action">
            <form method="dialog" class="flex gap-2">
              <button
                class="btn w-28"
                type="submit"
                onClick={() => {
                  setMoreInfoVisiblity(false);
                  setMoreInfoTitle("");
                  setMoreInfoContent("");
                }}
              >
                Got it
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}
