import { useEffect, useRef, useState } from "react";
import type { Edition } from "./api";
// Approved cover images load lazily; browsing cards never fetches full PDFs.
export default function Cover({ edition }: { edition: Edition }) {
  if (edition.coverUrl)
    return (
      <img
        className="dp-cover-image"
        loading="lazy"
        src={edition.coverUrl}
        alt={edition.title + " cover"}
      />
    );
  return (
    <div
      className="dp-cover"
      aria-label="Document placeholder; cover preview unavailable"
    >
      <span>CSS VISTA</span>
      <strong>
        CURRENT
        <br />
        AFFAIRS
        <br />
        DAILY
      </strong>
      <span>{edition.date}</span>
      <small>PDF publication · Cover preview unavailable</small>
    </div>
  );
}
export function FirstPagePreview({ file }: { file: File | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).href;
        const task = pdfjs.getDocument({
          data: new Uint8Array(await file.arrayBuffer()),
          isEvalSupported: false,
        });
        cleanup = () => {
          void task.destroy();
        };
        const pdf = await task.promise;
        if (cancelled || !canvas.current) return;
        const page = await pdf.getPage(1),
          viewport = page.getViewport({ scale: 0.5 });
        const target = canvas.current;
        target.width = viewport.width;
        target.height = viewport.height;
        await page.render({ canvas: target, viewport }).promise;
      } catch {
        if (!cancelled)
          setError(
            "A preview could not be generated. The server will validate your PDF on save.",
          );
      }
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [file]);
  return file ? (
    <div>
      <canvas
        className="max-h-80 max-w-full border"
        ref={canvas}
        aria-label="PDF first page preview"
      />
      {error && <p role="status">{error}</p>}
    </div>
  ) : null;
}
