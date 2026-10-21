import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALLOWED_HOSTS,
  HOST,
  parsePort,
  resolveRequestPath,
} from "./server-core.mjs";

const projectRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function securityHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; " +
      "connect-src 'none'; object-src 'none'; frame-src 'none'; " +
      "worker-src 'none'; media-src 'none'; base-uri 'none'; " +
      "form-action 'none'; frame-ancestors 'none'",
  );
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
}

const port = parsePort(process.argv.slice(2));
const server = createServer(async (request, response) => {
  securityHeaders(response);

  const host = request.headers.host?.split(":")[0];
  if (!host || !ALLOWED_HOSTS.has(host)) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid host");
    return;
  }

  if (!["GET", "HEAD"].includes(request.method ?? "")) {
    response.writeHead(405, {
      Allow: "GET, HEAD",
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Method not allowed");
    return;
  }

  const url = new URL(request.url ?? "/", `http://${host}`);
  const filePath = resolveRequestPath(url.pathname, projectRoot);
  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    response.writeHead(200, {
      "Content-Length": fileStat.size,
      "Content-Type":
        contentTypes[extname(filePath)] ?? "application/octet-stream",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, HOST, () => {
  console.log(`Finetune Studio is available at http://${HOST}:${port}`);
});
