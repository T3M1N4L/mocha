import { execSync } from "node:child_process";
import { defineConfig, normalizePath } from "vite";
import solid from "vite-plugin-solid";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const scramjetPath = path.resolve(
  __dirname,
  "node_modules/@mercuryworkshop/scramjet/dist",
);

import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { refluxPath } from "@nightnetwork/reflux";

// @ts-expect-error
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";

export default defineConfig({
  plugins: [
    solid(),
    {
      name: "Wisp Server",
      configureServer(server) {
        server.httpServer?.on("upgrade", (req, socket, head) => {
          if (req.url?.startsWith("/wisp/")) {
            wisp.routeRequest(req, socket, head);
          }
        });
      },
    },
    viteStaticCopy({
      targets: [
        {
          src: [
            normalizePath(path.resolve(scramjetPath, "scramjet.all.js")),
            normalizePath(path.resolve(scramjetPath, "scramjet.all.js.map")),
            normalizePath(path.resolve(scramjetPath, "scramjet.bundle.js")),
            normalizePath(path.resolve(scramjetPath, "scramjet.bundle.js.map")),
            normalizePath(path.resolve(scramjetPath, "scramjet.sync.js")),
            normalizePath(path.resolve(scramjetPath, "scramjet.sync.js.map")),
            normalizePath(path.resolve(scramjetPath, "scramjet.wasm.wasm")),
          ],
          dest: "matcha",
        },
        {
          src: [
            normalizePath(path.resolve(refluxPath, "api.js")),
            normalizePath(path.resolve(refluxPath, "api.mjs")),
            normalizePath(path.resolve(refluxPath, "index.js")),
            normalizePath(path.resolve(refluxPath, "index.mjs")),
          ],
          dest: "reflux",
        },
        {
          src: normalizePath(path.resolve(baremuxPath, "worker.js")),
          dest: "bare-mux",
        },
        {
          src: normalizePath(path.resolve(epoxyPath, "index.mjs")),
          dest: "epoxy",
        },
        {
          src: normalizePath(path.resolve(libcurlPath, "index.mjs")),
          dest: "libcurl",
        },
      ],
    }),
  ],
  server: {
    proxy: {
      "/cdn": {
        target: "https://assets.3kh0.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cdn/, ""),
      },
    },
  },
  define: {
    __BUILD_DATE__: Date.now(),
    __GIT_COMMIT__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.CF_PAGES_COMMIT_SHA ??
        execSync("git rev-parse HEAD").toString().trim(),
    ),
    __GIT_MESSAGE__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_MESSAGE ??
        process.env.CF_PAGES_COMMIT_MESSAGE ??
        execSync("git log -1 --pretty=%B").toString().trim(),
    ),
    __PRODUCTION__: process.env.NODE_ENV === "production",
  },
});
