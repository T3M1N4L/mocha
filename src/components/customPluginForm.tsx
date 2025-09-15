import { createSignal, createMemo } from "solid-js";
import { Plus, Save, X, Code, Globe, Type } from "lucide-solid";
import toast from "solid-toast";
import { createSuccessToast, createErrorToast } from "./toast";

export type CustomPlugin = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  domains: string[];
  jsCode: string;
  enabled: boolean;
  created: number;
  updated: number;
};

type CustomPluginFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plugin: Omit<CustomPlugin, "id" | "created" | "updated">) => void;
  editingPlugin?: CustomPlugin;
};

export default function CustomPluginForm(props: CustomPluginFormProps) {
  const [name, setName] = createSignal(props.editingPlugin?.name || "");
  const [displayName, setDisplayName] = createSignal(
    props.editingPlugin?.displayName || "",
  );
  const [description, setDescription] = createSignal(
    props.editingPlugin?.description || "",
  );
  const [domainsText, setDomainsText] = createSignal(
    props.editingPlugin?.domains.join(", ") || "",
  );
  const [jsCode, setJsCode] = createSignal(props.editingPlugin?.jsCode || "");
  const [saving, setSaving] = createSignal(false);

  // Validation
  const isValid = createMemo(() => {
    return (
      name().trim().length > 0 &&
      displayName().trim().length > 0 &&
      description().trim().length > 0 &&
      domainsText().trim().length > 0 &&
      jsCode().trim().length > 0
    );
  });

  const parsedDomains = createMemo(() => {
    const domains = domainsText()
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);
    return domains;
  });

  const resetForm = () => {
    if (props.editingPlugin) {
      setName(props.editingPlugin.name);
      setDisplayName(props.editingPlugin.displayName);
      setDescription(props.editingPlugin.description);
      setDomainsText(props.editingPlugin.domains.join(", "));
      setJsCode(props.editingPlugin.jsCode);
    } else {
      setName("");
      setDisplayName("");
      setDescription("");
      setDomainsText("");
      setJsCode("");
    }
  };

  const handleSave = async () => {
    if (!isValid()) return;

    try {
      setSaving(true);

      const pluginData = {
        name: name().trim(),
        displayName: displayName().trim(),
        description: description().trim(),
        domains: parsedDomains(),
        jsCode: jsCode().trim(),
        enabled: props.editingPlugin?.enabled ?? false,
      };

      props.onSave(pluginData);

      toast.custom(createSuccessToast(
        props.editingPlugin
          ? "Plugin updated!"
          : "Custom plugin created!"
      ));

      props.onClose();
      resetForm();
    } catch (error) {
      console.error("Failed to save custom plugin:", error);
      toast.custom(createErrorToast("Failed to save plugin"));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    props.onClose();
    resetForm();
  };

  if (!props.isOpen) return null;

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="modal-box w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <Plus class="h-6 w-6" />
            {props.editingPlugin
              ? "Edit Custom Plugin"
              : "Create Custom Plugin"}
          </h2>
          <button class="btn btn-ghost btn-sm btn-circle" onClick={handleClose}>
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-6">
          {/* Basic Information */}
          <div class="card bg-base-200 border border-base-300">
            <div class="card-body">
              <h3 class="card-title flex items-center gap-2 mb-4">
                <Type class="h-5 w-5" />
                Basic Information
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Name (internal ID)</span>
                    <span class="label-text-alt text-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="my-custom-plugin"
                    class="input input-bordered"
                    value={name()}
                    onInput={(e) => setName(e.currentTarget.value)}
                    disabled={!!props.editingPlugin} // Don't allow changing name when editing
                  />
                  <label class="label">
                    <span class="label-text-alt">
                      Lowercase, no spaces, used internally
                    </span>
                  </label>
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Display Name</span>
                    <span class="label-text-alt text-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="My Custom Plugin"
                    class="input input-bordered"
                    value={displayName()}
                    onInput={(e) => setDisplayName(e.currentTarget.value)}
                  />
                  <label class="label">
                    <span class="label-text-alt">
                      Human-readable name shown in UI
                    </span>
                  </label>
                </div>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Description</span>
                  <span class="label-text-alt text-error">*</span>
                </label>
                <textarea
                  class="textarea textarea-bordered"
                  placeholder="What does this plugin do?"
                  rows={3}
                  value={description()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                />
              </div>
            </div>
          </div>

          {/* Domain Configuration */}
          <div class="card bg-base-200 border border-base-300">
            <div class="card-body">
              <h3 class="card-title flex items-center gap-2 mb-4">
                <Globe class="h-5 w-5" />
                Domain Configuration
              </h3>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Target Domains</span>
                  <span class="label-text-alt text-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder="example.com, *.google.com, * (for all sites)"
                  class="input input-bordered"
                  value={domainsText()}
                  onInput={(e) => setDomainsText(e.currentTarget.value)}
                />
                <label class="label">
                  <span class="label-text-alt">
                    Comma-separated list. Use "*" for all sites, or specific
                    domains like "example.com"
                  </span>
                </label>
              </div>

              {parsedDomains().length > 0 && (
                <div class="mt-2">
                  <span class="text-sm font-medium">Parsed domains:</span>
                  <div class="flex flex-wrap gap-2 mt-1">
                    {parsedDomains().map((domain) => (
                      <span class="badge badge-outline">{domain}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* JavaScript Code */}
          <div class="card bg-base-200 border border-base-300">
            <div class="card-body">
              <h3 class="card-title flex items-center gap-2 mb-4">
                <Code class="h-5 w-5" />
                JavaScript Code
              </h3>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Plugin Code</span>
                  <span class="label-text-alt text-error">*</span>
                </label>
                <textarea
                  class="textarea textarea-bordered font-mono text-sm"
                  placeholder={`// Your plugin code here
// The 'body' variable contains the page HTML
// Return the modified HTML

if (body.includes("<head>")) {
  const customScript = '<script>console.log("My custom plugin loaded!");</script>';
  return body.replace("<head>", "<head>" + customScript);
}
return body;`}
                  rows={15}
                  value={jsCode()}
                  onInput={(e) => setJsCode(e.currentTarget.value)}
                />
                <label class="label">
                  <span class="label-text-alt">
                    JavaScript code that modifies the page. The 'body' variable
                    contains the HTML content.
                  </span>
                </label>
              </div>

              <div class="alert alert-info">
                <div class="text-sm">
                  <div class="font-semibold mb-1">Plugin Development Tips:</div>
                  <ul class="list-disc list-inside space-y-1 text-xs">
                    <li>
                      Your code has access to the 'body' variable containing
                      page HTML
                    </li>
                    <li>Return the modified HTML content</li>
                    <li>
                      Use standard JavaScript string methods and DOM
                      manipulation
                    </li>
                    <li>
                      Test your code carefully - errors can break page loading
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action flex items-center gap-2">
          <button
            class="btn btn-ghost"
            onClick={handleClose}
            disabled={saving()}
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            onClick={handleSave}
            disabled={!isValid() || saving()}
          >
            {saving() ? (
              <>
                <div class="loading loading-spinner loading-sm" />
                Saving...
              </>
            ) : (
              <>
                <Save class="h-4 w-4" />
                {props.editingPlugin ? "Update Plugin" : "Create Plugin"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
