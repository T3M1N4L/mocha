// Shared types for plugin system to avoid circular dependencies

export type PluginDefinition = {
  function: string;
  name: string;
  sites: string[] | ["*"];
};

export type PluginConfig = {
  name: string;
  displayName: string;
  description: string;
  sites: string[] | ["*"];
  enabled: boolean;
  functionFile: string;
  _customCode?: string; // For custom plugins
  _customType?: "html-modifier" | "userscript" | "userstyle"; // Original custom plugin type
  _customId?: string; // Original custom plugin ID
};