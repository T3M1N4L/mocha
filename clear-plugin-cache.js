// Plugin Cache Clearing Debug Script
// Run this in the browser console after changing a plugin type

console.log("=== Plugin Cache Clearing Debug Script ===");

async function clearPluginCache() {
  try {
    console.log("1. Forcing plugin system reset...");
    
    // Check if the debugging functions are available
    if (typeof window.forceResetPluginSystem === 'function') {
      await window.forceResetPluginSystem();
      console.log("✅ Plugin system reset completed");
    } else {
      console.log("⚠️ forceResetPluginSystem not available, trying alternative...");
      
      if (typeof window.refreshPluginSystem === 'function') {
        await window.refreshPluginSystem();
        console.log("✅ Plugin system refresh completed");
      } else {
        console.log("❌ No plugin reset functions available");
        console.log("Available window functions:", Object.keys(window).filter(k => k.includes('Plugin')));
      }
    }
    
    console.log("2. Checking current plugin state...");
    if (typeof window.listPlugins === 'function') {
      const plugins = await window.listPlugins();
      console.log("Current plugins:", plugins);
    }
    
    console.log("3. Cache clearing completed. Try visiting the test page now.");
    
  } catch (error) {
    console.error("❌ Cache clearing failed:", error);
  }
}

// Also provide a manual cache clear function
window.clearPluginCacheManual = clearPluginCache;

// Run automatically
clearPluginCache();