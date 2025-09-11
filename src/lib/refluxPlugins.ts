// Reflux Plugin Manager: define, add, enable, and ensure plugins via Reflux storage
// Edit defaultPlugins below to add/edit your hardcoded plugins.

import type { RefluxAPI as RefluxAPIType } from "@nightnetwork/reflux";
import { RefluxAPI } from "@nightnetwork/reflux";

export type PluginDefinition = {
  function: string;
  name: string;
  sites: string[] | ["*"];
};

let apiSingleton: RefluxAPIType | null = null;

export function getRefluxAPI(): RefluxAPIType {
  // Prefer an externally provided instance (if transport exposes one)
  const external = (globalThis as any).RefluxControlAPI || (globalThis as any).RefluxAPIInstance;
  if (external) return external as RefluxAPIType;

  if (!apiSingleton) {
    // The runtime build exports a zero-arg constructor; the type may expect a MessagePort.
    const Ctor: any = RefluxAPI as any;
    apiSingleton = new Ctor() as RefluxAPIType;
  }
  return apiSingleton as RefluxAPIType;
}

export async function addPlugin(plugin: PluginDefinition): Promise<void> {
  const api = getRefluxAPI();
  await api.addPlugin(plugin);
}

export async function removePlugin(name: string): Promise<void> {
  const api = getRefluxAPI();
  await api.removePlugin(name);
}

export async function enablePlugin(name: string): Promise<void> {
  const api = getRefluxAPI();
  // lib API provides enablePlugin
  if (typeof (api as any).enablePlugin === "function") {
    await (api as any).enablePlugin(name);
  }
}

export async function disablePlugin(name: string): Promise<void> {
  const api = getRefluxAPI();
  if (typeof (api as any).disablePlugin === "function") {
    await (api as any).disablePlugin(name);
  }
}

export async function listPlugins(): Promise<Array<{ name: string; sites: string[] | ["*"]; enabled: boolean; function?: string }>> {
  const api = getRefluxAPI();
  return api.listPlugins();
}

export async function getEnabledPlugins(): Promise<string[]> {
  const api = getRefluxAPI();
  if (typeof (api as any).getEnabledPlugins === "function") {
    return (api as any).getEnabledPlugins();
  }
  // Fallback: derive from list
  const list = await api.listPlugins();
  return list.filter((p) => p.enabled).map((p) => p.name);
}

export async function updatePluginSites(name: string, sites: string[] | ["*"]): Promise<void> {
  const api = getRefluxAPI();
  if (typeof (api as any).updatePluginSites === "function") {
    await (api as any).updatePluginSites(name, sites);
  } else {
    // Fallback by remove+add if function retrieval available
    const list = await api.listPlugins();
    const found = list.find((p) => p.name === name);
    const fn = (found as any)?.function as string | undefined;
    if (!fn) return;
    await api.removePlugin(name);
    await api.addPlugin({ name, sites, function: fn });
  }
}

function sameSites(a: string[] | ["*"], b: string[] | ["*"]): boolean {
  if (a.length !== b.length) return false;
  const as = [...a].sort().join(",");
  const bs = [...b].sort().join(",");
  return as === bs;
}

export async function ensurePlugins(plugins: PluginDefinition[]): Promise<void> {
  const existing = await listPlugins().catch(() => [] as Awaited<ReturnType<typeof listPlugins>>);
  const existingMap = new Map(existing.map((p) => [p.name, p]));
  for (const plugin of plugins) {
    const curr = existingMap.get(plugin.name);
    if (!curr) {
      await addPlugin(plugin);
      await enablePlugin(plugin.name);
      continue;
    }
    if (!sameSites(curr.sites, plugin.sites)) {
      await updatePluginSites(plugin.name, plugin.sites);
    }
    // Ensure enabled
    if (!curr.enabled) {
      await enablePlugin(plugin.name);
    }
  }
}

