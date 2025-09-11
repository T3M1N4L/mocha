# Reflux Plugins

This directory contains the plugin system for the Reflux proxy.

## Structure

- `plugins.json` - Main configuration file that defines all available plugins
- `*.js` - Individual plugin function files

## How to Add a New Plugin

1. Create a new JavaScript file in this directory (e.g., `my-plugin.js`)
2. Write your plugin code in the file
3. Add an entry to `plugins.json` with:
   - `name`: Unique plugin identifier
   - `displayName`: Human-readable name
   - `description`: What the plugin does
   - `sites`: Array of sites or ["*"] for all sites
   - `enabled`: Default enabled state (true/false)
   - `functionFile`: Reference to your JS file

## Plugin Code Format

### Browser Plugins

Use `/* @browser */` and `/* @/browser */` comments for client-side code:

```javascript
/* @browser */
console.log("This runs in the browser");
document.body.style.background = "red";
/* @/browser */
```

### Response Modifiers

For plugins that modify HTTP responses:

```javascript
// This runs on the proxy server
if (typeof body === "string" && body.includes("<title>")) {
  return body.replace("<title>", "<title>[MODIFIED] ");
}
return body;
```

## Example Plugin Entry

```json
{
  "name": "com.example.my-plugin",
  "displayName": "My Awesome Plugin",
  "description": "Does something cool on websites",
  "sites": ["example.com", "*.example.com"],
  "enabled": true,
  "functionFile": "my-plugin.js"
}
```
