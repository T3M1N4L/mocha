import { createSignal, onMount, For, createMemo } from "solid-js";
import { Package, CircleCheck, CircleX, RotateCw, Save } from "lucide-solid";
import type { PluginConfig } from "../lib/refluxPlugins";
import {
  loadPluginsConfig,
  savePluginsToLocalStorage,
  refreshPluginSystem,
} from "../lib/refluxPlugins";
import toast from "solid-toast";

export default function Plugins() {
  const [plugins, setPlugins] = createSignal<PluginConfig[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);

  // Track pending changes (plugin name -> new enabled state)
  const [pendingChanges, setPendingChanges] = createSignal<
    Record<string, boolean>
  >({});

  // Check if there are any unsaved changes
  const hasChanges = createMemo(() => Object.keys(pendingChanges()).length > 0);

  // Get the effective state of a plugin (pending change or current state)
  const getEffectiveState = (plugin: PluginConfig) => {
    const pendingState = pendingChanges()[plugin.name];
    return pendingState !== undefined ? pendingState : plugin.enabled;
  };

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const pluginConfigs = await loadPluginsConfig();
      setPlugins(pluginConfigs);
      console.log("[PluginsPage] Loaded plugins:", pluginConfigs.length);
    } catch (error) {
      console.error("Failed to load plugins:", error);
      toast.custom(() => {
        return (
          <div class="toast toast-center toast-top z-[9999]">
            <div class="alert alert-error w-80">
              <CircleX />
              <span>Failed to load plugins</span>
            </div>
          </div>
        );
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshPlugins = async () => {
    console.log("[PluginsPage] Refreshing plugins...");
    try {
      setLoading(true);
      await refreshPluginSystem();
      await loadPlugins();

      toast.custom(() => {
        return (
          <div class="toast toast-center toast-top z-[9999]">
            <div class="alert alert-info w-80">
              <CircleCheck />
              <span>Plugin system refreshed</span>
            </div>
          </div>
        );
      });
    } catch (error) {
      console.error("[PluginsPage] Failed to refresh plugins:", error);
      toast.custom(() => {
        return (
          <div class="toast toast-center toast-top z-[9999]">
            <div class="alert alert-error w-80">
              <CircleX />
              <span>Failed to refresh plugins</span>
            </div>
          </div>
        );
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (pluginName: string) => {
    const plugin = plugins().find((p) => p.name === pluginName);
    if (!plugin) return;

    const currentState =
      pendingChanges()[pluginName] !== undefined
        ? pendingChanges()[pluginName]
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

      // Apply pending changes to the plugins array
      const updatedPlugins = plugins().map((plugin) => {
        const pendingState = pendingChanges()[plugin.name];
        return pendingState !== undefined
          ? { ...plugin, enabled: pendingState }
          : plugin;
      });

      // Save to localStorage
      savePluginsToLocalStorage(updatedPlugins);

      // Show success message
      toast.custom(() => {
        return (
          <div class="toast toast-center toast-top z-[9999]">
            <div class="alert alert-success w-80">
              <CircleCheck />
              <span>Plugin settings saved! Reloading page...</span>
            </div>
          </div>
        );
      });

      // Wait a moment for the toast to show, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Failed to save plugin changes:", error);
      toast.custom(() => {
        return (
          <div class="toast toast-center toast-top z-[9999]">
            <div class="alert alert-error w-80">
              <CircleX />
              <span>Failed to save plugin settings</span>
            </div>
          </div>
        );
      });
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setPendingChanges({});
    toast.custom(() => {
      return (
        <div class="toast toast-center toast-top z-[9999]">
          <div class="alert alert-info w-80">
            <CircleX />
            <span>Changes discarded</span>
          </div>
        </div>
      );
    });
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
    <div class="container mx-auto max-w-4xl p-6">
      <div class="mb-8">
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
          Manage your Reflux plugins. Make changes and click "Save & Reload" to
          apply them.
          {hasChanges() && (
            <span class="text-warning ml-2 font-semibold">
              • You have unsaved changes
            </span>
          )}
        </p>
      </div>

      <div class="grid gap-4">
        {loading() ? (
          <div class="flex items-center justify-center py-12">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-4 text-lg">Loading plugins...</span>
          </div>
        ) : (
          <For each={plugins()}>
            {(plugin) => (
              <div class="card bg-base-200 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
                <div class="card-body">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <h3 class="text-xl font-semibold">
                          {plugin.displayName}
                        </h3>
                        <div
                          class={`badge ${getEffectiveState(plugin) ? "badge-success" : "badge-ghost"}`}
                        >
                          {getEffectiveState(plugin) ? "Enabled" : "Disabled"}
                          {pendingChanges()[plugin.name] !== undefined && (
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
                        <span class="font-mono text-xs bg-base-300 px-2 py-1 rounded">
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
        )}
      </div>

      {!loading() && plugins().length === 0 && (
        <div class="text-center py-12">
          <Package class="h-16 w-16 text-base-content/30 mx-auto mb-4" />
          <h3 class="text-xl font-semibold mb-2">No plugins found</h3>
          <p class="text-base-content/70">
            No plugins are configured. Check your plugins.json file or contact
            support.
          </p>
        </div>
      )}

      <div class="mt-8 p-4 bg-base-300 rounded-box">
        <h4 class="font-semibold mb-2">Plugin Configuration</h4>
        <p class="text-sm text-base-content/70">
          Plugins are loaded from{" "}
          <code class="bg-base-100 px-1 py-0.5 rounded">
            public/plugins.json
          </code>
          . Changes to plugin states are saved locally and will persist across
          browser sessions. Adding custom plugins will be added soon.
        </p>
      </div>
    </div>
  );
}