export const defaultPlugins: PluginDefinition[] = [
  {
    name: "com.example.logger",
    sites: ["*"],
    function: `
/* @browser */
try {
  console.log('🚀 Example plugin executed on:', typeof url !== 'undefined' ? url : location?.href);
  console.log('🚀 Plugin name:', typeof pluginName !== 'undefined' ? pluginName : 'com.example.logger');
} catch (e) {
  console.log('🚀 Example plugin executed (no url available)');
}
/* @/browser */
    `.trim(),
  },
  {
    name: "com.example.example-com-enhancer",
    sites: ["example.com", "www.example.com"],
    function: `
/* @browser */
console.log('🎯 Example.com plugin running on:', typeof url !== 'undefined' ? url : location?.href);
function enhanceExampleCom() {
  const h1Elements = document.querySelectorAll('h1');
  console.log('Found', h1Elements.length, 'h1 elements');
  h1Elements.forEach((h1, index) => {
    h1.style.cssText = 'color: #ff6b6b !important; background: #ffe066 !important; padding: 10px !important; border-radius: 5px !important; border: 2px solid #ff6b6b !important;';
    h1.innerHTML = '🚀 ENHANCED BY REFLUX: ' + h1.innerHTML;
    console.log('Enhanced h1 element', index + 1);
  });
  if (h1Elements.length === 0) {
    console.log('No h1 elements found, adding a banner instead');
    const banner = document.createElement('div');
    banner.innerHTML = '🚀 Reflux Plugin Active on Example.com!';
    banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #ff6b6b; color: white; padding: 10px; text-align: center; z-index: 10000; font-weight: bold;';
    document.body.appendChild(banner);
    document.body.style.marginTop = '50px';
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceExampleCom);
} else {
  enhanceExampleCom();
}
/* @/browser */
    `.trim(),
  },
  {
    name: "com.example.google-modifier",
    sites: ["google.com", "www.google.com"],
    function: `
// Response modifier: prefix page title
if (typeof body === 'string' && body.includes('<title>')) {
  try { return body.replace('<title>', '<title>[MODIFIED BY REFLUX] '); } catch (_) {}
}
return body;
    `.trim(),
  },
  {
    name: "com.example.github-enhancer",
    sites: ["github.com"],
    function: `
// Response modifier: inject CSS and banner
if (typeof body === 'string' && body.includes('</head>')) {
  const customCSS = '<style>.reflux-banner {background: linear-gradient(90deg, #6366f1, #8b5cf6);color: white;text-align: center;padding: 10px;font-weight: bold;position: fixed;top: 0;left: 0;right: 0;z-index: 9999;}body { margin-top: 40px !important; }</style>';
  const banner = '<div class="reflux-banner">🚀 Enhanced by Reflux Plugin System</div>';
  let modifiedBody = body.replace('</head>', customCSS + '</head>');
  const bodyTagMatch = modifiedBody.match(/<body[^>]*>/);
  if (bodyTagMatch) {
    const bodyTag = bodyTagMatch[0];
    modifiedBody = modifiedBody.replace(bodyTag, bodyTag + banner);
  }
  return modifiedBody;
}
return body;
    `.trim(),
  },
  {
    name: "com.example.social-enhancer",
    sites: ["www.instagram.com", "instagram.com"],
    function: `
/* @browser */
console.log('📱 Social media plugin activated on:', typeof url !== 'undefined' ? url : location?.href);
console.log('📱 Plugin:', typeof pluginName !== 'undefined' ? pluginName : 'com.example.social-enhancer');
const socialBanner = document.createElement('div');
socialBanner.innerHTML = '📱 Social Media Enhanced by Reflux!';
socialBanner.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: #8b5cf6; color: white; padding: 8px; text-align: center; z-index: 999999; font-size: 14px;';
function addSocialEnhancements() {
  document.body.appendChild(socialBanner);
  console.log('📱 Social media enhancements added');
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addSocialEnhancements);
} else {
  addSocialEnhancements();
}
/* @/browser */
    `.trim(),
  },
  {
    name: "com.debug.all-sites",
    sites: ["*"],
    function: `
/* @browser */
try {
  console.log('🔍 DEBUG PLUGIN - URL:', typeof url !== 'undefined' ? url : location?.href);
  console.log('🔍 DEBUG PLUGIN - Plugin:', typeof pluginName !== 'undefined' ? pluginName : 'com.debug.all-sites');
  console.log('🔍 DEBUG PLUGIN - User Agent:', navigator.userAgent);
  console.log('🔍 DEBUG PLUGIN - Page Title:', document.title);
  console.log('🔍 DEBUG PLUGIN - DOM Ready State:', document.readyState);
  const debugIndicator = document.createElement('div');
  debugIndicator.innerHTML = '🔍 DEBUG: Reflux Plugin Active';
  debugIndicator.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #ff0000; color: white; padding: 5px 10px; border-radius: 5px; z-index: 999999; font-size: 12px; font-family: monospace; border: 2px solid #ffffff;';
  function addDebugIndicator() {
    document.body.appendChild(debugIndicator);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDebugIndicator);
  } else {
    addDebugIndicator();
  }
} catch (e) {}
/* @/browser */
    `.trim(),
  },
];

export async function initDefaultPlugins(): Promise<void> {
  try {
    await ensurePlugins(defaultPlugins);
    const list = await listPlugins();
    // Optional: log current
    console.log("[RefluxPlugins] Ensured default plugins. Currently loaded:", list);
  } catch (err) {
    console.error("[RefluxPlugins] Initialization failed:", err);
  }
}