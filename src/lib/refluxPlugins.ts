// Reflux Plugin Manager: define, add, enable, and ensure plugins via Reflux storage
// Edit defaultPlugins below to add/edit your hardcoded plugins.

import type { RefluxAPI as RefluxAPIType } from "@nightnetwork/reflux";
import { RefluxAPI } from "@nightnetwork/reflux";
import type { PluginDefinition, PluginConfig } from "./pluginTypes";

export type { PluginDefinition, PluginConfig };

let apiSingleton: RefluxAPIType | null = null;

export function getRefluxAPI(): RefluxAPIType {
  // Prefer an externally provided instance (if transport exposes one)
  const external =
    (globalThis as any).RefluxControlAPI ||
    (globalThis as any).RefluxAPIInstance;
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

export async function listPlugins(): Promise<
  Array<{
    name: string;
    sites: string[] | ["*"];
    enabled: boolean;
    function?: string;
  }>
> {
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

// Load plugins from JSON configuration file
export async function loadPluginsFromJSON(): Promise<PluginConfig[]> {
  try {
    const response = await fetch("/plugins/plugins.json");
    if (!response.ok) {
      console.warn("[RefluxPlugins] Failed to load plugins/plugins.json");
      return [];
    }
    const data = await response.json();
    return data.plugins || [];
  } catch (error) {
    console.error("[RefluxPlugins] Error loading plugins/plugins.json:", error);
    return [];
  }
}

// Load plugin function from JS file or return custom plugin code
export async function loadPluginFunction(
  functionFile: string,
  customCode?: string,
): Promise<string> {
  console.log(`[RefluxPlugins] Loading plugin function for: ${functionFile}`);
  console.log(`[RefluxPlugins] Custom code provided: ${!!customCode}`);
  
  // Check if this is a custom plugin
  if (functionFile.startsWith("__custom_")) {
    // Use the pre-processed custom code if provided (for userscripts)
    if (customCode) {
      console.log("[RefluxPlugins] Using processed custom plugin code");
      console.log(`[RefluxPlugins] Processed code (first 200 chars):`, customCode.substring(0, 200));
      console.log(`[RefluxPlugins] Code includes <script>: ${customCode.includes('<script>')}`);
      console.log(`[RefluxPlugins] Code includes <style>: ${customCode.includes('<style>')}`);
      
      // Add cache-busting comment to ensure fresh execution
      const cachedBustingCode = `// Cache buster: ${Date.now()} - ${Math.random().toString(36)}\n${customCode}`;
      return cachedBustingCode;
    }

    const customPluginId = functionFile.replace("__custom_", "");
    const { getCustomPlugin } = await import("./customPlugins");
    const customPlugin = getCustomPlugin(customPluginId);

    if (!customPlugin) {
      throw new Error(`Custom plugin with ID "${customPluginId}" not found`);
    }

    console.log(
      "[RefluxPlugins] Fallback: Using raw custom plugin code for:",
      customPlugin.name,
      "Type:",
      customPlugin.type
    );
    console.log(`[RefluxPlugins] Raw code (first 200 chars):`, customPlugin.jsCode.substring(0, 200));
    console.warn("[RefluxPlugins] WARNING: Using raw code instead of processed code - this might not work correctly for userscripts/userstyles");
    
    // Add cache-busting comment
    const cachedBustingRawCode = `// Cache buster: ${Date.now()} - ${Math.random().toString(36)}\n${customPlugin.jsCode}`;
    return cachedBustingRawCode;
  }

  // Load from regular JS file
  try {
    const response = await fetch(`/plugins/${functionFile}?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to load plugin file: ${functionFile}`);
    }
    return await response.text();
  } catch (error) {
    console.error(
      `[RefluxPlugins] Error loading plugin file ${functionFile}:`,
      error,
    );
    throw error;
  }
}

// Save plugins to local storage (since we can't write to public files from browser)
export function savePluginsToLocalStorage(plugins: PluginConfig[]): void {
  try {
    const dataToSave = {
      plugins,
      timestamp: Date.now(),
    };
    localStorage.setItem("reflux-plugins", JSON.stringify(dataToSave));
    console.log("[RefluxPlugins] Successfully saved plugins to localStorage");
  } catch (error) {
    console.error(
      "[RefluxPlugins] Failed to save plugins to localStorage:",
      error,
    );
    throw new Error("Failed to save plugin configuration");
  }
}

// Load plugins from local storage with fallback to JSON, including custom plugins
export async function loadPluginsConfig(): Promise<PluginConfig[]> {
  // Use the new unified approach
  try {
    const { getAllPluginsUnified } = await import("./customPlugins");
    const allPlugins = await getAllPluginsUnified();
    console.log(
      "[RefluxPlugins] Loaded unified plugins:",
      allPlugins.length,
    );
    return allPlugins;
  } catch (error) {
    console.error(
      "[RefluxPlugins] Error loading unified plugins:",
      error,
    );
    // Fallback to JSON file
    console.log("[RefluxPlugins] Falling back to JSON file");
    return loadPluginsFromJSON();
  }
}

// Toggle plugin enabled state
export async function togglePlugin(pluginName: string): Promise<boolean> {
  try {
    const plugins = await loadPluginsConfig();
    const plugin = plugins.find((p) => p.name === pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found in configuration`);
    }

    const newState = !plugin.enabled;
    plugin.enabled = newState;

    // Save to localStorage first
    savePluginsToLocalStorage(plugins);

    // Then update the actual plugin state in the API
    try {
      if (newState) {
        // Load the plugin function from its file
        const functionCode = await loadPluginFunction(
          plugin.functionFile,
          plugin._customCode, // Pass the processed custom code
        );

        // First ensure the plugin is added if it doesn't exist
        const pluginDef: PluginDefinition = {
          name: plugin.name,
          sites: plugin.sites,
          function: functionCode,
        };
        await addPlugin(pluginDef);
        await enablePlugin(pluginName);
        console.log(
          `[RefluxPlugins] Successfully enabled plugin: ${pluginName}`,
        );
      } else {
        await disablePlugin(pluginName);
        console.log(
          `[RefluxPlugins] Successfully disabled plugin: ${pluginName}`,
        );
      }

      // Reinitialize the plugin system to apply changes immediately
      console.log(
        `[RefluxPlugins] Reinitializing plugin system after toggle...`,
      );
      await initDefaultPlugins();
    } catch (apiError) {
      console.warn(
        `[RefluxPlugins] API update failed for ${pluginName}, but localStorage updated:`,
        apiError,
      );
      // Still try to reinitialize even if individual plugin operations failed
      try {
        await initDefaultPlugins();
      } catch (initError) {
        console.error(
          `[RefluxPlugins] Failed to reinitialize plugin system:`,
          initError,
        );
      }
    }

    return newState;
  } catch (error) {
    console.error(
      `[RefluxPlugins] Failed to toggle plugin ${pluginName}:`,
      error,
    );
    throw error;
  }
}

export async function initDefaultPlugins(): Promise<void> {
  try {
    console.log("[RefluxPlugins] Starting plugin initialization...");
    const pluginsConfig = await loadPluginsConfig();

    // Get all currently loaded plugins from the API
    const currentPlugins = await listPlugins().catch(() => []);
    const currentPluginNames = currentPlugins.map((p) => p.name);

    console.log("[RefluxPlugins] Current plugins in API:", currentPluginNames);
    console.log("[RefluxPlugins] Plugins from config:", pluginsConfig.map(p => `${p.name} (${p.enabled ? 'enabled' : 'disabled'})`));

    // FORCE REMOVE ALL EXISTING PLUGINS to prevent caching issues
    console.log("[RefluxPlugins] Force removing all existing plugins to prevent caching...");
    for (const pluginName of currentPluginNames) {
      try {
        await removePlugin(pluginName);
        console.log(`[RefluxPlugins] Force removed plugin: ${pluginName}`);
      } catch (error) {
        console.warn(`[RefluxPlugins] Failed to force remove plugin ${pluginName}:`, error);
      }
    }

    // Disable/remove plugins that should be disabled
    const disabledPlugins = pluginsConfig.filter((p) => !p.enabled);
    for (const plugin of disabledPlugins) {
      console.log(`[RefluxPlugins] Skipping disabled plugin: ${plugin.name}`);
    }

    // Enable plugins that should be enabled
    const enabledPluginsConfig = pluginsConfig.filter((p) => p.enabled);
    const enabledPlugins: PluginDefinition[] = [];

    // Load function code for each enabled plugin
    for (const pluginConfig of enabledPluginsConfig) {
      try {
        console.log(`[RefluxPlugins] Processing enabled plugin: ${pluginConfig.name}`);
        const functionCode = await loadPluginFunction(
          pluginConfig.functionFile,
          pluginConfig._customCode, // Pass the processed custom code
        );
        
        // Add timestamp to function code to prevent caching
        const timestampedCode = `// Generated at ${Date.now()} - ${new Date().toISOString()}\n${functionCode}`;
        
        enabledPlugins.push({
          name: pluginConfig.name,
          sites: pluginConfig.sites,
          function: timestampedCode,
        });
        
        console.log(`[RefluxPlugins] Prepared plugin ${pluginConfig.name} with fresh code`);
      } catch (error) {
        console.error(
          `[RefluxPlugins] Failed to load function for plugin ${pluginConfig.name}:`,
          error,
        );
      }
    }

    console.log(`[RefluxPlugins] Adding ${enabledPlugins.length} fresh plugins...`);
    await ensurePlugins(enabledPlugins);

    const list = await listPlugins();
    console.log(
      "[RefluxPlugins] Plugin initialization complete. Currently loaded:",
      list.map((p) => `${p.name} (${p.enabled ? "enabled" : "disabled"})`),
    );
  } catch (err) {
    console.error("[RefluxPlugins] Initialization failed:", err);
  }
}

