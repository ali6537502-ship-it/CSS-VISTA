import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  dateLabel,
  editionPath,
  getCatalogue,
  pakistanToday,
  savedPage,
  type Catalogue,
  type Edition,
} from "./api";
import Cover from "./Cover";
import "./daily.css";
function Actions({ edition }: { edition: Edition }) {
  const [saved, setSaved] = useState(() => {
    try {
      return localStorage.getItem("cssv-daily-bookmark-" + edition.id) === "1";
    } catch {
      return false;
    }
  });
  const resume = savedPage(edition.id) > 1;
  return (
    <div className="dp-actions">
      <Link className="dp-button" to={editionPath(edition)}>
        {resume ? "Resume Reading" : "Read Online"}
      </Link>
      <a className="dp-button dp-secondary" href={edition.downloadUrl}>
        Download PDF
      </a>
      <button
        className="dp-link"
        aria-pressed={saved}
        onClick={() => {
          try {
            localStorage.setItem(
              "cssv-daily-bookmark-" + edition.id,
              saved ? "0" : "1",
            );
            setSaved(!saved);
          } catch {
            /* Storage is optional. */
          }
        }}
      >
        {saved ? "Bookmarked" : "Bookmark"}
      </button>
    </div>
  );
}
function Feature({ edition }: { edition: Edition }) {
  return (
    <article className="dp-feature">
      <Cover edition={edition} />
      <div>
        <p className="dp-eyebrow">Latest Edition</p>
        <h2>{edition.title}</h2>
        <time dateTime={edition.date}>{dateLabel(edition.date)}</time>
        <p className="dp-meta">
          {edition.pageCount ? edition.pageCount + " pages · " : ""}
          {(edition.size / 1048576).toFixed(1)} MB · PDF
        </p>
        {edition.description && <p>{edition.description}</p>}
        <Actions edition={edition} />
      </div>
    </article>
  );
}
export function DailyWidget() {
  const [data, setData] = useState<Catalogue | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    void getCatalogue(undefined, c.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => c.abort();
  }, []);
  return (
    <section className="dp-library dp-widget">
      <p className="dp-eyebrow">CURRENT AFFAIRS DAILY</p>
      {data?.latest ? (
        <Feature edition={data.latest} />
      ) : (
        <p>
          {error
            ? "The publication service is temporarily unavailable."
            : data
              ? "Current Affairs Daily publications will appear here once the first edition is published."
              : "Read daily PDFs online and browse published editions."}
        </p>
      )}
      <Link className="dp-link" to="/current-affairs-daily">
        Browse the complete publication archive →
      </Link>
    </section>
  );
}
export default function DailyLibrary() {
  const [params, setParams] = useSearchParams(),
    [data, setData] = useState<Catalogue | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [recent] = useState(() => {
    try {
      return localStorage.getItem("cssv-daily-recent");
    } catch {
      return null;
    }
  });
  const [calendar, setCalendar] = useState(pakistanToday().slice(0, 7));
  const [query, setQuery] = useState(params.get("q") || "");
  const period = params.get("period") || "",
    page = Number(params.get("page") || 1);
  useEffect(() => {
    const c = new AbortController();
    void getCatalogue(params, c.signal)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [params, retry]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (query !== (params.get("q") || "")) {
        const p = new URLSearchParams(params);
        p.set("q", query);
        p.delete("page");
        setParams(p, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, params, setParams]);
  function filter(value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set("period", value);
    else p.delete("period");
    p.delete("page");
    setParams(p);
  }
  const years = [...new Set(data?.dates.map((d) => d.slice(0, 4)) || [])],
    year = period.slice(0, 4),
    month = period.slice(5, 7);
  const [cy, cm] = calendar.split("-").map(Number),
    count = new Date(Date.UTC(cy, cm, 0)).getUTCDate(),
    offset = new Date(Date.UTC(cy, cm - 1, 1)).getUTCDay();
  function moveMonth(n: number) {
    const d = new Date(Date.UTC(cy, cm - 1 + n, 1));
    setCalendar(d.toISOString().slice(0, 7));
  }
  return (
    <main className="dp-library">
      <header className="dp-header">
        <p className="dp-eyebrow">CSS VISTA</p>
        <h1>CURRENT AFFAIRS DAILY</h1>
        <p>
          Your daily collection of Current Affairs publications. Read online,
          download your edition, and revisit previous publications anytime.
        </p>
      </header>
      {error && (
        <div role="alert" className="dp-notice">
          {error}{" "}
          <button className="dp-link" onClick={() => setRetry((x) => x + 1)}>
            Retry
          </button>
        </div>
      )}
      {!data && !error && <p role="status">Loading publications…</p>}
      {data && !data.latest && (
        <p className="dp-notice">
          Current Affairs Daily publications will appear here once the first
          edition is published.
        </p>
      )}
      {recent && data?.dates.includes(recent) && (
        <Link className="dp-link" to={"/current-affairs-daily/" + recent}>
          Continue Reading · {dateLabel(recent)}
        </Link>
      )}
      {data?.latest && (
        <>
          <Feature edition={data.latest} />
          <nav className="dp-date-strip" aria-label="Quick edition access">
            <p className="dp-eyebrow">Choose your edition</p>
            <div>
              {data.dates.slice(0, 7).map((date) => (
                <Link key={date} to={"/current-affairs-daily/" + date}>
                  <time dateTime={date}>{dateLabel(date)}</time>
                  <span>Read edition →</span>
                </Link>
              ))}
            </div>
          </nav>
          <section className="dp-archive">
            <h2>Explore Previous Editions</h2>
            <p className="dp-meta" role="status">
              {data.total} {data.total === 1 ? "edition" : "editions"} available
              {period || query
                ? " for your selection"
                : " in the publication archive"}
              . Search, choose a date, or open an edition below.
            </p>
            <div className="dp-filters">
              <label>
                Search metadata
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Title, date or topics"
                />
              </label>
              <label>
                Year
                <select value={year} onChange={(e) => filter(e.target.value)}>
                  <option value="">All years</option>
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label>
                Month
                <select
                  value={month}
                  disabled={!year}
                  onChange={(e) =>
                    filter(year + (e.target.value ? "-" + e.target.value : ""))
                  }
                >
                  <option value="">All months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={String(i + 1).padStart(2, "0")}>
                      {new Intl.DateTimeFormat("en", {
                        month: "long",
                        timeZone: "UTC",
                      }).format(new Date(Date.UTC(2026, i, 1)))}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="dp-link"
                onClick={() => {
                  setQuery("");
                  setParams({});
                }}
              >
                Reset Filters
              </button>
            </div>
            <details className="dp-calendar" open>
              <summary>Browse publication calendar</summary>
              <div className="dp-actions">
                <button
                  className="dp-button dp-secondary"
                  aria-label="Previous month"
                  onClick={() => moveMonth(-1)}
                >
                  ←
                </button>
                <label>
                  Month and year
                  <input
                    type="month"
                    value={calendar}
                    onChange={(e) => {
                      if (e.target.value) setCalendar(e.target.value);
                    }}
                  />
                </label>
                <button
                  className="dp-button dp-secondary"
                  aria-label="Next month"
                  onClick={() => moveMonth(1)}
                >
                  →
                </button>
              </div>
              <div className="dp-days">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <span key={"blank" + i} />
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const date = calendar + "-" + String(i + 1).padStart(2, "0");
                  return data.dates.includes(date) ? (
                    <Link
                      aria-label={"Read " + dateLabel(date)}
                      key={date}
                      to={"/current-affairs-daily/" + date}
                    >
                      {i + 1}
                    </Link>
                  ) : (
                    <span key={date}>{i + 1}</span>
                  );
                })}
              </div>
            </details>
            {!data.items.length && (
              <p className="dp-notice">
                No editions found for the selected period.
              </p>
            )}
            {[...new Set(data.items.map((e) => e.date.slice(0, 7)))].map(
              (month) => (
                <section
                  key={month}
                  className="dp-month"
                  aria-label={dateLabel(month + "-01").replace(/^\d+ /, "")}
                >
                  <h3>{dateLabel(month + "-01").replace(/^\d+ /, "")}</h3>
                  <div className="dp-grid">
                    {data.items
                      .filter((e) => e.date.startsWith(month))
                      .map((e) => (
                        <article key={e.id} className="dp-card">
                          <Link
                            to={editionPath(e)}
                            aria-label={"Read " + dateLabel(e.date)}
                            className="dp-cover-link"
                          >
                            <Cover edition={e} />
                          </Link>
                          <time dateTime={e.date}>{dateLabel(e.date)}</time>
                          <h4>
                            <Link to={editionPath(e)}>{e.title}</Link>
                          </h4>
                          <p className="dp-meta">
                            {e.pageCount ? e.pageCount + " pages · " : ""}
                            {(e.size / 1048576).toFixed(1)} MB · PDF
                          </p>
                          {e.description && (
                            <p className="dp-card-description">
                              {e.description}
                            </p>
                          )}
                          <Actions edition={e} />
                        </article>
                      ))}
                  </div>
                </section>
              ),
            )}
            {data.total > 12 && (
              <nav className="dp-actions" aria-label="Archive pagination">
                <button
                  disabled={page <= 1}
                  className="dp-button dp-secondary"
                  onClick={() => {
                    const p = new URLSearchParams(params);
                    p.set("page", String(page - 1));
                    setParams(p);
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {Math.ceil(data.total / 12)}
                </span>
                <button
                  disabled={page * 12 >= data.total}
                  className="dp-button dp-secondary"
                  onClick={() => {
                    const p = new URLSearchParams(params);
                    p.set("page", String(page + 1));
                    setParams(p);
                  }}
                >
                  Next
                </button>
              </nav>
            )}
          </section>
        </>
      )}
      <footer className="dp-related">
        <Link to="/current-affairs?tab=magazine">
          Weekly Archive · Previous Weekly Publications
        </Link>
        <Link to="/daily-briefing">Daily Briefing</Link>
        <Link to="/vistagram">Vistagram</Link>
        <Link to="/current-affairs">Current Affairs Resources</Link>
      </footer>
    </main>
  );
}
