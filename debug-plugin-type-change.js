// Test script to debug the custom plugin localStorage issue
// Run this in the browser console after opening the plugins page

console.log("=== Testing Custom Plugin Type Change Issue ===");

async function testPluginTypeChange() {
  try {
    // Step 1: Clear existing data and create a fresh userscript
    console.log("1. Clearing existing plugins data...");
    localStorage.removeItem("mocha-plugins");
    
    // Step 2: Create initial userscript plugin
    console.log("2. Creating initial userscript plugin...");
    const initialPlugin = {
      id: "test_" + Date.now(),
      name: "test-plugin-type-change",
      displayName: "Test Plugin Type Change",
      description: "Testing type change from userscript to userstyle",
      domains: ["*"],
      jsCode: "console.log('This is JavaScript code');",
      enabled: true,
      type: "userscript",
      created: Date.now(),
      updated: Date.now()
    };
    
    // Create the unified storage structure
    const unifiedData = {
      version: 1,
      timestamp: Date.now(),
      defaultPlugins: [
        {
          name: "test-default",
          displayName: "Test Default",
          description: "A test default plugin",
          sites: ["*"],
          enabled: true,
          functionFile: "test.js"
        }
      ],
      customPlugins: [initialPlugin]
    };
    
    localStorage.setItem("mocha-plugins", JSON.stringify(unifiedData));
    console.log("3. Saved initial plugin data");
    
    // Step 3: Load and convert to PluginConfig format to check _customCode
    console.log("4. Testing conversion to PluginConfig...");
    const { customPluginToPluginConfig } = await import('./src/lib/customPlugins.js').catch(() => {
      console.log("Import failed - trying window access");
      return window;
    });
    
    if (typeof customPluginToPluginConfig === 'function') {
      const pluginConfig = customPluginToPluginConfig(initialPlugin);
      console.log("Initial PluginConfig generated:", {
        name: pluginConfig.name,
        type: pluginConfig._customType,
        hasCustomCode: !!pluginConfig._customCode,
        customCodeSnippet: pluginConfig._customCode?.substring(0, 100)
      });
      
      console.log("5. Testing type change to userstyle...");
      const modifiedPlugin = {
        ...initialPlugin,
        type: "userstyle",
        jsCode: "body { background: red !important; }",
        updated: Date.now()
      };
      
      const modifiedPluginConfig = customPluginToPluginConfig(modifiedPlugin);
      console.log("Modified PluginConfig generated:", {
        name: modifiedPluginConfig.name,
        type: modifiedPluginConfig._customType,
        hasCustomCode: !!modifiedPluginConfig._customCode,
        customCodeSnippet: modifiedPluginConfig._customCode?.substring(0, 100)
      });
      
      // Check if the code was properly converted
      const hasStyleTags = modifiedPluginConfig._customCode?.includes('<style>');
      const hasScriptTags = modifiedPluginConfig._customCode?.includes('<script>');
      
      console.log("Code conversion check:", {
        hasStyleTags,
        hasScriptTags,
        shouldHaveStyleTags: true,
        shouldHaveScriptTags: false
      });
      
      if (hasStyleTags && !hasScriptTags) {
        console.log("✅ Type conversion working correctly!");
      } else {
        console.log("❌ Type conversion failed!");
        console.log("Expected: <style> tags, no <script> tags");
        console.log("Got:", modifiedPluginConfig._customCode?.substring(0, 200));
      }
    } else {
      console.log("Could not access customPluginToPluginConfig function");
      console.log("Available functions:", Object.keys(window).filter(k => k.includes('Plugin')));
    }
    
    // Step 4: Test the actual save process
    console.log("6. Simulating the save process...");
    
    // Update the plugin in storage
    unifiedData.customPlugins[0] = {
      ...initialPlugin,
      type: "userstyle",
      jsCode: "body { background: red !important; }",
      updated: Date.now()
    };
    unifiedData.timestamp = Date.now();
    
    localStorage.setItem("mocha-plugins", JSON.stringify(unifiedData));
    console.log("7. Updated plugin saved to localStorage");
    
    // Verify the save
    const reloaded = JSON.parse(localStorage.getItem("mocha-plugins"));
    const savedPlugin = reloaded.customPlugins[0];
    
    console.log("8. Verification - saved plugin:", {
      name: savedPlugin.name,
      type: savedPlugin.type,
      jsCode: savedPlugin.jsCode.substring(0, 50) + "..."
    });
    
    if (savedPlugin.type === "userstyle") {
      console.log("✅ Plugin type change saved correctly!");
    } else {
      console.log("❌ Plugin type change NOT saved correctly!");
    }
    
    console.log("9. Test completed. Check the plugins page to see if the issue persists.");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testPluginTypeChange();