// Force refresh the entire plugin system
export async function refreshPluginSystem(): Promise<void> {
  console.log("[RefluxPlugins] Force refreshing plugin system...");
  
  try {
    // Clear any potential caches in the API
    const api = getRefluxAPI();
    
    // If the API has any cache clearing methods, use them
    if (typeof (api as any).clearCache === "function") {
      console.log("[RefluxPlugins] Clearing API cache...");
      await (api as any).clearCache();
    }
    
    // Force remove all plugins first
    const currentPlugins = await listPlugins().catch(() => []);
    console.log("[RefluxPlugins] Current plugins to remove:", currentPlugins.map(p => p.name));
    
    for (const plugin of currentPlugins) {
      try {
        await removePlugin(plugin.name);
        console.log(`[RefluxPlugins] Removed plugin: ${plugin.name}`);
      } catch (error) {
        console.warn(`[RefluxPlugins] Failed to remove plugin ${plugin.name}:`, error);
      }
    }
    
    // Wait a moment for the removals to take effect
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now reinitialize
    await initDefaultPlugins();
    
    console.log("[RefluxPlugins] Plugin system refresh complete");
  } catch (error) {
    console.error("[RefluxPlugins] Failed to refresh plugin system:", error);
    // Still try to reinitialize even if clearing failed
    await initDefaultPlugins();
  }
}

