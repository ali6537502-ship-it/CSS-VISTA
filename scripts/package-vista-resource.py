"""Package a supplied PDF for the profile-protected PHP resource service."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

parser = argparse.ArgumentParser()
parser.add_argument("pdf")
parser.add_argument("public_key_json")
parser.add_argument("output")
args = parser.parse_args()
pdf = Path(args.pdf).read_bytes()
if not pdf.startswith(b"%PDF-"):
    raise ValueError("A valid supplied PDF is required")
public = json.loads(Path(args.public_key_json).read_text())
pem = public["public_key"].encode()
if hashlib.sha256(pem).hexdigest() != public["key_id"]:
    raise ValueError("Server public key fingerprint does not match")
key = AESGCM.generate_key(bit_length=256)
iv = os.urandom(12)
ciphertext = AESGCM(key).encrypt(iv, pdf, None)
if AESGCM(key).decrypt(iv, ciphertext, None) != pdf:
    raise ValueError("The packaged PDF does not match the supplied file")
wrapped = serialization.load_pem_public_key(pem).encrypt(
    key, padding.OAEP(mgf=padding.MGF1(hashes.SHA1()), algorithm=hashes.SHA1(), label=None)
)
b64 = lambda value: base64.b64encode(value).decode("ascii")
payload = {
    "key_id": public["key_id"],
    "wrapped_key": b64(wrapped),
    "iv": b64(iv),
    "tag": b64(ciphertext[-16:]),
    "sha256": hashlib.sha256(pdf).hexdigest(),
}
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
encoded = b64(ciphertext[:-16])
parts = []
for index, offset in enumerate(range(0, len(encoded), 8 * 1024 * 1024), 1):
    part = f"{output.stem}-part-{index}.php"
    parts.append(part)
    output.with_name(part).write_text("<?php\n// Encrypted book data.\nreturn '" + encoded[offset:offset + 8 * 1024 * 1024] + "';\n")
parts_php = "[" + ", ".join(f"'{part}'" for part in parts) + "]"
output.write_text("<?php\n// Encrypted book. Only the private server runtime can decrypt it.\nreturn [\n" + "".join(f"    '{name}' => '{value}',\n" for name, value in payload.items()) + f"    'parts' => {parts_php},\n" + "];\n")
print(f"Packaged the supplied PDF: {len(pdf)} bytes; SHA-256 {payload['sha256']}")
