import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { startArtifactPreview } from "./artifact-preview.mjs";
const dist = resolve(process.env.CSSV_DAILY_ARTIFACT || "dist");
const workers = (await readdir(dist + "/assets")).filter((name) =>
  name.startsWith("pdf.worker.min-"),
);
assert.equal(workers.length, 1, "one versioned PDF worker must be packaged");
assert.ok(
  workers[0].endsWith(".js"),
  "Hostinger-compatible worker must use a fresh .js URL, not a cached text/plain .mjs URL",
);
const { server, origin } = await startArtifactPreview(dist);
try {
  const response = await fetch(origin + "/assets/" + workers[0]);
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type"),
    /^(?:text|application)\/javascript/,
    "module worker must have an executable JavaScript MIME type",
  );
  process.env.CSSV_DAILY_BROWSER_ORIGIN = origin;
  await import("./daily-pdf-publications.mjs");
  console.log(
    "PASS: production-built daily reader paints actual PDF pages using its emitted worker and real artifact MIME types. Catalogue/PDF test bytes use original supplied local files; authentication is absent.",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
