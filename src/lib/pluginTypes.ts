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
};