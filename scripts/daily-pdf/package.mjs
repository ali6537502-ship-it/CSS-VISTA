import { readdir, readFile, mkdir, writeFile, cp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { contentCredentialsDigest } from "./credentials.mjs";
const root = resolve(import.meta.dirname, "../..");
export async function catalogue(
  base = join(root, "content/current-affairs-daily"),
) {
  async function walk(dir) {
    const out = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (e.isSymbolicLink()) throw Error("Symlinks are forbidden");
      if (e.isDirectory()) out.push(...(await walk(join(dir, e.name))));
      else if (e.name.endsWith(".json")) out.push(join(dir, e.name));
    }
    return out;
  }
  const records = [],
    ids = new Set(),
    dates = new Set();
  for (const path of await walk(base)) {
    const r = JSON.parse(await readFile(path, "utf8"));
    if (
      !/^daily-\d{4}-\d{2}-\d{2}$/.test(r.id) ||
      r.id !== "daily-" + r.date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
      new Date(r.date).toISOString().slice(0, 10) !== r.date
    )
      throw Error("Invalid identity/date: " + path);
    if (
      path !==
      join(base, r.date.slice(0, 4), r.date.slice(5, 7), r.date + ".json")
    )
      throw Error("Metadata path must match date");
    if (ids.has(r.id) || dates.has(r.date)) throw Error("Duplicate edition");
    ids.add(r.id);
    dates.add(r.date);
    if (
      r.source !== "github" ||
      !["draft", "scheduled", "published"].includes(r.status) ||
      typeof r.title !== "string" ||
      !r.title.trim() ||
      r.title.length > 240
    )
      throw Error("Invalid metadata");
    if (
      !Number.isInteger(r.version) ||
      r.version < 1 ||
      !/^[a-f0-9]{64}$/.test(r.sha256)
    )
      throw Error("Integrity/version required");
    if (
      typeof r.publishedAt !== "string" ||
      !/(Z|[+-]\d\d:\d\d)$/.test(r.publishedAt) ||
      !Number.isFinite(Date.parse(r.publishedAt))
    )
      throw Error("Explicit publication timestamp required");
    if (
      r.file !==
      `${r.date.slice(0, 4)}/${r.date.slice(5, 7)}/${r.id}-v${r.version}.pdf`
    )
      throw Error("Invalid PDF path");
    if (
      r.description &&
      (typeof r.description !== "string" || r.description.length > 2000)
    )
      throw Error("Invalid description");
    if (
      r.topics &&
      (!Array.isArray(r.topics) ||
        r.topics.length > 30 ||
        r.topics.some((t) => typeof t !== "string" || t.length > 80))
    )
      throw Error("Invalid topics");
    let cover;
    if (r.cover) {
      if (!/^daily-[0-9-]+-[a-f0-9]{32}\.png$/.test(r.cover))
        throw Error("Invalid cover name");
      const image = await readFile(join(base, "covers", r.cover));
      if (
        image.length > 2097152 ||
        image.length < 24 ||
        image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
        image.readUInt32BE(16) * image.readUInt32BE(20) > 8000000
      )
        throw Error("Invalid PNG cover");
      cover = r.cover;
    }
    const bytes = await readFile(join(base, r.file));
    if (
      bytes.length > 25 * 1024 * 1024 ||
      !bytes.subarray(0, 8).toString().startsWith("%PDF-") ||
      !bytes.subarray(-2048).toString().includes("%%EOF")
    )
      throw Error("Invalid PDF");
    if (createHash("sha256").update(bytes).digest("hex") !== r.sha256)
      throw Error("PDF hash mismatch");
    const task = getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      useSystemFonts: true,
    });
    try {
      const pdf = await task.promise;
      const credentials = contentCredentialsDigest(await pdf.getAttachments());
      if (credentials !== (r.contentCredentialsSha256 || null))
        throw Error("Content Credentials integrity metadata mismatch");
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        if (await page.getJSActions())
          throw Error("PDF page JavaScript is forbidden");
        page.cleanup();
      }
      if (await pdf.getJSActions()) throw Error("PDF JavaScript is forbidden");
      records.push({
        ...r,
        cover,
        coverStorage: "github",
        size: bytes.length,
        pageCount: pdf.numPages,
        description: r.description || "",
        topics: r.topics || [],
      });
    } finally {
      await task.destroy();
    }
  }
  return records.sort((a, b) => b.date.localeCompare(a.date));
}
if (process.argv[1] === import.meta.filename) {
  const records = await catalogue();
  if (!process.argv.includes("--check")) {
    const out = join(root, "dist/api/_daily_release");
    await rm(out, { recursive: true, force: true });
    await mkdir(out, { recursive: true });
    await writeFile(join(out, ".htaccess"), "Require all denied\n");
    for (const r of records) {
      await mkdir(join(out, r.date.slice(0, 4), r.date.slice(5, 7)), {
        recursive: true,
      });
      await cp(
        join(root, "content/current-affairs-daily", r.file),
        join(out, r.file),
      );
    }
    for (const r of records.filter((r) => r.cover)) {
      await mkdir(join(out, "covers"), { recursive: true });
      await cp(
        join(root, "content/current-affairs-daily/covers", r.cover),
        join(out, "covers", r.cover),
      );
    }
    const encoded = Buffer.from(JSON.stringify(records)).toString("base64");
    await writeFile(
      join(out, "catalog.php"),
      `<?php\nif (!defined('CSSV_DAILY_RELEASE')) { http_response_code(404); exit; }\nreturn json_decode(base64_decode('${encoded}'), true, 64, JSON_THROW_ON_ERROR);\n`,
    );
  }
  console.log(`Daily PDF catalogue: ${records.length} validated editions`);
}
