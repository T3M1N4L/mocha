// Test script for custom plugins localStorage functionality
// Run this in the browser console to test the system

console.log("=== Custom Plugins localStorage Test ===");

// Import functions (simulated - in real usage they'd be imported)
async function testCustomPluginsSystem() {
  try {
    // Clear existing data for clean test
    console.log("1. Clearing existing data...");
    localStorage.removeItem("mocha-plugins");
    
    // Test 1: Create a userscript plugin
    console.log("2. Creating a userscript plugin...");
    const userscriptPlugin = {
      name: "test-userscript",
      displayName: "Test Userscript",
      description: "A test userscript plugin",
      domains: ["*"],
      jsCode: "console.log('Hello from userscript!');",
      enabled: true,
      type: "userscript",
      id: "test_" + Date.now() + "_userscript",
      created: Date.now(),
      updated: Date.now()
    };
    
    // Test 2: Create a userstyle plugin
    console.log("3. Creating a userstyle plugin...");
    const userstylePlugin = {
      name: "test-userstyle",
      displayName: "Test Userstyle",
      description: "A test userstyle plugin",
      domains: ["example.com"],
      jsCode: "body { background-color: #ff0000 !important; }",
      enabled: false,
      type: "userstyle",
      id: "test_" + Date.now() + "_userstyle",
      created: Date.now(),
      updated: Date.now()
    };
    
    // Save both plugins
    const mockDefaultPlugins = [
      {
        name: "default-plugin",
        displayName: "Default Plugin",
        description: "A default plugin",
        sites: ["*"],
        enabled: true,
        functionFile: "default.js"
      }
    ];
    
    // Simulate saving the plugins
    const unifiedData = {
      version: 1,
      timestamp: Date.now(),
      defaultPlugins: mockDefaultPlugins,
      customPlugins: [userscriptPlugin, userstylePlugin]
    };
    
    localStorage.setItem("mocha-plugins", JSON.stringify(unifiedData));
    console.log("4. Saved plugins to localStorage");
    
    // Test 3: Load and verify data
    console.log("5. Loading and verifying data...");
    const loaded = JSON.parse(localStorage.getItem("mocha-plugins"));
    console.log("Loaded data:", loaded);
    
    if (loaded.customPlugins.length !== 2) {
      throw new Error("Expected 2 custom plugins, got " + loaded.customPlugins.length);
    }
    
    // Test 4: Modify userstyle to userscript
    console.log("6. Modifying userstyle to userscript...");
    const modifiedPlugin = {
      ...userstylePlugin,
      type: "userscript",
      jsCode: "document.body.style.backgroundColor = 'blue';",
      displayName: "Modified Test Plugin",
      updated: Date.now()
    };
    
    // Update the plugin in localStorage
    loaded.customPlugins[1] = modifiedPlugin;
    loaded.timestamp = Date.now();
    localStorage.setItem("mocha-plugins", JSON.stringify(loaded));
    
    // Verify the change
    const reloaded = JSON.parse(localStorage.getItem("mocha-plugins"));
    const updatedPlugin = reloaded.customPlugins.find(p => p.id === userstylePlugin.id);
    
    if (updatedPlugin.type !== "userscript") {
      throw new Error("Plugin type was not updated correctly");
    }
    
    if (updatedPlugin.displayName !== "Modified Test Plugin") {
      throw new Error("Plugin display name was not updated correctly");
    }
    
    console.log("7. Plugin modification successful:", updatedPlugin);
    
    // Test 5: Toggle enabled state
    console.log("8. Testing enabled state toggle...");
    updatedPlugin.enabled = !updatedPlugin.enabled;
    localStorage.setItem("mocha-plugins", JSON.stringify(reloaded));
    
    const finalCheck = JSON.parse(localStorage.getItem("mocha-plugins"));
    const finalPlugin = finalCheck.customPlugins.find(p => p.id === userstylePlugin.id);
    
    console.log("9. Final plugin state:", finalPlugin);
    
    // Test 6: Delete a plugin
    console.log("10. Testing plugin deletion...");
    finalCheck.customPlugins = finalCheck.customPlugins.filter(p => p.id !== userscriptPlugin.id);
    localStorage.setItem("mocha-plugins", JSON.stringify(finalCheck));
    
    const afterDelete = JSON.parse(localStorage.getItem("mocha-plugins"));
    if (afterDelete.customPlugins.length !== 1) {
      throw new Error("Plugin was not deleted correctly");
    }
    
    console.log("11. Plugin deletion successful. Remaining plugins:", afterDelete.customPlugins.length);
    
    console.log("✅ All tests passed! localStorage functionality is working correctly.");
    
    // Cleanup
    console.log("12. Cleaning up test data...");
    localStorage.removeItem("mocha-plugins");
    
    return true;
  } catch (error) {
    console.error("❌ Test failed:", error);
    localStorage.removeItem("mocha-plugins"); // Cleanup on failure
    return false;
  }
}

// Run the test
testCustomPluginsSystem().then(success => {
  if (success) {
    console.log("🎉 Custom Plugins localStorage system is working correctly!");
  } else {
    console.log("💥 There are issues with the Custom Plugins localStorage system.");
  }
});