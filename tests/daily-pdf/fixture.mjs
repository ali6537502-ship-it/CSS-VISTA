export function document(pages = 1) {
  let s = "%PDF-1.4\n",
    offsets = [0];
  for (const [i, obj] of [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from({length:pages},(_,i)=>`${i+3} 0 R`).join(" ")}] /Count ${pages} >>`,
    ...Array.from({length:pages},()=>"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>"),
  ].entries()) {
    offsets.push(s.length);
    s += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  }
  const x = s.length;
  s +=
    `xref\n0 ${pages+3}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${pages+3} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(s);
}
