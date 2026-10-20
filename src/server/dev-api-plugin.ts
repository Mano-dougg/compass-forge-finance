import type { Plugin } from "vite";
/** Real disk persistence for Vite development, isolated from production D1. */
export function accountApiPlugin(): Plugin {
  return {
    name: "atlas-accounts-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          next();
          return;
        }
        try {
          const [{ handleAuthApi }, { devDatabase }] = await Promise.all([
            server.ssrLoadModule("/src/server/auth-api.ts"),
            server.ssrLoadModule("/src/server/dev-database.ts"),
          ]);
          const origin = `${req.headers["x-forwarded-proto"] === "https" ? "https" : "http"}://${req.headers.host}`;
          const request = new Request(new URL(req.url, origin), {
            method: req.method || "GET",
            headers: req.headers as HeadersInit,
            ...(!["GET", "HEAD"].includes(req.method || "GET")
              ? { body: req as unknown as BodyInit, duplex: "half" }
              : {}),
          });
          const response: Response = await handleAuthApi(request, devDatabase);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
