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
  const [customPluginDisplayName, setCustomPluginDisplayName] = createSignal("");
  const [customPluginDescription, setCustomPluginDescription] = createSignal("");
  const [customPluginDomains, setCustomPluginDomains] = createSignal("");
  const [customPluginCode, setCustomPluginCode] = createSignal("");
  const [customPluginType, setCustomPluginType] = createSignal<"html-modifier" | "userscript" | "userstyle">("html-modifier");

  let customPluginModal!: HTMLDialogElement;

  // Track pending changes (plugin name -> new enabled state, 'DELETE' for deletion, or plugin data for edits)
  const [pendingChanges, setPendingChanges] = createSignal<
    Record<string, boolean | 'DELETE' | CustomPlugin>
  >({});

  // Check if there are any unsaved changes
  const hasChanges = createMemo(() => Object.keys(pendingChanges()).length > 0);

  // Separate default and custom plugins for display
  const defaultPlugins = createMemo(() =>
    plugins()
      .filter((p) => !p.functionFile.startsWith("__custom_"))
      .filter((p) => pendingChanges()[p.name] !== 'DELETE'),
  );

  const customPlugins = createMemo(() => {
    // Start with existing custom plugins
    const existing = plugins()
      .filter((p) => p.functionFile.startsWith("__custom_"))
      .filter((p) => pendingChanges()[p.name] !== 'DELETE');

    // Add pending new plugins (those that are CustomPlugin objects but not yet in the plugins list)
    const pendingNewPlugins = Object.entries(pendingChanges())
      .filter(([, change]) => typeof change === 'object' && change !== null && 'id' in change)
      .map(([, change]) => change as CustomPlugin)
      .filter((pendingPlugin) => 
        // Only include if it's not already in the existing plugins list
        !existing.find(p => p._customId === pendingPlugin.id)
      )
      .map((pendingPlugin) => ({
        name: pendingPlugin.name,
        displayName: pendingPlugin.displayName,
        description: pendingPlugin.description,
        sites: pendingPlugin.domains.includes("*") ? ["*"] : pendingPlugin.domains,
        enabled: pendingPlugin.enabled,
        functionFile: `__custom_${pendingPlugin.id}`,
        _customCode: "",
        _customType: pendingPlugin.type,
        _customId: pendingPlugin.id,
      } as PluginConfig));

    return [...existing, ...pendingNewPlugins];
  });

  // Get the effective state of a plugin (pending change or current state)
  const getEffectiveState = (plugin: PluginConfig) => {
    const pendingState = pendingChanges()[plugin.name];
    if (pendingState === 'DELETE') return false; // Deleted plugins appear disabled
    if (typeof pendingState === 'object') return pendingState.enabled; // Plugin edit with enabled state
    return pendingState !== undefined ? pendingState : plugin.enabled;
  };

  // Check if a plugin is marked for deletion
  const isMarkedForDeletion = (plugin: PluginConfig) => {
    return pendingChanges()[plugin.name] === 'DELETE';
  };

  // Check if a plugin has pending edits
  const hasPendingEdits = (plugin: PluginConfig) => {
    const pendingState = pendingChanges()[plugin.name];
    return typeof pendingState === 'object';
  };

  // Get effective display data for a plugin (pending edits or current data)
  const getEffectiveDisplayData = (plugin: PluginConfig) => {
    const pendingState = pendingChanges()[plugin.name];
    if (typeof pendingState === 'object') {
      return {
        displayName: pendingState.displayName,
        description: pendingState.description,
        sites: pendingState.domains.includes("*") ? ["*"] : pendingState.domains,
      };
    }
    return {
      displayName: plugin.displayName,
      description: plugin.description,
      sites: plugin.sites,
    };
  };

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const { getAllPluginsUnified } = await import("../lib/customPlugins");
      const pluginConfigs = await getAllPluginsUnified();
      setPlugins(pluginConfigs);
    } catch (error) {
      console.error("Failed to load plugins:", error);
      toast.custom(createErrorToast("Failed to load plugins"));
    } finally {
      setLoading(false);
    }
  };

  const refreshPlugins = async () => {
    try {
      setLoading(true);
      await loadPlugins();
      toast.custom(createSuccessToast("Plugin system refreshed"));
    } catch (error) {
      console.error("Failed to refresh plugins:", error);
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

    const currentState = getEffectiveState(plugin);
    const newState = !currentState;

    // If there's already a pending plugin edit, update its enabled state
    const existingPendingChange = pendingChanges()[pluginName];
    if (typeof existingPendingChange === 'object') {
      setPendingChanges((prev) => ({
        ...prev,
        [pluginName]: { ...existingPendingChange, enabled: newState },
      }));
    } else {
      // Use pending changes system for ALL plugins (default and custom)
      setPendingChanges((prev) => ({
        ...prev,
        [pluginName]: newState,
      }));
    }
  };

  const saveChanges = async () => {
    if (!hasChanges()) return;

    try {
      setSaving(true);
      console.log("=== Starting Plugin Cache Clearing & Save Process ===");

      const { processPendingChanges } = await import("../lib/customPlugins");

      // Process all pending changes using the new unified function
      processPendingChanges(pendingChanges());

      // Clear pending changes
      setPendingChanges({});

      console.log("1. Forcing comprehensive plugin system reset...");
      
      // Enhanced plugin cache clearing with fallbacks
      try {
        const { forceResetPluginSystem } = await import("../lib/refluxPlugins");
        
        // Check if debugging functions are available on window (for comprehensive clearing)
        if (typeof (window as any).forceResetPluginSystem === 'function') {
          await (window as any).forceResetPluginSystem();
          console.log("✅ Window-level plugin system reset completed");
        } else {
          console.log("⚠️ Window forceResetPluginSystem not available, using module function...");
        }
        
        // Always call the module-level reset as well
        await forceResetPluginSystem();
        console.log("✅ Module-level plugin system reset completed");
        
        // Try alternative reset methods if available
        if (typeof (window as any).refreshPluginSystem === 'function') {
          await (window as any).refreshPluginSystem();
          console.log("✅ Plugin system refresh completed");
        }
        
      } catch (resetError) {
        console.error("❌ Plugin system reset failed:", resetError);
        // Continue with page reload even if reset fails
      }

      console.log("2. Checking current plugin state...");
      try {
        // Check plugin state if debugging functions are available
        if (typeof (window as any).listPlugins === 'function') {
          const plugins = await (window as any).listPlugins();
          console.log("Current plugins:", plugins);
        }
      } catch (listError) {
        console.log("Could not list current plugins:", listError);
      }

      console.log("3. Cache clearing completed. Reloading page...");

      // Show success message and reload
      toast.custom(createSuccessToast("Changes saved! Reloading page..."));

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

  // Manual cache clearing function for debugging (exposed to window)
  const clearPluginCacheManual = async () => {
    console.log("=== Manual Plugin Cache Clearing ===");
    
    try {
      console.log("1. Forcing plugin system reset...");
      
      const { forceResetPluginSystem } = await import("../lib/refluxPlugins");
      
      // Check if debugging functions are available on window
      if (typeof (window as any).forceResetPluginSystem === 'function') {
        await (window as any).forceResetPluginSystem();
        console.log("✅ Window-level plugin system reset completed");
      } else {
        console.log("⚠️ Window forceResetPluginSystem not available, trying alternative...");
        
        if (typeof (window as any).refreshPluginSystem === 'function') {
          await (window as any).refreshPluginSystem();
          console.log("✅ Plugin system refresh completed");
        } else {
          console.log("❌ No window-level plugin reset functions available");
        }
      }
      
      // Always call module-level reset
      await forceResetPluginSystem();
      console.log("✅ Module-level plugin system reset completed");
      
      console.log("2. Checking current plugin state...");
      if (typeof (window as any).listPlugins === 'function') {
        const plugins = await (window as any).listPlugins();
        console.log("Current plugins:", plugins);
      }
      
      console.log("3. Manual cache clearing completed. Try visiting the test page now.");
      
    } catch (error) {
      console.error("❌ Manual cache clearing failed:", error);
    }
  };

  // Custom plugin management functions
  const openCreatePluginModal = () => {
    setEditingCustomPlugin(undefined);
    setCustomPluginName("");
    setCustomPluginDisplayName("");
    setCustomPluginDescription("");
    setCustomPluginDomains("");
    setCustomPluginCode("");
    setCustomPluginType("html-modifier");
    customPluginModal.showModal();
  };

  const openEditPluginModal = async (plugin: PluginConfig) => {
    if (!plugin.functionFile.startsWith("__custom_")) return;

    const customPluginId = plugin.functionFile.replace("__custom_", "");
    const { getCustomPlugin } = await import("../lib/customPlugins");
    const customPlugin = getCustomPlugin(customPluginId);
    
    if (!customPlugin) {
      toast.custom(createErrorToast("Custom plugin data not found"));
      return;
    }

    setEditingCustomPlugin(customPlugin);
    setCustomPluginName(customPlugin.name);
    setCustomPluginDisplayName(customPlugin.displayName);
    setCustomPluginDescription(customPlugin.description);
    setCustomPluginDomains(customPlugin.domains.join(", "));
    setCustomPluginCode(customPlugin.jsCode);
    setCustomPluginType(customPlugin.type || "html-modifier");
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
      .map((d: string) => d.trim())
      .filter((d: string) => d.length > 0);

    try {
      if (editingCustomPlugin()) {
        // Don't check for name conflicts if the name hasn't changed
        if (name !== editingCustomPlugin()!.name) {
          // Check for name conflicts with existing plugins
          const existingPlugin = plugins().find((p) => p.name === name);
          if (existingPlugin) {
            toast.custom(createErrorToast(`A plugin with the name "${name}" already exists`));
            return;
          }
        }

        // For editing, create the complete updated plugin data
        const updatedPluginData = {
          name,
          displayName,
          description,
          domains,
          jsCode,
          enabled: editingCustomPlugin()!.enabled, // Preserve current enabled state
          type: customPluginType(),
          id: editingCustomPlugin()!.id, // Keep original ID
          created: editingCustomPlugin()!.created, // Keep original created timestamp
          updated: Date.now(), // Update the timestamp
        };

        // If the name changed, we need to handle the key change properly
        const originalName = editingCustomPlugin()!.name;
        
        // Remove the old pending change if the name changed
        if (originalName !== name) {
          setPendingChanges((prev) => {
            const updated = { ...prev };
            delete updated[originalName];
            return {
              ...updated,
              [name]: updatedPluginData,
            };
          });
        } else {
          // Same name, just update the pending change
          setPendingChanges((prev) => ({
            ...prev,
            [name]: updatedPluginData,
          }));
        }

        toast.custom(createSuccessToast("Plugin updated! Click \"Save & Reload\" to apply changes."));
      } else {
        // Check for name conflicts with existing plugins
        const existingPlugin = plugins().find((p) => p.name === name);
        if (existingPlugin) {
          toast.custom(createErrorToast(`A plugin with the name "${name}" already exists`));
          return;
        }

        // For new plugins, create complete plugin data
        const newPluginData = {
          name,
          displayName,
          description,
          domains,
          jsCode,
          enabled: false, // New plugins start disabled
          type: customPluginType(),
          id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created: Date.now(),
          updated: Date.now(),
        };

        // Add to pending changes for creation
        setPendingChanges((prev) => ({
          ...prev,
          [newPluginData.name]: newPluginData,
        }));

        toast.custom(createSuccessToast("Plugin created! Click \"Save & Reload\" to apply changes."));
      }

      customPluginModal.close();
      setEditingCustomPlugin(undefined);
      
    } catch (error: any) {
      console.error("Failed to prepare plugin:", error);
      toast.custom(createErrorToast(error.message || "Failed to prepare plugin"));
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
      toast.custom(createSuccessToast("Plugin restored!"));
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete the plugin "${plugin.displayName}"? This action cannot be undone.`,
    );

    if (confirmed) {
      // Mark plugin for deletion in pending changes (same as default plugins)
      setPendingChanges((prev) => ({
        ...prev,
        [plugin.name]: 'DELETE',
      }));

      toast.custom(createSuccessToast("Plugin marked for deletion! Click \"Save & Reload\" to apply changes."));
    }
  };

  onMount(() => {
    loadPlugins();
    
    // Expose manual cache clearing function to window for debugging
    (window as any).clearPluginCacheManual = clearPluginCacheManual;
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
                                  {getEffectiveDisplayData(plugin).displayName}
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
                                {hasPendingEdits(plugin) && (
                                  <div class="badge badge-warning">
                                    Edited
                                  </div>
                                )}
                              </div>
                              <p class={`text-base-content/70 mb-3 ${isMarkedForDeletion(plugin) ? 'opacity-50' : ''}`}>
                                {getEffectiveDisplayData(plugin).description}
                              </p>
                              <div class="flex flex-wrap gap-2 text-sm">
                                <span class="text-base-content/50">Sites:</span>
                                <span class="font-mono text-xs bg-base-300 px-2 py-1 rounded break-words">
                                  {getSitesList(getEffectiveDisplayData(plugin).sites)}
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
            All plugin changes require clicking "Save & Reload" to take effect and
            will persist across browser sessions.
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
            {/* Plugin Type Selection */}
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Plugin Type</span>
              </label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label class="cursor-pointer">
                  <input
                    type="radio"
                    name="pluginType"
                    class="radio radio-primary"
                    checked={customPluginType() === "html-modifier"}
                    onChange={() => setCustomPluginType("html-modifier")}
                  />
                  <div class="ml-3">
                    <div class="font-semibold">HTML Modifier</div>
                    <div class="text-sm text-base-content/70">
                      Modify page HTML content on the server side
                    </div>
                  </div>
                </label>

                <label class="cursor-pointer">
                  <input
                    type="radio"
                    name="pluginType"
                    class="radio radio-primary"
                    checked={customPluginType() === "userscript"}
                    onChange={() => setCustomPluginType("userscript")}
                  />
                  <div class="ml-3">
                    <div class="font-semibold">Userscript</div>
                    <div class="text-sm text-base-content/70">
                      Inject JavaScript directly into web pages
                    </div>
                  </div>
                </label>

                <label class="cursor-pointer">
                  <input
                    type="radio"
                    name="pluginType"
                    class="radio radio-primary"
                    checked={customPluginType() === "userstyle"}
                    onChange={() => setCustomPluginType("userstyle")}
                  />
                  <div class="ml-3">
                    <div class="font-semibold">Userstyle</div>
                    <div class="text-sm text-base-content/70">
                      Inject CSS styles directly into web pages
                    </div>
                  </div>
                </label>
              </div>

              {customPluginType() === "userscript" && (
                <div class="alert alert-info mt-4">
                  <div class="text-sm">
                    <div class="font-semibold mb-1">Userscript Mode:</div>
                    <p>
                      Your JavaScript code will be wrapped in &lt;script&gt; tags and
                      injected into the page's &lt;head&gt; section. Write your code as
                      if it's running directly in the browser.
                    </p>
                  </div>
                </div>
              )}

              {customPluginType() === "userstyle" && (
                <div class="alert alert-info mt-4">
                  <div class="text-sm">
                    <div class="font-semibold mb-1">Userstyle Mode:</div>
                    <p>
                      Your CSS code will be wrapped in &lt;style&gt; tags and
                      injected into the page's &lt;head&gt; section. Write CSS rules
                      to style elements on the page.
                    </p>
                  </div>
                </div>
              )}
            </div>

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
                <span class="label-text">
                  {customPluginType() === "userscript" ? "JavaScript Code" : customPluginType() === "userstyle" ? "CSS Code" : "JavaScript Code"}
                </span>
              </label>
              <textarea
                class="textarea textarea-bordered font-mono text-sm resize-none overflow-x-auto"
                placeholder={
                  customPluginType() === "userscript"
                    ? `// Your userscript code here
// This will run directly in the browser

console.log("Hello from userscript!");

document.addEventListener("DOMContentLoaded", () => {
  const title = document.querySelector("h1");
  if (title) {
    title.style.color = "red";
  }
});`
                    : customPluginType() === "userstyle"
                    ? `/* Your CSS styles here */
/* This will be injected into the page's head */

body {
  background-color: #f0f0f0;
}

h1 {
  color: #ff6b6b !important;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.ads, .advertisement {
  display: none !important;
}`
                    : `// Your plugin code here
// The 'body' variable contains the page HTML
// Return the modified HTML

if (body.includes("<head>")) {
  const customScript = '<script>console.log("My custom plugin!");</script>';
  return body.replace("<head>", "<head>" + customScript);
}
return body;`
                }
                rows={12}
                value={customPluginCode()}
                onInput={(e) => setCustomPluginCode(e.currentTarget.value)}
              />
              <label class="label">
                <span class="label-text-alt">
                  {customPluginType() === "userscript"
                    ? "JavaScript code that runs directly in the browser"
                    : customPluginType() === "userstyle"
                    ? "CSS code that will be injected into the page"
                    : "JavaScript code that modifies page HTML"}
                </span>
              </label>
            </div>
          </div>

          <div class="modal-action flex gap-2">
            <button class="btn" onClick={() => {
              setEditingCustomPlugin(undefined);
              customPluginModal.close();
            }}>
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
