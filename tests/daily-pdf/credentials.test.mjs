import { test } from "node:test";
import assert from "node:assert/strict";
import { contentCredentialsDigest } from "../../scripts/daily-pdf/credentials.mjs";
function box(type, bytes) {
  const size = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length + 8);
  return Buffer.concat([size, Buffer.from(type), bytes]);
}
function attachment(payload) {
  return {
    "Content Credentials": {
      filename: "Content Credentials",
      description: "Content Credentials",
      content: payload,
    },
  };
}
const description = box(
  "jumd",
  Buffer.from("6332706100110010800000aa00389b71036332706100", "hex"),
);
const valid = box(
  "jumb",
  Buffer.concat([description, box("cbor", Buffer.from([0xa0]))]),
);
test("no attachments requires no provenance digest", () =>
  assert.equal(contentCredentialsDigest(null), null));
test("recognizes bounded C2PA metadata without changing original bytes", () =>
  assert.match(contentCredentialsDigest(attachment(valid)), /^[a-f0-9]{64}$/));
test("rejects arbitrary named attachments", () =>
  assert.throws(() =>
    contentCredentialsDigest({ "program.exe": { content: valid } }),
  ));
test("rejects truncated containers", () =>
  assert.throws(() =>
    contentCredentialsDigest(attachment(valid.subarray(0, valid.length - 1))),
  ));
test("rejects unknown binary boxes", () =>
  assert.throws(() =>
    contentCredentialsDigest(
      attachment(
        box(
          "jumb",
          Buffer.concat([description, box("exec", Buffer.from("code"))]),
        ),
      ),
    ),
  ));
test("rejects active SVG provenance thumbnails", () =>
  assert.throws(() =>
    contentCredentialsDigest(
      attachment(
        box(
          "jumb",
          Buffer.concat([
            description,
            box("bidb", Buffer.from("<svg><script>alert(1)</script></svg>")),
          ]),
        ),
      ),
    ),
  ));
test("rejects external resources in provenance thumbnails", () =>
  assert.throws(() =>
    contentCredentialsDigest(
      attachment(
        box(
          "jumb",
          Buffer.concat([
            description,
            box("bidb", Buffer.from('<svg ><path onload="alert(1)" /></svg>')),
          ]),
        ),
      ),
    ),
  ));
