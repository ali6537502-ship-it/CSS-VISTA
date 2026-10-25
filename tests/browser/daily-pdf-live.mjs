import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { catalogue } from "../../scripts/daily-pdf/package.mjs";
const origin =
  process.env.CSSV_DAILY_LIVE_ORIGIN || "https://www.css-vista.com";
const expected = (await catalogue()).filter(
  (r) => r.date >= "2026-10-19" && r.date <= "2026-10-25",
);
assert.equal(expected.length, 7);
const browser = await chromium.launch({
  executablePath: process.env.CSSV_BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  proxy: process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY }
    : undefined,
  args: ["--no-sandbox"],
});
const results = [];
await mkdir("test-artifacts/daily-pdf", { recursive: true });
try {
  for (const width of [320, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 960 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const workers = [];
    page.on("response", (r) => {
      if (/\/pdf\.worker\.min-/.test(r.url()))
        workers.push({
          url: r.url(),
          status: r.status(),
          type: r.headers()["content-type"],
        });
    });
    await page.goto(origin + "/current-affairs-daily", {
      waitUntil: "domcontentloaded",
    });
    await page.getByText(/Free public access/).waitFor();
    await page.locator(".dp-card").first().waitFor();
    assert.equal(await page.locator(".dp-card").count(), 7);
    const publicCatalogue = await page.evaluate(async () => {
      const r = await fetch("/api/daily-pdf.php", { credentials: "omit" });
      if (!r.ok) throw Error("Public catalogue failed");
      return r.json();
    });
    assert.equal(publicCatalogue.latest.date, "2026-10-25");
    for (const edition of expected) {
      await page.goto(origin + "/current-affairs-daily/" + edition.date, {
        waitUntil: "domcontentloaded",
      });
      await page.getByLabel("Jump to page").waitFor({ timeout: 45000 });
      assert.equal(
        await page.getByLabel("Jump to page").getAttribute("max"),
        String(edition.pageCount),
      );
      await page.waitForFunction(
        () => {
          const c = document.querySelector(".dp-reader-stage canvas");
          return (
            c &&
            c.height > c.width &&
            c.getContext("2d").getImageData(0, 0, 1, 1).data[3] === 255
          );
        },
        {},
        { timeout: 45000 },
      );
      assert.equal(await page.getByRole("alert").count(), 0);
      await page.getByRole("button", { name: "Next", exact: true }).click();
      assert.equal(await page.getByLabel("Jump to page").inputValue(), "2");
      if (edition.date === "2026-10-25") {
        await page.screenshot({
          path: `test-artifacts/daily-pdf/live-reader-${width}.png`,
          fullPage: true,
        });
        const waiting = page.waitForEvent("download");
        await page.getByRole("link", { name: "Download original PDF" }).click();
        const download = await waiting;
        assert.equal(
          createHash("sha256")
            .update(await readFile(await download.path()))
            .digest("hex"),
          edition.sha256,
        );
      }
      results.push({
        width,
        date: edition.date,
        pages: edition.pageCount,
        rendered: true,
      });
      console.log("LIVE PASS", width, edition.date, edition.pageCount, "pages");
    }
    assert.ok(workers.length >= 7, "actual worker responses must be observed");
    for (const worker of workers) {
      assert.equal(worker.status, 200);
      assert.match(worker.type, /^(?:application|text)\/javascript/);
    }
    assert.equal(
      (await context.cookies()).some(
        (c) => c.name === "cssv_owner_session" || c.name === "cssv_session",
      ),
      false,
      "public reading must not create or require authentication",
    );
    await context.close();
  }
  await writeFile(
    "test-artifacts/daily-pdf/live-browser-proof.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        origin,
        network:
          "real live HTTPS responses, no mocked catalogue/PDF/worker, certificate verification enabled",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: all seven live PDFs render anonymously on mobile and desktop, correct worker MIME, page controls, and byte-identical real browser download. No network responses were intercepted.",
  );
} finally {
  await browser.close();
}
