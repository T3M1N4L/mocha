import { consola } from "consola";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyHttpProxy from "@fastify/http-proxy";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import http from "node:http";
import path from "node:path";
import { build } from "vite";
import { hostname } from "node:os";
import type { Socket } from "node:net";

logging.set_level(logging.NONE);

const fastify = Fastify({
  serverFactory: (handler) => {
    return http
      .createServer()
      .on("request", (req, res) => {
        handler(req, res);
      })
      .on("upgrade", (req, socket, head) => {
        if (req.url?.startsWith("/wisp/")) {
          wisp.routeRequest(req, socket as Socket, head);
        } else {
          socket.end();
        }
      });
  },
  logger: false,
});

const port = Number(process.env.PORT ?? 5555);

consola.start("Building frontend");
await build();

fastify.register(fastifyStatic, {
  root: path.resolve("dist"),
  decorateReply: true,
});

fastify.register(fastifyHttpProxy, {
  upstream: "https://assets.3kh0.net",
  prefix: "/cdn",
  rewritePrefix: "",
});

fastify.setNotFoundHandler((req, reply) => {
  return reply.code(200).type("text/html").sendFile("index.html");
});

// Log bound addresses when server is listening
fastify.server.on("listening", () => {
  const address = fastify.server.address() as any;
  if (address && typeof address === "object") {
    consola.info("Listening on:");
    consola.info(`\thttp://localhost:${address.port}`);
    consola.info(`\thttp://${hostname()}:${address.port}`);
    consola.info(
      `\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`,
    );
  }
});

function shutdown() {
  consola.info("SIGTERM signal received: closing HTTP server");
  fastify.close().finally(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await fastify.listen({
  port,
  host: "0.0.0.0",
});
