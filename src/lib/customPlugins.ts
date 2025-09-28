// Custom Plugin Storage Manager
// Handles saving, loading, and managing user-created custom plugins
// NEW UNIFIED APPROACH: Single localStorage key for all plugin data

import type { CustomPlugin } from "../components/customPluginForm";
import type { PluginConfig } from "./pluginTypes";

const UNIFIED_PLUGINS_STORAGE_KEY = "mocha-plugins";

export type CustomPluginData = CustomPlugin;

// Generate a unique ID for new plugins
function generatePluginId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Unified plugin storage structure
interface UnifiedPluginStorage {
  version: number;
  timestamp: number;
  defaultPlugins: PluginConfig[];
  customPlugins: CustomPlugin[];
}

// Save unified plugin data to localStorage
export function saveUnifiedPlugins(defaultPlugins: PluginConfig[], customPlugins: CustomPlugin[]): void {
  try {
    const dataToSave: UnifiedPluginStorage = {
      version: 1,
      timestamp: Date.now(),
      defaultPlugins,
      customPlugins,
    };
    localStorage.setItem(UNIFIED_PLUGINS_STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error("Failed to save plugin configuration");
    throw new Error("Failed to save plugin configuration");
  }
}

// Load unified plugin data from localStorage
export function loadUnifiedPlugins(): UnifiedPluginStorage | null {
  try {
    const stored = localStorage.getItem(UNIFIED_PLUGINS_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored) as UnifiedPluginStorage;
    
    // Validate structure
    if (!data.defaultPlugins || !Array.isArray(data.defaultPlugins)) {
      return null;
    }
    if (!data.customPlugins || !Array.isArray(data.customPlugins)) {
      return null;
    }
    
    return data;
  } catch (error) {
    // Clear corrupted data
    try {
      localStorage.removeItem(UNIFIED_PLUGINS_STORAGE_KEY);
    } catch (clearError) {
      // Ignore cleanup errors
    }
    return null;
  }
}

// Get initial default plugins from JSON file
export async function loadDefaultPluginsFromJSON(): Promise<PluginConfig[]> {
  try {
    const response = await fetch("/plugins/plugins.json");
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.plugins || [];
  } catch (error) {
    return [];
  }
}

// Convert custom plugin to PluginConfig format
export function customPluginToPluginConfig(customPlugin: CustomPlugin): PluginConfig {
  let processedCode = customPlugin.jsCode;
  
  // Process code based on plugin type
  if (customPlugin.type === "userscript") {
    processedCode = `
if (body.includes('<head>')) {
  const customTamper = \`<script>
${customPlugin.jsCode.replace(/`/g, '\\`')}
  </script>\`;
  return body.replace('<head>', '<head>' + customTamper);
}
return body;
`;
  } else if (customPlugin.type === "userstyle") {
    processedCode = `
if (body.includes('<head>')) {
  const customStyle = \`<style>
${customPlugin.jsCode.replace(/`/g, '\\`')}
  </style>\`;
  return body.replace('<head>', '<head>' + customStyle);
}
return body;
`;
  } else {
    // For html-modifier, use the code as-is
    processedCode = customPlugin.jsCode;
  }

  const config: PluginConfig = {
    name: customPlugin.name,
    displayName: customPlugin.displayName,
    description: customPlugin.description,
    sites: customPlugin.domains.includes("*") ? ["*"] : customPlugin.domains,
    enabled: customPlugin.enabled,
    functionFile: `__custom_${customPlugin.id}`,
    _customCode: processedCode,
    _customType: customPlugin.type,
    _customId: customPlugin.id,
  };

  return config;
}

// Get all plugins (unified approach)
export async function getAllPluginsUnified(): Promise<PluginConfig[]> {
  const stored = loadUnifiedPlugins();
  
  if (stored) {
    // Convert custom plugins to PluginConfig format and merge with default plugins
    const customPluginConfigs = stored.customPlugins.map(customPluginToPluginConfig);
    const allPlugins = [...stored.defaultPlugins, ...customPluginConfigs];
    return allPlugins;
  }

  // First time - load from JSON and initialize unified storage
  const defaultPlugins = await loadDefaultPluginsFromJSON();
  const customPlugins: CustomPlugin[] = [];
  
  // Save initial state
  saveUnifiedPlugins(defaultPlugins, customPlugins);
  
  return defaultPlugins;
}

