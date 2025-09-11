<div align="center">
  <img src="public/icon.png" height=75 width=75 />
  <h1>Mocha</h1>
</div>
The simplicity and power you expect from a web proxy.

## Features

- [x] Sleek and simple UI
- [x] Browsing data import, export, and deletion
- [x] Bookmarks
- [x] Proxy control bar
- [x] Tab cloaking
- [x] about:blank
- [x] Site shortcuts and games
- [x] Panic key (works inside the proxy)
- [x] Devtools
- [x] End-to-end encryption with Epoxy and Libcurl
- [x] Site compatability alerts and suggestions
- [ ] Script injections (Extensions)

## Run locally

You need [NodeJS](https://nodejs.org) and [Git](https://git-scm.com/download) installed on your system.

```sh
# Clone repository and install packages
git clone https://github.com/cafe-labs/mocha.git
npm install

# Build static files and start the server
npm run start
```

## Reflux Plugin System (Custom Site Enhancements)

A lightweight plugin manager has been added to let you inject your own code into target websites and/or rewrite HTML responses.

- Manager module: [src/lib/refluxPlugins.ts](src/lib/refluxPlugins.ts)
- Auto initialization is wired inside [setupProxy()](src/lib/proxy.ts:20). When the proxy initializes, the default plugins are ensured in storage and picked up by the Reflux middleware.
- Global debug handles are exposed by the proxy setup: `window.RefluxControlAPI`, `window.RefluxAPIInstance`, and `window.BMConnection` (see [src/lib/proxy.ts](src/lib/proxy.ts)).

What you edit

- Edit and maintain your hardcoded plugin list in [defaultPlugins](src/lib/refluxPlugins.ts:110).
- Each plugin is:
  - name: unique string id
  - sites: string[] or ["*"]
  - function: string of code
    - Browser-injected code is delimited with these markers and is executed in the page:
      - "/_ @browser _/" ... "/_ @/browser _/"
    - Any code outside those markers runs server-side as an HTML response rewriter.
    - If you return a string from the server-side section, it will replace the HTML body.

Key APIs

- Manager functions:
  - [getRefluxAPI()](src/lib/refluxPlugins.ts:15)
  - [addPlugin(plugin)](src/lib/refluxPlugins.ts:28)
  - [removePlugin(name)](src/lib/refluxPlugins.ts:33)
  - [enablePlugin(name)](src/lib/refluxPlugins.ts:38)
  - disable: [disablePlugin(name)](src/lib/refluxPlugins.ts:46)
  - [listPlugins()](src/lib/refluxPlugins.ts:53)
  - [getEnabledPlugins()](src/lib/refluxPlugins.ts:58)
  - [updatePluginSites(name, sites)](src/lib/refluxPlugins.ts:68)
  - Ensure-and-enable batch:
    - [ensurePlugins(plugins)](src/lib/refluxPlugins.ts:90)
  - Default init helper:
    - [initDefaultPlugins()](src/lib/refluxPlugins.ts:236)

Usage flow

- Add or edit plugins in [defaultPlugins](src/lib/refluxPlugins.ts:110).
- Load a proxied page (e.g., go to the Route view) so [setupProxy()](src/lib/proxy.ts:20) runs.
  - This calls [initDefaultPlugins()](src/lib/refluxPlugins.ts:236) once to seed your plugins into persistent storage.
  - The Reflux middleware will then load enabled plugins automatically.
- Optional: manage plugins dynamically from your browser console:
  - List plugins: `window.RefluxControlAPI.listPlugins().then(console.log)`
  - Enable one: `window.RefluxControlAPI.enablePlugin('com.example.logger')`
  - Disable one: `window.RefluxControlAPI.disablePlugin('com.example.logger')`
  - Remove one: `window.RefluxControlAPI.removePlugin('com.example.logger')`
- Optional middleware reload after modifications:
  - If available: `window.BMConnection?._transport?.middleware?.reloadPlugins?.()`

Notes

- Plugins are persisted using localforage (storage buckets: plugins, status, pluginMetadata).
- The manager ensures present-and-enabled, but respects your enabled/disabled state going forward. Editing [defaultPlugins](src/lib/refluxPlugins.ts:110) and reloading will update site mappings (via [updatePluginSites(name, sites)](src/lib/refluxPlugins.ts:68)) without forcibly disabling your choices.
- The proxy registers a Scramjet bundle dynamically; window typings for the loader are declared in [src/lib/types.d.ts](src/lib/types.d.ts:101).

Security

- Injected code runs on arbitrary sites you specify. Only add plugins you trust and control. Avoid broad ["*"] scope unless intended.

Verification

- Example.com enhancer: open example.com through the proxy; the H1 elements should be restyled and banner injected.
- GitHub enhancer: open github.com; a banner and CSS injection should appear.
- Debug plugin: a small debug pill appears on all sites when enabled.
