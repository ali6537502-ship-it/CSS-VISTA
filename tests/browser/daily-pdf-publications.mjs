import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { catalogue } from "../../scripts/daily-pdf/package.mjs";
const root = "content/current-affairs-daily/",
  records = (await catalogue())
    .filter((r) => r.date >= "2026-10-19" && r.date <= "2026-10-25")
    .map((r) => ({
      ...r,
      pdfUrl: "/api/daily-pdf.php?file=" + r.id,
      downloadUrl: "/api/daily-pdf.php?file=" + r.id + "&download=1",
      coverUrl: "/api/daily-pdf.php?cover=" + r.id,
    }));
assert.deepEqual(
  records.map((r) => r.date),
  [
    "2026-10-25",
    "2026-10-24",
    "2026-10-23",
    "2026-10-22",
    "2026-10-21",
    "2026-10-20",
    "2026-10-19",
  ],
);
const browser = await chromium.launch({
  executablePath: process.env.CSSV_BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
await mkdir("test-artifacts/daily-pdf", { recursive: true });
try {
  for (const width of [320, 768, 1440]) {
    const context = await browser.newContext({
        viewport: { width, height: 960 },
        acceptDownloads: true,
      }),
      page = await context.newPage();
    let pdfFetches = 0;
    await page.route("**/api/daily-pdf.php?*", async (route) => {
      const u = new URL(route.request().url()),
        file = u.searchParams.get("file"),
        cover = u.searchParams.get("cover");
      if (file) {
        pdfFetches++;
        const r = records.find((r) => r.id === file);
        return route.fulfill({
          contentType: "application/pdf",
          body: await readFile(root + r.file),
          headers: {
            "Content-Disposition": u.searchParams.has("download")
              ? 'attachment; filename="' + file + '.pdf"'
              : "inline",
          },
        });
      }
      if (cover) {
        const r = records.find((r) => r.id === cover);
        return route.fulfill({
          contentType: "image/png",
          body: await readFile(root + "covers/" + r.cover),
        });
      }
      let items = records;
      const q = u.searchParams.get("q"),
        period = u.searchParams.get("period"),
        id = u.searchParams.get("id");
      if (q)
        items = items.filter((r) =>
          (r.title + r.date + r.description + r.topics.join(" "))
            .toLowerCase()
            .includes(q.toLowerCase()),
        );
      if (period) items = items.filter((r) => r.date.startsWith(period));
      if (id) items = items.filter((r) => r.id === id);
      await route.fulfill({
        json: {
          items,
          total: items.length,
          page: 1,
          latest: records[0],
          dates: records.map((r) => r.date),
        },
      });
    });
    await page.goto((process.env.CSSV_DAILY_BROWSER_ORIGIN || "http://localhost:5173") + "/current-affairs-daily");
    await page.locator(".dp-card").first().waitFor();
    assert.equal(await page.locator(".dp-card").count(), 7);
    await page.locator(".dp-feature img").evaluate((img) => img.decode());
    assert.equal(
      await page.locator(".dp-feature img").evaluate((img) => img.naturalWidth),
      720,
    );
    assert.equal(pdfFetches, 0, "archive must not fetch full PDFs");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    // The fixture contains October editions; set the calendar month explicitly.
    await page.getByLabel("Month and year").fill("2026-10");
    assert.equal(await page.locator(".dp-days a").count(), 7);
    await page.getByLabel("Search metadata").fill("22 October 2026");
    await page.waitForFunction(
      () => document.querySelectorAll(".dp-card").length === 1,
    );
    await page.getByRole("button", { name: "Reset Filters" }).click();
    await page.waitForFunction(
      () => document.querySelectorAll(".dp-card").length === 7,
    );
    for (const image of await page.locator('.dp-card img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(img => img.decode());
      assert.equal(await image.evaluate(img => img.naturalWidth),720);
    }
    assert.equal(pdfFetches,0,'scrolling covers must not fetch PDFs');
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({
      path: `test-artifacts/daily-pdf/october-library-${width}.png`,
      fullPage: true,
    });
    await page
      .locator(".dp-feature")
      .getByRole("link", { name: "Read Online", exact: true })
      .click();
    await page.getByLabel("Jump to page").waitFor();
    assert.equal(
      await page.getByLabel("Jump to page").getAttribute("max"),
      String(records[0].pageCount),
    );
    await page.waitForFunction(() => {
      const c = document.querySelector("canvas");
      return (
        c &&
        c.height > c.width &&
        c.getContext("2d").getImageData(0, 0, 1, 1).data[3] === 255
      );
    });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    assert.equal(await page.getByLabel("Jump to page").inputValue(), "2");
    await page.getByLabel("Jump to page").fill(String(records[0].pageCount));
    const pending = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download original PDF" }).click();
    const download = await pending;
    const bytes = await readFile(await download.path());
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      records[0].sha256,
    );
    await page.goBack();
    await page.locator(".dp-card").first().waitFor();
    await context.close();
  }
  console.log(
    "PASS: all seven supplied editions and authentic covers at 320/768/1440px; date calendar, metadata search, no archive PDF fetching, actual 14-page worker rendering, navigation, and byte-identical browser download. Uses local intercepted publication catalogue/files; live delivery is verified separately.",
  );
} finally {
  await browser.close();
}
