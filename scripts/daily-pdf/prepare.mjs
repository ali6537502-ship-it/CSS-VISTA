import { readFile, writeFile, mkdir, access, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { catalogue } from "./package.mjs";
const [input, ...args] = process.argv.slice(2);
if (!input)
  throw Error(
    'Usage: node scripts/daily-pdf/prepare.mjs /path/edition.pdf [--date YYYY-MM-DD] [--title "Approved title"]',
  );
const value = (key) => {
  const i = args.indexOf(key);
  return i < 0 ? null : args[i + 1];
};
const date =
  value("--date") ||
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
if (
  !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
  new Date(date).toISOString().slice(0, 10) !== date
)
  throw Error("Invalid edition date");
const root = resolve(
    import.meta.dirname,
    "../../content/current-affairs-daily",
  ),
  month = join(root, date.slice(0, 4), date.slice(5, 7)),
  id = "daily-" + date;
const file = `${id}-v1.pdf`,
  meta = join(month, date + ".json"),
  target = join(month, file);
for (const p of [meta, target])
  try {
    await access(p);
    throw Error(
      "An edition already exists. Use the explicit replacement procedure.",
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
const bytes = await readFile(resolve(input));
await mkdir(month, { recursive: true });
let wrotePdf=false, wroteMetadata=false;
try {
  await writeFile(target, bytes, { flag: "wx" });
  wrotePdf=true;
  await writeFile(
    meta,
    JSON.stringify(
      {
        id,
        date,
        title: value("--title") || "CSS VISTA Current Affairs Daily — " + date,
        file: date.slice(0, 4) + "/" + date.slice(5, 7) + "/" + file,
        status: "published",
        source: "github",
        version: 1,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        publishedAt: new Date().toISOString(),
        description: "",
        topics: [],
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  wroteMetadata=true;
  await catalogue(root);
  console.log(
    "Prepared validated PDF and metadata. Review, commit and deploy; this is NOT a live-publication confirmation.",
  );
} catch (e) {
  if(wrotePdf) await rm(target, { force: true });
  if(wroteMetadata) await rm(meta, { force: true });
  throw e;
}