// Create a new custom plugin
export function createCustomPlugin(pluginData: Omit<CustomPlugin, "id" | "created" | "updated">): CustomPlugin {
  const stored = loadUnifiedPlugins();
  const defaultPlugins = stored?.defaultPlugins || [];
  const existingCustomPlugins = stored?.customPlugins || [];

  // Check for name conflicts
  const nameExists = [
    ...defaultPlugins.map(p => p.name),
    ...existingCustomPlugins.map(p => p.name)
  ].includes(pluginData.name);
  
  if (nameExists) {
    throw new Error(`A plugin with the name "${pluginData.name}" already exists`);
  }

  const now = Date.now();
  const newPlugin: CustomPlugin = {
    ...pluginData,
    id: generatePluginId(),
    created: now,
    updated: now,
    type: pluginData.type || "html-modifier",
  };

  const updatedCustomPlugins = [...existingCustomPlugins, newPlugin];
  saveUnifiedPlugins(defaultPlugins, updatedCustomPlugins);

  return newPlugin;
}

// Update an existing custom plugin
export function updateCustomPlugin(id: string, updates: Partial<Omit<CustomPlugin, "id" | "created">>): CustomPlugin {
  const stored = loadUnifiedPlugins();
  if (!stored) {
    throw new Error("No plugin data found");
  }

  const defaultPlugins = [...stored.defaultPlugins];
  const customPlugins = [...stored.customPlugins];
  const pluginIndex = customPlugins.findIndex(p => p.id === id);

  if (pluginIndex === -1) {
    throw new Error(`Custom plugin with ID "${id}" not found`);
  }

  const existingPlugin = customPlugins[pluginIndex];

  // Check for name conflicts if name is being changed
  if (updates.name && updates.name !== existingPlugin.name) {
    const nameExists = [
      ...defaultPlugins.map(p => p.name),
      ...customPlugins.filter(p => p.id !== id).map(p => p.name)
    ].includes(updates.name);
    
    if (nameExists) {
      throw new Error(`A plugin with the name "${updates.name}" already exists`);
    }
  }

  const updatedPlugin: CustomPlugin = {
    ...existingPlugin,
    ...updates,
    id, // Ensure ID stays the same
    created: existingPlugin.created, // Preserve original creation time
    updated: Date.now(),
  };

  customPlugins[pluginIndex] = updatedPlugin;
  saveUnifiedPlugins(defaultPlugins, customPlugins);

  return updatedPlugin;
}

// Delete a custom plugin
export function deleteCustomPlugin(id: string): boolean {
  const stored = loadUnifiedPlugins();
  if (!stored) {
    return false;
  }

  const defaultPlugins = stored.defaultPlugins;
  const customPlugins = [...stored.customPlugins];
  const pluginIndex = customPlugins.findIndex(p => p.id === id);

  if (pluginIndex === -1) {
    return false;
  }

  customPlugins.splice(pluginIndex, 1);
  saveUnifiedPlugins(defaultPlugins, customPlugins);

  return true;
}

// Get a single custom plugin by ID
export function getCustomPlugin(id: string): CustomPlugin | undefined {
  const stored = loadUnifiedPlugins();
  if (!stored) return undefined;
  
  return stored.customPlugins.find(p => p.id === id);
}

// Update plugin enabled states (for both default and custom plugins)
export function updatePluginStates(pluginStates: Record<string, boolean>): void {
  const stored = loadUnifiedPlugins();
  if (!stored) {
    return;
  }

  const defaultPlugins = [...stored.defaultPlugins];
  const customPlugins = [...stored.customPlugins];

  // Update default plugin states
  defaultPlugins.forEach(plugin => {
    if (pluginStates[plugin.name] !== undefined) {
      plugin.enabled = pluginStates[plugin.name];
    }
  });

  // Update custom plugin states
  customPlugins.forEach(plugin => {
    if (pluginStates[plugin.name] !== undefined) {
      plugin.enabled = pluginStates[plugin.name];
    }
  });

  saveUnifiedPlugins(defaultPlugins, customPlugins);
}

