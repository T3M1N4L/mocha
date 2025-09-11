import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import store from "store2";
import { handleDebug } from "./lib/debug";
import { analytics } from "./lib/analytics";

import Layout from "./layout";
import FAQ from "./routes/faq";
import Games from "./routes/games";
import Home from "./routes/home";
import ProxyViewer from "./routes/route";
import Settings from "./routes/settings";
import Shortcuts from "./routes/shortcuts";
import Bookmarks from "./routes/bookmarks";
import "./style.css";

analytics.trackPageview();

// Seed defaults only when the key is missing, never overwrite saved values
function seed<T>(key: string, value: T) {
  const existing = store.local.get(key);
  if (existing === undefined || existing === null) {
    store.local.set(key, value);
  }
}

seed("tab", {
  name: null,
  icon: null,
});

seed("panic", {
  key: null,
  url: null,
});

seed("cloak", {
  mode: "none",
});

seed("theme", {
  theme: "amoled",
});

seed("debug", {
  enabled: false,
});

seed("devtools", {
  enabled: true,
});

seed("adblock", {
  enabled: true,
});

seed("transport", {
  transport: "epoxy",
});

seed("bookmarks", [] as unknown as never);

seed("searchEngine", {
  engine: "google",
});

seed("proxyEngine", {
  engine: "uv",
});

// Debug is here to capture all logs
handleDebug();

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root not initialized");
}

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/route/:route" component={ProxyViewer} />
      <Route path="/games" component={Games} />
      <Route path="/shortcuts" component={Shortcuts} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="/faq" component={FAQ} />
      <Route path="/settings" component={Settings} />
    </Router>
  ),
  root,
);
