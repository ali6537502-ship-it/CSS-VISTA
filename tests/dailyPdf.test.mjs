import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { catalogue } from "../scripts/daily-pdf/package.mjs";
// A genuine minimal one-page PDF with a valid cross-reference table.
import { document } from "./daily-pdf/fixture.mjs";

async function fixture(fn) {
  const base = await mkdtemp(join(tmpdir(), "cssv-daily-"));
  try {
    await mkdir(join(base, "2026/10"), { recursive: true });
    const bytes = document(),
      r = {
        id: "daily-2026-10-25",
        date: "2026-10-25",
        title: "Approved test fixture",
        file: "2026/10/daily-2026-10-25-v1.pdf",
        version: 1,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        status: "published",
        source: "github",
        publishedAt: "2026-10-25T09:00:00+05:00",
      };
    await writeFile(join(base, r.file), bytes);
    await fn(base, r, async () =>
      writeFile(join(base, "2026/10/2026-10-25.json"), JSON.stringify(r)),
    );
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}
test("empty catalogue invents no editions", () =>
  fixture(async (base) => assert.deepEqual(await catalogue(base), [])));
test("valid binary PDF derives size/page count accurately", () =>
  fixture(async (base, r, save) => {
    await save();
    const [actual] = await catalogue(base);
    assert.equal(actual.pageCount, 1);
    assert.equal(actual.size, document().length);
    assert.equal(actual.sha256, r.sha256);
  }));
for (const [name, mutate] of Object.entries({
  hash: (r) => (r.sha256 = "0".repeat(64)),
  traversal: (r) => (r.file = "../outside.pdf"),
  source: (r) => (r.source = "admin"),
  identity: (r) => (r.id = "daily-2026-10-26"),
  invalidDate: (r) => (r.date = "2026-02-30"),
  timestamp: (r) => (r.publishedAt = "tomorrow"),
  version: (r) => (r.version = 0),
  topics: (r) => (r.topics = ["x".repeat(81)]),
}))
  test("rejects " + name, () =>
    fixture(async (base, r, save) => {
      mutate(r);
      await save();
      await assert.rejects(catalogue(base));
    }),
  );
test("rejects a missing PDF", () =>
  fixture(async (base, r, save) => {
    await save();
    await rm(join(base, r.file));
    await assert.rejects(catalogue(base));
  }));
test("rejects HTML disguised as PDF", () =>
  fixture(async (base, r, save) => {
    const bytes = Buffer.from("<html>This is not a PDF</html>");
    r.sha256 = createHash("sha256").update(bytes).digest("hex");
    await writeFile(join(base, r.file), bytes);
    await save();
    await assert.rejects(catalogue(base));
  }));
