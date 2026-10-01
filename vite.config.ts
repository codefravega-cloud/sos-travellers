import { existsSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

// Serves the Vercel Functions in api/ during `vite dev`, so no Vercel CLI is
// needed locally. In production Vercel runs the same files as functions.
function devApi(): Plugin {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const match = /^\/api\/([a-z0-9-]+)$/.exec(url.pathname);
        if (!match) return next();
        const file = resolve(server.config.root, "api", `${match[1]}.ts`);
        if (!existsSync(file)) { res.statusCode = 404; return res.end(); }
        try {
          const method = req.method ?? "GET";
          const handler = (await server.ssrLoadModule(file))[method];
          if (typeof handler !== "function") { res.statusCode = 405; return res.end(); }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const request = new Request(url, {
            method,
            headers: req.headers as Record<string, string>,
            body: method === "GET" || method === "HEAD" ? undefined : Buffer.concat(chunks),
          });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          console.error(error);
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Functions read server-side secrets from process.env, as they do on Vercel.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return { plugins: [react(), devApi()], server: { port: Number(process.env.PORT) || 3000 } };
});
