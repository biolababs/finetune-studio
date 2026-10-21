import { join, posix } from "node:path";

export const HOST = "127.0.0.1";
export const DEFAULT_PORT = 4173;
export const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost"]);
export const ALLOWED_FILES = new Set([
  "index.html",
  "src/app.js",
  "src/core.js",
  "src/styles.css",
]);

export function parsePort(args) {
  const index = args.indexOf("--port");
  const value = index === -1 ? DEFAULT_PORT : Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }
  return value;
}

export function resolveRequestPath(pathname, projectRoot) {
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const requested =
    decodedPathname === "/" ? "index.html" : decodedPathname.slice(1);
  // Request paths use URL separators on every host OS.
  const normalized = posix.normalize(requested);
  if (
    normalized.startsWith("..") ||
    normalized.includes("/../") ||
    !ALLOWED_FILES.has(normalized)
  ) {
    return null;
  }
  return join(projectRoot, normalized);
}
