import { useEffect, useRef, useState } from "react";
import { dateLabel, pakistanToday, type Edition } from "./api";
import { FirstPagePreview } from "./Cover";
import "./daily.css";
type Audit = {
  edition_id: string;
  actor: string;
  action: string;
  created_at: string;
};
export default function DailyPdfManager() {
  const [items, setItems] = useState<Edition[]>([]),
    [audit, setAudit] = useState<Audit[]>([]),
    [conflicts, setConflicts] = useState<string[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Edition | null>(null),
    [open, setOpen] = useState(false),
    [date, setDate] = useState(pakistanToday()),
    [title, setTitle] = useState(
      "CSS VISTA Current Affairs Daily — " + dateLabel(pakistanToday()),
    ),
    [description, setDescription] = useState(""),
    [topics, setTopics] = useState(""),
    [status, setStatus] = useState("draft"),
    [scheduled, setScheduled] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [limit, setLimit] = useState(26214400),
    [cover, setCover] = useState<File | null>(null);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [preview, setPreview] = useState(false),
    [reload, setReload] = useState(0);
  const input = useRef<HTMLInputElement>(null),
    request = useRef<XMLHttpRequest | null>(null);
  useEffect(() => {
    const c = new AbortController();
    void fetch("/api/admin/daily-pdf.php?page=" + page, {
      credentials: "include",
      signal: c.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw Error(d.error || d.message || "Could not load publications.");
        setConflicts(d.conflicts || []);
        setItems(d.items);
        setAudit(d.audit);
        setTotal(d.total);
        setLimit(d.maxBytes);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setMessage(e.message);
      });
    return () => c.abort();
  }, [reload, page]);
  useEffect(() => () => request.current?.abort(), []);
  function edit(e: Edition | null) {
    setEditing(e);
    const d = e?.date || pakistanToday();
    setDate(d);
    setTitle(e?.title || "CSS VISTA Current Affairs Daily — " + dateLabel(d));
    setDescription(e?.description || "");
    setTopics(e?.topics.join(", ") || "");
    setStatus(e?.status || "draft");
    setScheduled(
      e?.status === "scheduled"
        ? new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Asia/Karachi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
            .format(new Date(e.publishedAt))
            .replace(" ", "T")
        : "",
    );
    setFile(null);
    setCover(null);
    setPreview(false);
    setOpen(true);
    setMessage("");
    if (input.current) input.current.value = "";
  }
  function save(nextStatus: string) {
    if (busy) return;
    if (!title.trim() || (!editing && !file)) {
      setMessage("Enter a title and select a PDF.");
      return;
    }
    if ((file?.size || 0) > limit) {
      setMessage("This PDF exceeds the configured size limit.");
      return;
    }
    if (
      ["removed", "withdrawn"].includes(nextStatus) &&
      !window.confirm(
        nextStatus === "removed"
          ? "Remove this publication from the catalogue? Files and audit records will be retained."
          : "Withdraw this edition from public access?",
      )
    )
      return;
    const form = new FormData();
    Object.entries({
      date,
      title,
      description,
      topics,
      status: nextStatus,
      scheduledAt: scheduled,
      revision: String(editing?.revision || 0),
    }).forEach(([k, v]) => form.set(k, v));
    if (file) form.set("pdf", file);
    if (cover) form.set("cover", cover);
    const token =
      document.cookie
        .split("; ")
        .find((s) => s.startsWith("cssv_owner_csrf="))
        ?.split("=")
        .slice(1)
        .join("=") || "";
    const xhr = new XMLHttpRequest();
    request.current = xhr;
    xhr.open("POST", "/api/admin/daily-pdf.php");
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-CSRF-Token", decodeURIComponent(token));
    setBusy(true);
    setProgress(0);
    setMessage("");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setBusy(false);
      try {
        const d = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300)
          throw Error(
            d.message || d.error || "Publication could not be saved.",
          );
        setMessage(
          nextStatus === "published"
            ? "Published. The public catalogue is updated."
            : "Publication saved.",
        );
        setOpen(false);
        setReload((n) => n + 1);
      } catch (e) {
        setMessage((e as Error).message);
      }
    };
    xhr.onerror = () => {
      setBusy(false);
      setMessage(
        "The connection failed. Your metadata is preserved. Reload the list before retrying to check whether the save completed.",
      );
    };
    xhr.onabort = () => {
      setBusy(false);
      setMessage(
        "Upload cancelled. Reload the list to verify whether the server completed the request.",
      );
    };
    xhr.send(form);
  }
  return (
    <main className="dp-library">
      <h1>Current Affairs Daily — PDF Manager</h1>
      <p>
        Publish approved PDFs to the public library. Edition dates and scheduled
        times use Asia/Karachi. Maximum PDF size: {(limit / 1048576).toFixed(0)}{" "}
        MB, subject to PHP request limits.
      </p>
      <button className="dp-button" onClick={() => edit(null)}>
        + Upload New Daily PDF
      </button>
      <button className="dp-link" onClick={() => setReload((n) => n + 1)}>
        Refresh publications
      </button>
      {message && (
        <p role="status" className="dp-notice">
          {message}
        </p>
      )}
      {open && (
        <form
          className="dp-form"
          onSubmit={(e) => {
            e.preventDefault();
            save(status);
          }}
        >
          <label>
            Publication Date
            <input
              required
              type="date"
              disabled={!!editing || busy}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (e.target.value)
                  setTitle(
                    "CSS VISTA Current Affairs Daily — " +
                      dateLabel(e.target.value),
                  );
              }}
            />
          </label>
          <label>
            Publication Title
            <input
              required
              maxLength={240}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            {editing ? "Replace PDF (optional)" : "PDF File"}
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setPreview(false);
                if (f)
                  setMessage(
                    f.size > limit
                      ? "File is too large."
                      : f.name + " · " + (f.size / 1048576).toFixed(2) + " MB",
                  );
              }}
            />
          </label>
          <label>
            Cover image (optional approved PNG)
            <input
              type="file"
              accept="image/png"
              onChange={(e) => setCover(e.target.files?.[0] || null)}
            />
          </label>
          <label>
            Short Description
            <textarea
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            Topics Covered (comma separated)
            <input value={topics} onChange={(e) => setTopics(e.target.value)} />
          </label>
          <label>
            Publication Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              {editing && (
                <>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="removed">Removed</option>
                </>
              )}
            </select>
          </label>
          {status === "scheduled" && (
            <label>
              Scheduled Publication Time · Pakistan
              <input
                required
                type="datetime-local"
                value={scheduled}
                onChange={(e) => setScheduled(e.target.value)}
              />
            </label>
          )}
          {preview && <FirstPagePreview file={file} />}
          <div className="dp-actions">
            <button
              disabled={busy}
              type="button"
              className="dp-button dp-secondary"
              onClick={() => save("draft")}
            >
              Save Draft
            </button>
            <button
              type="button"
              className="dp-button dp-secondary"
              onClick={() => setPreview(true)}
              disabled={!file}
            >
              Preview selected PDF
            </button>
            <button disabled={busy} className="dp-button">
              {status === "published" ? "Publish" : "Save " + status}
            </button>
            <button
              type="button"
              className="dp-link"
              onClick={() => {
                if (busy) request.current?.abort();
                else {
                  setOpen(false);
                  setFile(null);
                }
              }}
            >
              Cancel
            </button>
          </div>
          {busy && (
            <label>
              Upload: {progress}%
              {progress === 100 ? " · Validating and saving…" : ""}
              <progress max={100} value={progress} />
            </label>
          )}
        </form>
      )}
      {conflicts.map((c) => (
        <p className="dp-notice" role="alert" key={c}>
          {c}
        </p>
      ))}
      <div className="dp-table">
        <table>
          <thead>
            <tr>
              {["Date", "Title", "Status", "Source", "PDF", "Actions"].map(
                (h) => (
                  <th key={h}>{h}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id}>
                <td>{e.date}</td>
                <td>{e.title}</td>
                <td>{e.status}</td>
                <td>{e.source}</td>
                <td>
                  v{e.version} · {(e.size / 1048576).toFixed(1)} MB
                </td>
                <td>
                  <div className="dp-actions">
                    <a
                      className="dp-link"
                      target="_blank"
                      rel="noreferrer"
                      href={
                        "/api/admin/daily-pdf.php?preview=" +
                        encodeURIComponent(e.id)
                      }
                    >
                      Preview PDF
                    </a>
                    <button className="dp-link" onClick={() => edit(e)}>
                      Edit / Publish / Replace / Withdraw
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dp-actions">
        <button
          disabled={page <= 1}
          className="dp-button dp-secondary"
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={page * 12 >= total}
          className="dp-button dp-secondary"
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <h2>Administrative activity</h2>
      {audit.map((a, i) => (
        <p className="dp-meta" key={i}>
          {a.created_at} UTC · {a.actor} · {a.edition_id} · {a.action}
        </p>
      ))}
    </main>
  );
}
