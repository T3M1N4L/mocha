import { createSignal, onMount, For, createMemo } from "solid-js";
import {
  Package,
  CircleX,
  RotateCw,
  Save,
  Plus,
  Edit,
  Trash2,
  User,
  Globe,
} from "lucide-solid";
import { type CustomPlugin } from "../components/customPluginForm";
import toast from "solid-toast";
import { createSuccessToast, createErrorToast } from "../components/toast";
import type { PluginConfig } from "../lib/pluginTypes";

export default function Plugins() {
  const [plugins, setPlugins] = createSignal<PluginConfig[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [editingCustomPlugin, setEditingCustomPlugin] = createSignal<
    CustomPlugin | undefined
  >();

  // Custom plugin form fields
  const [customPluginName, setCustomPluginName] = createSignal("");
  const [customPluginDisplayName, setCustomPluginDisplayName] =
    createSignal("");
  const [customPluginDescription, setCustomPluginDescription] =
    createSignal("");
  const [customPluginDomains, setCustomPluginDomains] = createSignal("");
  const [customPluginCode, setCustomPluginCode] = createSignal("");

  let customPluginModal!: HTMLDialogElement;

  // Track pending changes (plugin name -> new enabled state or 'DELETE' for deletion)
  const [pendingChanges, setPendingChanges] = createSignal<
    Record<string, boolean | 'DELETE'>
  >({});

  // Check if there are any unsaved changes
  const hasChanges = createMemo(() => Object.keys(pendingChanges()).length > 0);

  // Separate default and custom plugins for display
  const defaultPlugins = createMemo(() =>
    plugins()
      .filter((p) => !p.functionFile.startsWith("__custom_"))
      .filter((p) => pendingChanges()[p.name] !== 'DELETE'),
  );

  const customPlugins = createMemo(() =>
    plugins()
      .filter((p) => p.functionFile.startsWith("__custom_"))
      .filter((p) => pendingChanges()[p.name] !== 'DELETE'),
  );

  // Get the effective state of a plugin (pending change or current state)
  const getEffectiveState = (plugin: PluginConfig) => {
    const pendingState = pendingChanges()[plugin.name];
    if (pendingState === 'DELETE') return false; // Deleted plugins appear disabled
    return pendingState !== undefined ? pendingState : plugin.enabled;
  };

  // Check if a plugin is marked for deletion
  const isMarkedForDeletion = (plugin: PluginConfig) => {
    return pendingChanges()[plugin.name] === 'DELETE';
  };

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const { loadPluginsConfig } = await import("../lib/refluxPlugins");
      const pluginConfigs = await loadPluginsConfig();
      setPlugins(pluginConfigs);
      console.log("[PluginsPage] Loaded plugins:", pluginConfigs.length);
      console.log("[PluginsPage] Custom plugins:", pluginConfigs.filter(p => p.functionFile.startsWith("__custom_")).length);
      console.log("[PluginsPage] Current pending changes:", Object.keys(pendingChanges()).length);
    } catch (error) {
      console.error("Failed to load plugins:", error);
      toast.custom(createErrorToast("Failed to load plugins"));
    } finally {
      setLoading(false);
    }
  };

  const refreshPlugins = async () => {
    console.log("[PluginsPage] Refreshing plugins...");
    try {
      setLoading(true);
      const { refreshPluginSystem } = await import("../lib/refluxPlugins");
      await refreshPluginSystem();
      await loadPlugins();

      toast.custom(createSuccessToast("Plugin system refreshed"));
    } catch (error) {
      console.error("[PluginsPage] Failed to refresh plugins:", error);
      toast.custom(createErrorToast("Failed to refresh plugins"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (pluginName: string) => {
    const plugin = plugins().find((p) => p.name === pluginName);
    if (!plugin) return;

    // Don't allow toggling plugins marked for deletion
    if (pendingChanges()[pluginName] === 'DELETE') return;

    const currentState =
      pendingChanges()[pluginName] !== undefined && pendingChanges()[pluginName] !== 'DELETE'
        ? pendingChanges()[pluginName] as boolean
        : plugin.enabled;

    const newState = !currentState;

    setPendingChanges((prev) => ({
      ...prev,
      [pluginName]: newState,
    }));
  };

  const saveChanges = async () => {
    if (!hasChanges()) return;

    try {
      setSaving(true);

      // First, reload plugins to ensure we have the latest state including new custom plugins
      const { loadPluginsConfig, removePlugin } = await import("../lib/refluxPlugins");
      const { deleteCustomPlugin } = await import("../lib/customPlugins");
      const freshPlugins = await loadPluginsConfig();

      // Handle deletions first - actually delete from localStorage AND remove from plugin system
      for (const [pluginName, pendingState] of Object.entries(pendingChanges())) {
        if (pendingState === 'DELETE') {
          const pluginToDelete = freshPlugins.find(p => p.name === pluginName);
          if (pluginToDelete && pluginToDelete.functionFile.startsWith("__custom_")) {
            const customPluginId = pluginToDelete.functionFile.replace("__custom_", "");
            console.log("[PluginsPage] Deleting custom plugin from localStorage:", pluginName, "ID:", customPluginId);
            deleteCustomPlugin(customPluginId);
            
            // Also remove from the plugin system
            try {
              console.log("[PluginsPage] Removing plugin from system:", pluginName);
              await removePlugin(pluginName);
            } catch (removeError) {
              console.warn("[PluginsPage] Failed to remove plugin from system (may not be loaded):", pluginName, removeError);
            }
          }
        }
      }

      // Handle custom plugin updates by removing and re-adding them to the system
      // This ensures code changes are applied
      for (const [pluginName, pendingState] of Object.entries(pendingChanges())) {
        if (pendingState !== 'DELETE') {
          const plugin = freshPlugins.find(p => p.name === pluginName);
          if (plugin && plugin.functionFile.startsWith("__custom_")) {
            try {
              console.log("[PluginsPage] Refreshing custom plugin in system:", pluginName);
              // Remove the old version first
              await removePlugin(pluginName);
            } catch (removeError) {
              console.warn("[PluginsPage] Plugin may not be loaded yet:", pluginName, removeError);
            }
          }
        }
      }

      // Reload plugins after deletions to get the updated list
      const updatedFreshPlugins = await loadPluginsConfig();

      // Apply pending enabled/disabled changes to the remaining plugins
      const updatedPlugins = updatedFreshPlugins.map((plugin) => {
        const pendingState = pendingChanges()[plugin.name];
        if (pendingState === 'DELETE') {
          // This plugin should have been deleted, skip it
          return null;
        }
        return pendingState !== undefined && typeof pendingState === 'boolean'
          ? { ...plugin, enabled: pendingState }
          : plugin;
      }).filter(Boolean) as PluginConfig[]; // Remove null entries

      // Save to localStorage
      const { savePluginsToLocalStorage } = await import("../lib/refluxPlugins");
      savePluginsToLocalStorage(updatedPlugins);

      // Show success message
      toast.custom(createSuccessToast("Plugin settings saved! Reloading page..."));

      // Wait a moment for the toast to show, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Failed to save plugin changes:", error);
      toast.custom(createErrorToast("Failed to save plugin settings"));
      setSaving(false);
    }
  };

  const discardChanges = async () => {
    setPendingChanges({});
    // Reload plugins to show the current state without pending changes
    await loadPlugins();
    toast.custom(createSuccessToast("Changes discarded"));
  };

  // Custom plugin management functions
  const openCreatePluginModal = () => {
    setEditingCustomPlugin(undefined);
    setCustomPluginName("");
    setCustomPluginDisplayName("");
    setCustomPluginDescription("");
    setCustomPluginDomains("");
    setCustomPluginCode("");
    customPluginModal.showModal();
  };

  const openEditPluginModal = async (plugin: PluginConfig) => {
    const customPlugin = await getCustomPluginForEdit(plugin);
    if (!customPlugin) return;

    setEditingCustomPlugin(customPlugin);
    setCustomPluginName(customPlugin.name);
    setCustomPluginDisplayName(customPlugin.displayName);
    setCustomPluginDescription(customPlugin.description);
    setCustomPluginDomains(customPlugin.domains.join(", "));
    setCustomPluginCode(customPlugin.jsCode);
    customPluginModal.showModal();
  };

    const saveCustomPlugin = async () => {
    const name = customPluginName().trim();
    const displayName = customPluginDisplayName().trim();
    const description = customPluginDescription().trim();
    const domainsText = customPluginDomains().trim();
    const jsCode = customPluginCode().trim();

    if (!name || !displayName || !description || !domainsText || !jsCode) {
      toast.custom(createErrorToast("Please fill in all fields"));
      return;
    }

    const domains = domainsText
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    try {
      const pluginData = {
        name,
        displayName,
        description,
        domains,
        jsCode,
        enabled: false,
      };

      if (editingCustomPlugin()) {
        // Update the custom plugin
        const { updateCustomPlugin } = await import("../lib/customPlugins");
        updateCustomPlugin(editingCustomPlugin()!.id, pluginData);
        
        // Add to pending changes to trigger the "Save & Reload" workflow
        const currentPlugin = plugins().find(p => p.name === name);
        if (currentPlugin) {
          setPendingChanges((prev) => ({
            ...prev,
            [name]: currentPlugin.enabled, // Keep current enabled state as pending
          }));
        }

        toast.custom(createSuccessToast("Plugin updated! Click \"Save & Reload\" to apply changes."));

        customPluginModal.close();
        loadPlugins(); // Refresh to show updated plugin data
      } else {
        // Create new custom plugin
        const { createCustomPlugin } = await import("../lib/customPlugins");
        createCustomPlugin(pluginData);
        
        // Add new plugin to pending changes so it shows "Save & Reload" is needed
        setPendingChanges((prev) => ({
          ...prev,
          [name]: false, // New plugins start disabled and need Save & Reload to apply
        }));

        toast.custom(createSuccessToast("Custom plugin created! Click \"Save & Reload\" to apply."));

        customPluginModal.close();
        loadPlugins(); // Refresh the plugins list to show new plugin
      }
    } catch (error: any) {
      toast.custom(createErrorToast(error.message || "Failed to save plugin"));
    }
  };

  const handleDeleteCustomPlugin = async (plugin: PluginConfig) => {
    if (!plugin.functionFile.startsWith("__custom_")) return;

    // If already marked for deletion, restore it
    if (isMarkedForDeletion(plugin)) {
      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[plugin.name];
        return updated;
      });
      console.log("[PluginsPage] Plugin restored:", plugin.name);
      toast.custom(createSuccessToast("Plugin restored!"));
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete the plugin "${plugin.displayName}"? This action cannot be undone.`,
    );

    if (confirmed) {
      // Mark plugin for deletion in pending changes
      setPendingChanges((prev) => ({
        ...prev,
        [plugin.name]: 'DELETE',
      }));

      console.log("[PluginsPage] Plugin marked for deletion:", plugin.name, "Click 'Save & Reload' to apply");
      toast.custom(createSuccessToast("Plugin marked for deletion! Click \"Save & Reload\" to apply changes."));
    }
  };

  const getCustomPluginForEdit = async (
    plugin: PluginConfig,
  ): Promise<CustomPlugin | undefined> => {
    if (!plugin.functionFile.startsWith("__custom_")) return undefined;

    const customPluginId = plugin.functionFile.replace("__custom_", "");
    const { loadCustomPlugins } = await import("../lib/customPlugins");
    const customPlugins = loadCustomPlugins();
    return customPlugins.find((cp: CustomPlugin) => cp.id === customPluginId);
  };

  onMount(() => {
    loadPlugins();
  });

  const getSitesList = (sites: string[] | ["*"]) => {
    if (sites.includes("*")) {
      return "All sites";
    }
    if (sites.length > 3) {
      return `${sites.slice(0, 3).join(", ")} and ${sites.length - 3} more`;
    }
    return sites.join(", ");
  };

  return (
    <div class="container mx-auto max-w-4xl p-6 overflow-x-hidden">
      <div class="mb-8 overflow-x-hidden">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <Package class="h-8 w-8 text-primary" />
            <h1 class="text-4xl font-bold">Plugins</h1>
          </div>
          <div class="flex items-center gap-2">
            {hasChanges() && (
              <>
                <button
                  class="btn btn-outline btn-sm"
                  onClick={discardChanges}
                  disabled={saving()}
                >
                  <CircleX class="h-4 w-4" />
                  Discard
                </button>
                <button
                  class="btn btn-primary btn-sm"
                  onClick={saveChanges}
                  disabled={saving()}
                >
                  {saving() ? (
                    <div class="loading loading-spinner loading-xs"></div>
                  ) : (
                    <Save class="h-4 w-4" />
                  )}
                  {saving() ? "Saving..." : "Save & Reload"}
                </button>
              </>
            )}
            <button
              class="btn btn-outline btn-sm"
              onClick={refreshPlugins}
              disabled={loading() || saving()}
            >
              <RotateCw class={`h-4 w-4 ${loading() ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        <p class="text-base-content/70 text-lg">
          Manage your plugins. Make changes and click "Save & Reload" to apply
          them.
          {hasChanges() && (
            <span class="text-warning ml-2 font-semibold">
              • You have unsaved changes
            </span>
          )}
        </p>
      </div>

      {/* Plugin Lists */}
      <div class="space-y-8">
        {loading() ? (
          <div class="flex items-center justify-center py-12">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-4 text-lg">Loading plugins...</span>
          </div>
        ) : (
          <>
            {/* Default Plugins Section */}
            {defaultPlugins().length > 0 && (
              <div>
                <div class="flex items-center gap-2 mb-4">
                  <Globe class="h-5 w-5 text-info" />
                  <h2 class="text-xl font-semibold">Default Plugins</h2>
                  <div class="badge badge-ghost">{defaultPlugins().length}</div>
                </div>
                <div class="grid gap-4">
                  <For each={defaultPlugins()}>
                    {(plugin) => (
                      <div class="card bg-base-200 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
                        <div class="card-body overflow-x-hidden">
                          <div class="flex items-center justify-between">
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center gap-3 mb-2">
                                <h3 class="text-xl font-semibold">
                                  {plugin.displayName}
                                </h3>
                                <div
                                  class={`badge ${getEffectiveState(plugin) ? "badge-success" : "badge-ghost"}`}
                                >
                                  {getEffectiveState(plugin)
                                    ? "Enabled"
                                    : "Disabled"}
                                  {pendingChanges()[plugin.name] !==
                                    undefined && (
                                    <span class="ml-1 text-xs opacity-75">
                                      (pending)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p class="text-base-content/70 mb-3">
                                {plugin.description}
                              </p>
                              <div class="flex flex-wrap gap-2 text-sm">
                                <span class="text-base-content/50">Sites:</span>
                                <span class="font-mono text-xs bg-base-300 px-2 py-1 rounded break-all">
                                  {getSitesList(plugin.sites)}
                                </span>
                              </div>
                            </div>
                            <div class="flex items-center gap-4 ml-6">
                              <input
                                type="checkbox"
                                class="toggle toggle-primary"
                                checked={getEffectiveState(plugin)}
                                disabled={loading() || saving()}
                                onChange={() => handleToggle(plugin.name)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}

            {/* Custom Plugins Section */}
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <User class="h-5 w-5 text-secondary" />
                  <h2 class="text-xl font-semibold">Custom Plugins</h2>
                  <div class="badge badge-secondary">
                    {customPlugins().length}
                  </div>
                </div>
                <button
                  class="btn btn-secondary btn-sm"
                  onClick={openCreatePluginModal}
                  disabled={loading() || saving()}
                >
                  <Plus class="h-4 w-4" />
                  Create Custom Plugin
                </button>
              </div>
              {customPlugins().length > 0 && (
                <div class="grid gap-4">
                  <For each={customPlugins()}>
                    {(plugin) => (
                      <div class="card bg-base-200 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
                        <div class="card-body overflow-x-hidden">
                          <div class="flex items-center justify-between">
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center gap-3 mb-2">
                                <h3 class={`text-xl font-semibold ${isMarkedForDeletion(plugin) ? 'line-through opacity-50' : ''}`}>
                                  {plugin.displayName}
                                </h3>
                                <div
                                  class={`badge ${
                                    isMarkedForDeletion(plugin) 
                                      ? "badge-error" 
                                      : getEffectiveState(plugin) 
                                        ? "badge-success" 
                                        : "badge-ghost"
                                  }`}
                                >
                                  {isMarkedForDeletion(plugin)
                                    ? "Delete"
                                    : getEffectiveState(plugin)
                                    ? "Enabled"
                                    : "Disabled"}
                                  {pendingChanges()[plugin.name] !==
                                    undefined && (
                                    <span class="ml-1 text-xs opacity-75">
                                      (pending)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p class={`text-base-content/70 mb-3 ${isMarkedForDeletion(plugin) ? 'opacity-50' : ''}`}>
                                {plugin.description}
                              </p>
                              <div class="flex flex-wrap gap-2 text-sm">
                                <span class="text-base-content/50">Sites:</span>
                                <span class="font-mono text-xs bg-base-300 px-2 py-1 rounded break-words">
                                  {getSitesList(plugin.sites)}
                                </span>
                              </div>
                            </div>
                            <div class="flex items-center gap-2 ml-6">
                              <button
                                class="btn btn-ghost btn-sm opacity-60 hover:opacity-100"
                                onClick={() => openEditPluginModal(plugin)}
                                disabled={loading() || saving() || isMarkedForDeletion(plugin)}
                                title={isMarkedForDeletion(plugin) ? "Cannot edit plugin marked for deletion" : "Edit plugin"}
                              >
                                <Edit class="h-4 w-4 stroke-2" />
                              </button>
                              <button
                                class={`btn btn-ghost btn-sm opacity-60 hover:opacity-100 ${isMarkedForDeletion(plugin) ? 'text-success' : 'text-error'}`}
                                onClick={() => handleDeleteCustomPlugin(plugin)}
                                disabled={loading() || saving()}
                                title={isMarkedForDeletion(plugin) ? "Restore plugin" : "Delete plugin"}
                              >
                                <Trash2 class="h-4 w-4 stroke-2" />
                              </button>
                              <input
                                type="checkbox"
                                class="toggle toggle-primary"
                                checked={getEffectiveState(plugin)}
                                disabled={loading() || saving() || isMarkedForDeletion(plugin)}
                                onChange={() => handleToggle(plugin.name)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Empty State */}
      {!loading() && plugins().length === 0 && (
        <div class="text-center py-12">
          <Package class="h-16 w-16 text-base-content/30 mx-auto mb-4" />
          <h3 class="text-xl font-semibold mb-2">No plugins found</h3>
          <p class="text-base-content/70 mb-4">
            No plugins are configured. You can create custom plugins or check
            your plugins.json file.
          </p>
          <button class="btn btn-secondary" onClick={openCreatePluginModal}>
            <Plus class="h-4 w-4" />
            Create Your First Custom Plugin
          </button>
        </div>
      )}

      {/* Plugin Configuration Info */}
      <div class="mt-8 p-4 bg-base-300 rounded-box">
        <h4 class="font-semibold mb-2">Plugin Configuration</h4>
        <div class="text-sm text-base-content/70 space-y-1">
          <p>
            <strong>Default plugins</strong> are loaded from{" "}
            <code class="bg-base-100 px-1 py-0.5 rounded">
              public/plugins.json
            </code>{" "}
            and their JavaScript files.
          </p>
          <p>
            <strong>Custom plugins</strong> are created and stored locally in
            your browser.
          </p>
          <p>
            Changes to plugin states are saved locally and will persist across
            browser sessions.
          </p>
        </div>
      </div>

      {/* Custom Plugin Modal */}
      <dialog class="modal" ref={customPluginModal!}>
        <div class="modal-box max-w-4xl max-h-[90vh] w-11/12">
          <h3 class="text-lg font-bold mb-4">
            {editingCustomPlugin()
              ? "Edit Custom Plugin"
              : "Create Custom Plugin"}
          </h3>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Name (internal ID)</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="my-custom-plugin"
                  value={customPluginName()}
                  onInput={(e) => setCustomPluginName(e.currentTarget.value)}
                  disabled={!!editingCustomPlugin()}
                />
                <label class="label">
                  <span class="label-text-alt">Lowercase, no spaces</span>
                </label>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Display Name</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="My Custom Plugin"
                  value={customPluginDisplayName()}
                  onInput={(e) =>
                    setCustomPluginDisplayName(e.currentTarget.value)
                  }
                />
              </div>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Description</span>
              </label>
              <textarea
                class="textarea textarea-bordered resize-none"
                placeholder="What does this plugin do?"
                rows={2}
                value={customPluginDescription()}
                onInput={(e) =>
                  setCustomPluginDescription(e.currentTarget.value)
                }
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Sites to run on</span>
              </label>
              <input
                type="text"
                class="input input-bordered w-full"
                placeholder="example.com, *.google.com, * (for all sites)"
                value={customPluginDomains()}
                onInput={(e) => setCustomPluginDomains(e.currentTarget.value)}
              />
              <label class="label">
                <span class="label-text-alt">
                  Comma-separated list. Use "*" for all sites
                </span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">JavaScript Code</span>
              </label>
              <textarea
                class="textarea textarea-bordered font-mono text-sm resize-none overflow-x-auto"
                placeholder={`// Your plugin code here
// The 'body' variable contains the page HTML
// Return the modified HTML

if (body.includes("<head>")) {
  const customScript = '<script>console.log("My custom plugin!");</script>';
  return body.replace("<head>", "<head>" + customScript);
}
return body;`}
                rows={12}
                value={customPluginCode()}
                onInput={(e) => setCustomPluginCode(e.currentTarget.value)}
              />
              <label class="label">
                <span class="label-text-alt">
                  JavaScript code that modifies page HTML
                </span>
              </label>
            </div>
          </div>

          <div class="modal-action flex gap-2">
            <button class="btn" onClick={() => customPluginModal.close()}>
              Cancel
            </button>
            <button class="btn btn-primary" onClick={saveCustomPlugin}>
              {editingCustomPlugin() ? "Update Plugin" : "Create Plugin"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