// Process batch changes from the pending changes system
export function processPendingChanges(pendingChanges: Record<string, boolean | 'DELETE' | CustomPlugin>): void {
  const stored = loadUnifiedPlugins();
  if (!stored) {
    throw new Error("No plugin data found");
  }

  let defaultPlugins = [...stored.defaultPlugins];
  let customPlugins = [...stored.customPlugins];

  // Validate storage before processing
  const validation = validateStorageIntegrity();
  if (!validation.valid) {
    throw new Error("Storage integrity check failed");
  }

  // Process all pending changes
  for (const [pluginName, pendingState] of Object.entries(pendingChanges)) {
    if (pendingState === 'DELETE') {
      // Delete custom plugin
      const customPlugin = customPlugins.find(p => p.name === pluginName);
      if (customPlugin) {
        customPlugins = customPlugins.filter(p => p.id !== customPlugin.id);
      }
    } else if (typeof pendingState === 'object') {
      // Plugin edit or creation (CustomPlugin object)
      const customPlugin = pendingState as CustomPlugin;
      
      // Validate the custom plugin object
      if (!customPlugin.id || !customPlugin.name || !customPlugin.type) {
        throw new Error(`Invalid custom plugin data for "${pluginName}"`);
      }
      
      const existingCustomPluginIndex = customPlugins.findIndex(p => p.id === customPlugin.id);
      
      if (existingCustomPluginIndex !== -1) {
        // Update existing custom plugin
        customPlugins[existingCustomPluginIndex] = { ...customPlugin };
      } else {
        // Create new custom plugin
        customPlugins.push({ ...customPlugin });
      }
    } else if (typeof pendingState === 'boolean') {
      // Update enabled state
      // Check default plugins first
      const defaultPlugin = defaultPlugins.find(p => p.name === pluginName);
      if (defaultPlugin) {
        defaultPlugin.enabled = pendingState;
      }
      
      // Check custom plugins
      const customPlugin = customPlugins.find(p => p.name === pluginName);
      if (customPlugin) {
        customPlugin.enabled = pendingState;
      }
    }
  }

  // Save unified data
  saveUnifiedPlugins(defaultPlugins, customPlugins);
  
  // Validate after save
  const postValidation = validateStorageIntegrity();
  if (!postValidation.valid) {
    throw new Error("Storage became corrupted after saving changes");
  }
}

// Clear all plugin data (reset)
export function clearAllPlugins(): void {
  localStorage.removeItem(UNIFIED_PLUGINS_STORAGE_KEY);
}

// Get plugin statistics
export function getPluginStats(): { total: number; enabled: number; disabled: number; custom: number; default: number } {
  const stored = loadUnifiedPlugins();
  if (!stored) {
    return { total: 0, enabled: 0, disabled: 0, custom: 0, default: 0 };
  }

  const allPlugins = [...stored.defaultPlugins, ...stored.customPlugins];
  const enabled = allPlugins.filter(p => p.enabled).length;
  
  return {
    total: allPlugins.length,
    enabled,
    disabled: allPlugins.length - enabled,
    custom: stored.customPlugins.length,
    default: stored.defaultPlugins.length,
  };
}

// Validate localStorage integrity
export function validateStorageIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const stored = loadUnifiedPlugins();
    if (!stored) {
      return { valid: true, errors: [] }; // Empty storage is valid
    }
    
    // Check structure
    if (!stored.version || typeof stored.version !== 'number') {
      errors.push("Invalid or missing version");
    }
    
    if (!stored.timestamp || typeof stored.timestamp !== 'number') {
      errors.push("Invalid or missing timestamp");
    }
    
    if (!Array.isArray(stored.defaultPlugins)) {
      errors.push("defaultPlugins is not an array");
    }
    
    if (!Array.isArray(stored.customPlugins)) {
      errors.push("customPlugins is not an array");
    }
    
    // Check custom plugin integrity
    stored.customPlugins?.forEach((plugin: CustomPlugin, index: number) => {
      if (!plugin.id || typeof plugin.id !== 'string') {
        errors.push(`Custom plugin ${index} missing or invalid ID`);
      }
      if (!plugin.name || typeof plugin.name !== 'string') {
        errors.push(`Custom plugin ${index} missing or invalid name`);
      }
      if (!plugin.type || !['html-modifier', 'userscript', 'userstyle'].includes(plugin.type)) {
        errors.push(`Custom plugin ${index} invalid type: ${plugin.type}`);
      }
      if (!Array.isArray(plugin.domains)) {
        errors.push(`Custom plugin ${index} domains is not an array`);
      }
    });
    
    // Check for duplicate names
    const allNames = [
      ...(stored.defaultPlugins?.map((p: PluginConfig) => p.name) || []),
      ...(stored.customPlugins?.map((p: CustomPlugin) => p.name) || [])
    ];
    const duplicates = allNames.filter((name, index) => allNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate plugin names found: ${duplicates.join(', ')}`);
    }
    
    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Storage validation error: ${error}`);
    return { valid: false, errors };
  }
}

// Legacy compatibility exports (for gradual migration)
export const loadCustomPlugins = () => {
  const stored = loadUnifiedPlugins();
  return stored?.customPlugins || [];
};

export const saveCustomPlugins = (plugins: CustomPlugin[]) => {
  const stored = loadUnifiedPlugins();
  const defaultPlugins = stored?.defaultPlugins || [];
  saveUnifiedPlugins(defaultPlugins, plugins);
};

export { getAllPluginsUnified as getAllPluginsConfig };
