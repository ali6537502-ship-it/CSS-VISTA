import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { dateLabel, getCatalogue, savedPage, type Edition } from "./api";
import "./daily.css";
export default function DailyReader() {
  const { date } = useParams(),
    [edition, setEdition] = useState<Edition | null>(null),
    [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1),
    [scale, setScale] = useState(1),
    [fit, setFit] = useState(true),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [width, setWidth] = useState(700);
  const canvas = useRef<HTMLCanvasElement>(null),
    stage = useRef<HTMLDivElement>(null),
    root = useRef<HTMLDivElement>(null),
    render = useRef<RenderTask | null>(null);
  const [search, setSearch] = useState(""),
    [searchStatus, setSearchStatus] = useState(""),
    [searching, setSearching] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    void getCatalogue(new URLSearchParams({ id: "daily-" + date }), c.signal)
      .then((d) => {
        if (!d.items[0])
          throw Error("This document is temporarily unavailable.");
        setEdition(d.items[0]);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => c.abort();
  }, [date]);
  useEffect(() => {
    if (!edition) return;
    let cancelled = false,
      destroy: (() => void) | undefined;
    void (async () => {
      try {
        const lib = await import("pdfjs-dist");
        lib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).href;
        const task = lib.getDocument({
          url: edition.pdfUrl,
          isEvalSupported: false,
        });
        destroy = () => {
          void task.destroy();
        };
        const doc = await task.promise;
        if (cancelled) return;
        setPage(Math.min(doc.numPages, Math.max(1, savedPage(edition.id))));
        setPdf(doc);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoading(false);
          setError(
            "The PDF could not be loaded. Retry or open the original document.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      render.current?.cancel();
      destroy?.();
    };
  }, [edition]);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let cancelled = false;
    render.current?.cancel();
    void (async () => {
      try {
        const p = await pdf.getPage(page);
        if (cancelled || !canvas.current) return;
        const availableWidth = Math.max(240, width - 32),
          natural = p.getViewport({ scale: 1 });
        const viewport = p.getViewport({
            scale: fit ? availableWidth / natural.width : scale,
          }),
          target = canvas.current,
          ratio = Math.min(window.devicePixelRatio || 1, 2);
        target.width = Math.floor(viewport.width * ratio);
        target.height = Math.floor(viewport.height * ratio);
        target.style.width = viewport.width + "px";
        target.style.height = viewport.height + "px";
        target.style.maxWidth = fit ? "100%" : "none";
        render.current = p.render({
          canvas: target,
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
        });
        await render.current.promise;
        try {
          localStorage.setItem("cssv-daily-page-" + edition!.id, String(page));
          localStorage.setItem("cssv-daily-recent", edition!.date);
        } catch {
          /* Optional storage. */
        }
      } catch (e) {
        if (!cancelled && (e as Error).name !== "RenderingCancelledException")
          setError("This page could not be rendered. Try the original PDF.");
      }
    })();
    return () => {
      cancelled = true;
      render.current?.cancel();
    };
  }, [pdf, page, scale, fit, edition, width]);
  async function findText() {
    if (!pdf || !search.trim()) return;
    setSearching(true);
    setSearchStatus("Searching PDF text…");
    try {
      for (let i = 0; i < pdf.numPages; i++) {
        const n = ((page + i) % pdf.numPages) + 1;
        const p = await pdf.getPage(n);
        const text = (await p.getTextContent()).items
          .map((x) => ("str" in x ? x.str : ""))
          .join(" ");
        if (text.toLowerCase().includes(search.toLowerCase())) {
          setPage(n);
          setSearchStatus("Found on page " + n);
          return;
        }
      }
      setSearchStatus(
        "No matching searchable text. Scanned PDFs may have no text layer.",
      );
    } catch {
      setSearchStatus("Text search is unavailable for this document.");
    } finally {
      setSearching(false);
    }
  }
  return (
    <main className="dp-library">
      <Link className="dp-link" to="/current-affairs-daily">
        ← Publication library
      </Link>
      {edition && (
        <>
          <h1>{edition.title}</h1>
          <p>
            {dateLabel(edition.date)} · Free public edition · No sign-in
            required
          </p>
        </>
      )}
      <div className="dp-reader" ref={root}>
        {pdf && (
          <div className="dp-actions">
            <button
              className="dp-button dp-secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <label>
              Page
              <input
                aria-label="Jump to page"
                type="number"
                min={1}
                max={pdf.numPages}
                value={page}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 1 && n <= pdf.numPages) setPage(n);
                }}
              />
            </label>
            <span>of {pdf.numPages}</span>
            <button
              className="dp-button dp-secondary"
              disabled={page === pdf.numPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
            <button
              aria-label="Zoom out"
              className="dp-button dp-secondary"
              onClick={() => {
                setFit(false);
                setScale((s) => Math.max(0.4, s - 0.2));
              }}
            >
              −
            </button>
            <button
              aria-label="Zoom in"
              className="dp-button dp-secondary"
              onClick={() => {
                setFit(false);
                setScale((s) => Math.min(3, s + 0.2));
              }}
            >
              +
            </button>
            <button
              className="dp-button dp-secondary"
              onClick={() => setFit(true)}
            >
              Fit width
            </button>
            <button
              className="dp-button dp-secondary"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void root.current?.requestFullscreen?.().catch(() => {});
              }}
            >
              Fullscreen
            </button>
          </div>
        )}
        {loading && <p role="status">Loading PDF…</p>}
        {error && (
          <p className="dp-notice" role="alert">
            {error}{" "}
            <button
              className="dp-link"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </p>
        )}
        <div ref={stage} className="dp-reader-stage" hidden={!pdf && !loading}>
          <canvas
            ref={canvas}
            className="dp-reader-canvas"
            aria-label={"PDF page " + page}
            role="img"
          />
        </div>
        {pdf && (
          <form
            className="dp-actions"
            onSubmit={(e) => {
              e.preventDefault();
              void findText();
            }}
          >
            <label>
              Search PDF text
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              className="dp-button dp-secondary"
              disabled={searching || !search.trim()}
            >
              Find next
            </button>
            <span role="status">{searchStatus}</span>
          </form>
        )}
        {edition && (
          <div className="dp-actions">
            <a className="dp-button" href={edition.downloadUrl}>
              Download original PDF
            </a>
            <a
              className="dp-button dp-secondary"
              href={edition.pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open original / Print
            </a>
            <p className="dp-meta">
              Use your browser PDF viewer’s Print command. The original also
              provides selectable text and assistive reading where the PDF
              supports them.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
