// Custom Plugin Storage Manager
// Handles saving, loading, and managing user-created custom plugins

import type { CustomPlugin } from "../components/customPluginForm";
import type { PluginConfig } from "./refluxPlugins";

const CUSTOM_PLUGINS_STORAGE_KEY = "custom-reflux-plugins";

export type CustomPluginData = CustomPlugin;

// Generate a unique ID for new plugins
function generatePluginId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Save custom plugins to localStorage
export function saveCustomPlugins(plugins: CustomPlugin[]): void {
  try {
    const dataToSave = {
      plugins,
      version: 1,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      CUSTOM_PLUGINS_STORAGE_KEY,
      JSON.stringify(dataToSave),
    );
    console.log(
      "[CustomPlugins] Successfully saved custom plugins to localStorage",
    );
  } catch (error) {
    console.error("[CustomPlugins] Failed to save custom plugins:", error);
    throw new Error("Failed to save custom plugins");
  }
}

// Load custom plugins from localStorage
export function loadCustomPlugins(): CustomPlugin[] {
  try {
    const stored = localStorage.getItem(CUSTOM_PLUGINS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const data = JSON.parse(stored);
    // Handle both versioned and legacy format
    const pluginsArray = data.plugins || data;

    if (!Array.isArray(pluginsArray)) {
      console.warn(
        "[CustomPlugins] Invalid plugins data format, returning empty array",
      );
      return [];
    }

    console.log(
      "[CustomPlugins] Loaded custom plugins from localStorage:",
      pluginsArray.length,
    );
    return pluginsArray;
  } catch (error) {
    console.error("[CustomPlugins] Error loading custom plugins:", error);
    // Clear corrupted data
    try {
      localStorage.removeItem(CUSTOM_PLUGINS_STORAGE_KEY);
    } catch (clearError) {
      console.warn(
        "[CustomPlugins] Failed to clear corrupted localStorage:",
        clearError,
      );
    }
    return [];
  }
}

// Create a new custom plugin
export function createCustomPlugin(
  pluginData: Omit<CustomPlugin, "id" | "created" | "updated">,
): CustomPlugin {
  const now = Date.now();
  const newPlugin: CustomPlugin = {
    ...pluginData,
    id: generatePluginId(),
    created: now,
    updated: now,
  };

  const existingPlugins = loadCustomPlugins();

  // Check for name conflicts
  const nameExists = existingPlugins.some((p) => p.name === newPlugin.name);
  if (nameExists) {
    throw new Error(
      `A plugin with the name "${newPlugin.name}" already exists`,
    );
  }

  const updatedPlugins = [...existingPlugins, newPlugin];
  saveCustomPlugins(updatedPlugins);

  console.log("[CustomPlugins] Created new custom plugin:", newPlugin.name);
  return newPlugin;
}

// Update an existing custom plugin
export function updateCustomPlugin(
  id: string,
  updates: Partial<Omit<CustomPlugin, "id" | "created">>,
): CustomPlugin {
  const existingPlugins = loadCustomPlugins();
  const pluginIndex = existingPlugins.findIndex((p) => p.id === id);

  if (pluginIndex === -1) {
    throw new Error(`Custom plugin with ID "${id}" not found`);
  }

  const existingPlugin = existingPlugins[pluginIndex];

  // Check for name conflicts if name is being changed
  if (updates.name && updates.name !== existingPlugin.name) {
    const nameExists = existingPlugins.some(
      (p) => p.id !== id && p.name === updates.name,
    );
    if (nameExists) {
      throw new Error(
        `A plugin with the name "${updates.name}" already exists`,
      );
    }
  }

  const updatedPlugin: CustomPlugin = {
    ...existingPlugin,
    ...updates,
    updated: Date.now(),
  };

  existingPlugins[pluginIndex] = updatedPlugin;
  saveCustomPlugins(existingPlugins);

  console.log("[CustomPlugins] Updated custom plugin:", updatedPlugin.name);
  return updatedPlugin;
}

// Delete a custom plugin
export function deleteCustomPlugin(id: string): boolean {
  const existingPlugins = loadCustomPlugins();
  const pluginIndex = existingPlugins.findIndex((p) => p.id === id);

  if (pluginIndex === -1) {
    return false;
  }

  const pluginName = existingPlugins[pluginIndex].name;
  existingPlugins.splice(pluginIndex, 1);
  saveCustomPlugins(existingPlugins);

  console.log("[CustomPlugins] Deleted custom plugin:", pluginName);
  return true;
}

// Get a single custom plugin by ID
export function getCustomPlugin(id: string): CustomPlugin | undefined {
  const plugins = loadCustomPlugins();
  return plugins.find((p) => p.id === id);
}

// Toggle enabled state of a custom plugin
export function toggleCustomPlugin(id: string): boolean {
  const plugin = getCustomPlugin(id);
  if (!plugin) {
    throw new Error(`Custom plugin with ID "${id}" not found`);
  }

  const newState = !plugin.enabled;
  updateCustomPlugin(id, { enabled: newState });

  console.log(
    "[CustomPlugins] Toggled custom plugin:",
    plugin.name,
    "enabled:",
    newState,
  );
  return newState;
}

// Convert custom plugin to PluginConfig format for compatibility with existing system
export function customPluginToPluginConfig(
  customPlugin: CustomPlugin,
): PluginConfig {
  return {
    name: customPlugin.name,
    displayName: customPlugin.displayName,
    description: customPlugin.description,
    sites: customPlugin.domains.includes("*") ? ["*"] : customPlugin.domains,
    enabled: customPlugin.enabled,
    functionFile: `__custom_${customPlugin.id}`, // Special marker for custom plugins
  };
}

// Get all plugins (default + custom) in PluginConfig format
export async function getAllPluginsConfig(): Promise<PluginConfig[]> {
  const { loadPluginsFromJSON } = await import("./refluxPlugins");

  // Load default plugins from JSON
  const defaultPlugins = await loadPluginsFromJSON();

  // Load custom plugins and convert to PluginConfig format
  const customPlugins = loadCustomPlugins();
  const customPluginConfigs = customPlugins.map(customPluginToPluginConfig);

  // Merge default and custom plugins
  const allPlugins = [...defaultPlugins, ...customPluginConfigs];

  // Apply localStorage overrides for enabled state
  try {
    const stored = localStorage.getItem("reflux-plugins");
    if (stored) {
      const storedData = JSON.parse(stored);
      const storedPlugins = storedData.plugins || storedData;

      if (Array.isArray(storedPlugins)) {
        // Create a map of stored plugin states
        const storedStateMap = new Map(
          storedPlugins.map((p) => [p.name, p.enabled]),
        );

        // Apply stored states to our plugins
        allPlugins.forEach((plugin) => {
          const storedState = storedStateMap.get(plugin.name);
          if (storedState !== undefined) {
            plugin.enabled = storedState;
          }
        });
      }
    }
  } catch (error) {
    console.warn("[CustomPlugins] Error loading plugin states:", error);
  }

  return allPlugins;
}

// Clear all custom plugins (useful for reset/debugging)
export function clearAllCustomPlugins(): void {
  localStorage.removeItem(CUSTOM_PLUGINS_STORAGE_KEY);
  console.log("[CustomPlugins] Cleared all custom plugins");
}

// Export statistics about custom plugins
export function getCustomPluginStats(): {
  total: number;
  enabled: number;
  disabled: number;
} {
  const plugins = loadCustomPlugins();
  const enabled = plugins.filter((p) => p.enabled).length;

  return {
    total: plugins.length,
    enabled,
    disabled: plugins.length - enabled,
  };
}
