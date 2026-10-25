import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, rm, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { document } from "./fixture.mjs";
if (
  process.env.CI !== "true" ||
  process.env.CSSV_DB_NAME !== "cssvista_briefing_test"
)
  throw Error("Isolated CI database required");
const base = process.env.CSSV_DAILY_TEST_ORIGIN || "http://127.0.0.1:4174";
const owner = JSON.parse(
  await readFile("test-artifacts/admin-session.json", "utf8"),
);
const cookies = `cssv_owner_session=${owner.token}; cssv_owner_csrf=${owner.csrf}`;
async function save(fields = {}, pdf = null, auth = true, csrf = true) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    date: "2026-10-24",
    title: "Test daily PDF",
    status: "draft",
    ...fields,
  }))
    f.set(k, String(v));
  if (pdf)
    f.set("pdf", new Blob([pdf], { type: "application/pdf" }), "test.pdf");
  const headers = {};
  if (auth) headers.Cookie = cookies;
  if (csrf) headers["X-CSRF-Token"] = owner.csrf;
  const r = await fetch(base + "/api/admin/daily-pdf.php", {
    method: "POST",
    headers,
    body: f,
  });
  return { status: r.status, data: await r.json() };
}
async function library() {
  const r = await fetch(base + "/api/daily-pdf.php");
  assert.equal(r.status, 200, await r.clone().text());
  return r.json();
}
async function admin() {
  const r = await fetch(base + "/api/admin/daily-pdf.php", {
    headers: { Cookie: cookies },
  });
  assert.equal(r.status, 200);
  return r.json();
}
const dir = "public/api/_daily_release";
try {
  await access(dir);
  throw Error("Refusing to overwrite an existing release fixture");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
await mkdir(dir + "/2026/10", { recursive: true });
try {
  const bytes = document(),
    record = {
      id: "daily-2026-10-25",
      date: "2026-10-25",
      title: "GitHub fixture",
      source: "github",
      status: "published",
      version: 1,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.length,
      pageCount: 1,
      publishedAt: "2026-10-25T00:00:00Z",
      description: "Fixture only",
      topics: [],
      file: "2026/10/daily-2026-10-25-v1.pdf",
    };
  await writeFile(dir + "/" + record.file, bytes);
  await writeFile(
    dir + "/catalog.php",
    `<?php if(!defined('CSSV_DAILY_RELEASE'))exit;return json_decode(base64_decode('${Buffer.from(JSON.stringify([record])).toString("base64")}'),true);`,
  );
  assert.equal((await save({}, bytes, false)).status, 401);
  assert.equal((await save({}, bytes, true, false)).status, 403);
  assert.equal(
    (await save({}, Buffer.from("<html>not PDF</html>"))).status,
    422,
  );
  assert.equal((await save({}, Buffer.alloc(26214401))).status, 422);
  let result = await save({}, bytes);
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal((await library()).items.length, 1, "draft hidden");
  let e = (await admin()).items.find((e) => e.date === "2026-10-24");
  const preview = await fetch(
    base + "/api/admin/daily-pdf.php?preview=" + e.id,
    { headers: { Cookie: cookies } },
  );
  assert.equal(preview.status, 200);
  assert.match(preview.headers.get("content-type"), /application\/pdf/);
  assert.equal(
    (await save({ status: "published", revision: e.revision })).status,
    200,
  );
  let lib = await library();
  assert.deepEqual(
    lib.items.map((e) => e.source),
    ["github", "admin"],
  );
  assert.equal(lib.latest.date, "2026-10-25");
  assert.equal((await save({}, bytes)).status, 422, "duplicate date rejected");
  const conflict = {...record, id:'daily-2026-10-24', date:'2026-10-24', file:'2026/10/daily-2026-10-24-v1.pdf'};
  await writeFile(dir+'/'+conflict.file, bytes);
  const writeRelease = async records => writeFile(dir+'/catalog.php', `<?php if(!defined('CSSV_DAILY_RELEASE'))exit;return json_decode(base64_decode('${Buffer.from(JSON.stringify(records)).toString('base64')}'),true);`);
  await writeRelease([record,conflict]);
  assert.equal((await admin()).conflicts.length,1,'source conflict surfaced');
  assert.equal((await admin()).conflicts.length,1,'source conflict persists between requests');
  assert.equal((await library()).items.find(e=>e.date===conflict.date).source,'admin','conflict retains existing publication');
  await writeRelease([record]);
  let git = (await admin()).items.find((e) => e.source === "github");
  let delivery = await fetch(base + git.pdfUrl, {
    headers: { Range: "bytes=0-7" },
  });
  assert.equal(delivery.status, 206);
  assert.equal(await delivery.text(), "%PDF-1.4");
  assert.equal(
    (await fetch(base + git.downloadUrl)).headers
      .get("content-disposition")
      .startsWith("attachment"),
    true,
  );
  assert.equal(
    (
      await save({
        date: git.date,
        title: git.title,
        status: "withdrawn",
        revision: git.revision,
      })
    ).status,
    200,
  );
  assert.equal(
    (await library()).items.length,
    1,
    "withdrawal survives repeated release ingestion",
  );
  assert.equal(
    (await fetch(base + git.pdfUrl)).status,
    404,
    "withdrawal enforced at file endpoint",
  );
  git = (await admin()).items.find((e) => e.source === "github");
  assert.equal(
    (
      await save(
        {
          date: git.date,
          title: git.title,
          status: "published",
          revision: git.revision,
        },
        bytes,
      )
    ).status,
    200,
  );
  git = (await admin()).items.find((e) => e.source === "github");
  assert.equal(git.version, 2);
  assert.equal((await library()).latest.version, 2);
  e = (await admin()).items.find((e) => e.source === "admin");
  assert.equal(
    (
      await save({
        status: "scheduled",
        scheduledAt: "2099-01-01T09:00",
        revision: e.revision,
      })
    ).status,
    200,
  );
  assert.equal((await library()).items.length, 1, "future schedule hidden");
  e = (await admin()).items.find((e) => e.source === "admin");
  assert.equal(
    (await save({ status: "removed", revision: e.revision })).status,
    200,
  );
  assert.equal((await fetch(base + e.pdfUrl)).status, 404);
  assert.ok((await admin()).audit.some((a) => a.action === "replaced"));
  console.log(
    "PASS: owner upload/draft/preview/publish; unauthorized and CSRF rejection; malformed/oversized PDF; merged catalogue; conflict protection; range/download delivery; withdrawal persistence; replacement; scheduling; removal; audit.",
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
