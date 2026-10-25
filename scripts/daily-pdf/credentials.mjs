import { createHash } from "node:crypto";
// C2PA provenance is non-executable metadata, not an arbitrary attached file.
// This checks its container and integrity; it does not certify its signatures.
export function contentCredentialsDigest(attachments) {
  if (!attachments || Object.keys(attachments).length === 0) return null;
  const entries = Object.entries(attachments);
  if (entries.length !== 1) throw Error("Embedded files are forbidden");
  const [name, attachment] = entries[0];
  if (
    name !== "Content Credentials" ||
    attachment.filename !== name ||
    attachment.description !== name
  )
    throw Error("Embedded files are forbidden");
  const bytes = Buffer.from(attachment.content);
  if (
    bytes.length < 38 ||
    bytes.length > 1048576 ||
    bytes.readUInt32BE(0) !== bytes.length ||
    bytes.toString("ascii", 4, 8) !== "jumb"
  )
    throw Error("Invalid Content Credentials container");
  let count = 0;
  function boxes(start, end, depth) {
    if (depth > 16) throw Error("Content Credentials nesting limit");
    let offset = start;
    while (offset < end) {
      if (++count > 512 || end - offset < 8)
        throw Error("Malformed Content Credentials");
      const size = bytes.readUInt32BE(offset),
        type = bytes.toString("ascii", offset + 4, offset + 8);
      if (
        size < 8 ||
        offset + size > end ||
        !["jumb", "jumd", "cbor", "json", "bfdb", "bidb"].includes(type)
      )
        throw Error("Unsupported Content Credentials box");
      if (
        type === "bfdb" &&
        bytes.toString("utf8", offset + 8, offset + size) !==
          "\0image/svg+xml\0"
      )
        throw Error("Unsupported provenance thumbnail type");
      if (type === "bidb") {
        const svg = bytes.toString("utf8", offset + 8, offset + size);
        const tags = [...svg.matchAll(/<\/?([\w:]+)/g)].map((m) => m[1]);
        if (
          !svg.trim().startsWith("<svg ") ||
          !svg.trim().endsWith("</svg>") ||
          tags.some(
            (t) =>
              ![
                "svg",
                "g",
                "path",
                "rect",
                "line",
                "circle",
                "ellipse",
                "polygon",
                "polyline",
              ].includes(t),
          ) ||
          /<!|\bon[a-z]+\s*=|(?:href|src)\s*=|url\s*\(/i.test(svg)
        )
          throw Error("Active or unsupported provenance thumbnail");
      }
      if (type === "jumb") boxes(offset + 8, offset + size, depth + 1);
      offset += size;
    }
    if (offset !== end) throw Error("Malformed Content Credentials boundary");
  }
  boxes(0, bytes.length, 0);
  if (
    bytes.toString("ascii", 12, 16) !== "jumd" ||
    bytes.subarray(16, 32).toString("hex") !==
      "6332706100110010800000aa00389b71" ||
    bytes[32] !== 3 ||
    bytes.toString("ascii", 33, 38) !== "c2pa\0"
  )
    throw Error("Expected C2PA provenance descriptor");
  return createHash("sha256").update(bytes).digest("hex");
}
