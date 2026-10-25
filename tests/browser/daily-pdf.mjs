import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { document } from "../daily-pdf/fixture.mjs";
const browser = await chromium.launch({
  executablePath: process.env.CSSV_BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const records = Array.from({ length: 14 }, (_, i) => {
  const date = "2026-10-" + String(25 - i).padStart(2, "0");
  return {
    id: "daily-" + date,
    date,
    title: "CSS VISTA Current Affairs Daily — " + date,
    description: "Approved test fixture for the publication interface.",
    topics: ["Pakistan"],
    source: i % 2 ? "admin" : "github",
    status: "published",
    size: document(3).length,
    pageCount: 3,
    version: 1,
    pdfUrl: "/api/daily-pdf.php?file=daily-" + date,
    downloadUrl: "/api/daily-pdf.php?file=daily-" + date + "&download=1",
  };
});
await mkdir("test-artifacts/daily-pdf", { recursive: true });
try {
  for (const width of [320, 768, 1440]) {
    const context = await browser.newContext({
        viewport: { width, height: 960 },
      }),
      page = await context.newPage();
    await page.route("**/api/daily-pdf.php?*", async (route) => {
      const u = new URL(route.request().url());
      if (u.searchParams.has("file"))
        return route.fulfill({
          contentType: "application/pdf",
          body: document(3),
        });
      let items = records;
      const q = u.searchParams.get("q"),
        period = u.searchParams.get("period"),
        id = u.searchParams.get("id");
      if (q)
        items = items.filter((r) =>
          (r.title + r.date + r.topics.join(" "))
            .toLowerCase()
            .includes(q.toLowerCase()),
        );
      if (period) items = items.filter((r) => r.date.startsWith(period));
      if (id) items = items.filter((r) => r.id === id);
      const n = Number(u.searchParams.get("page") || 1);
      await route.fulfill({
        json: {
          items: items.slice((n - 1) * 12, n * 12),
          total: items.length,
          page: n,
          latest: records[0],
          dates: records.map((r) => r.date),
        },
      });
    });
    await page.goto("http://localhost:5173/current-affairs-daily");
    await page
      .getByRole("heading", { name: "CURRENT AFFAIRS DAILY", exact: true })
      .waitFor();
    await page.getByText("Latest Edition", { exact: true }).waitFor();
    assert.ok((await page.locator("main .dp-card").count()) > 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}`,
    );
    await page.getByLabel("Search metadata").fill("no-match");
    await page
      .getByText("No editions found for the selected period.")
      .waitFor();
    await page.getByRole("button", { name: "Reset Filters" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByText("Page 2 of 2", { exact: true }).waitFor();
    await page.getByText("Browse publication calendar").click();
    await page.getByLabel("Month and year").fill("2026-10");
    assert.ok(
      await page.getByRole("link", { name: "Read 25 October 2026" }).count(),
    );
    await page.getByRole("link", { name: "Read 25 October 2026" }).click();
    await page.getByLabel("Jump to page").waitFor();
    await page.locator("canvas").waitFor();
    await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c && c.height===c.width && c.getContext('2d').getImageData(0,0,1,1).data[3]===255});
    await page.getByRole('button',{name:'Next',exact:true}).click();
    assert.equal(await page.getByLabel('Jump to page').inputValue(),'2');
    await page.getByRole('button',{name:'Previous',exact:true}).click();
    assert.equal(await page.getByLabel('Jump to page').inputValue(),'1');
    await page.getByLabel('Jump to page').fill('3');
    assert.equal(await page.getByLabel('Jump to page').inputValue(),'3');
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Fit width" }).click();
    await page.getByRole("link", { name: "Download original PDF" }).waitFor();
    await page.goBack();
    await page
      .getByRole("heading", { name: "CURRENT AFFAIRS DAILY", exact: true })
      .waitFor();
    await page.screenshot({
      path: `test-artifacts/daily-pdf/library-${width}.png`,
      fullPage: true,
    });
    await context.close();
  }
  console.log(
    "PASS: 320/768/1440px library; no overflow; metadata search; pagination; calendar; deep-link reader; worker-rendered PDF; zoom/fit; download link; browser back. Browser catalogue/PDF use explicit local fixtures, not production publications.",
  );
} finally {
  await browser.close();
}