// Force clear all plugins and reinitialize (for debugging)
export async function forceResetPluginSystem(): Promise<void> {
  console.log("[RefluxPlugins] FORCE RESET: Clearing all plugins and reinitializing...");
  
  try {
    const currentPlugins = await listPlugins().catch(() => []);
    
    // Remove all current plugins
    for (const plugin of currentPlugins) {
      try {
        await removePlugin(plugin.name);
      } catch (error) {
        console.warn(`[RefluxPlugins] Failed to remove ${plugin.name} during reset:`, error);
      }
    }
    
    // Wait for removals to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verify all plugins are gone
    const remainingPlugins = await listPlugins().catch(() => []);
    console.log("[RefluxPlugins] Plugins remaining after reset:", remainingPlugins.map(p => p.name));
    
    // Reinitialize with fresh data
    await initDefaultPlugins();
    
  } catch (error) {
    console.error("[RefluxPlugins] Force reset failed:", error);
  }
}

// Make debugging functions available globally
if (typeof window !== 'undefined') {
  (window as any).refreshPluginSystem = refreshPluginSystem;
  (window as any).forceResetPluginSystem = forceResetPluginSystem;
  (window as any).initDefaultPlugins = initDefaultPlugins;
  (window as any).listPlugins = listPlugins;
}

export async function updatePluginSites(
  name: string,
  sites: string[] | ["*"],
): Promise<void> {
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

export async function ensurePlugins(
  plugins: PluginDefinition[],
): Promise<void> {
  const existing = await listPlugins().catch(
    () => [] as Awaited<ReturnType<typeof listPlugins>>,
  );
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
