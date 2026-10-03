// Identity of the current editorial release of the official MPT series.
export const RELEASE = {
  /** Increment when a new editorial standard supersedes earlier papers. */
  editorialRelease: 8,
  /** Papers frozen from any series registered below this release are replaced if their mock has not started. */
  replaceUnstartedBelowRelease: 8,
  /**
   * Retain the release-6 selection baseline and the seven reserve allocations.
   * Release 8 applies explicit content-review corrections only from Mock 18
   * onward. The server preserves every running, held, attempted or near-start
   * paper. The 47-mock schedule runs at 14:00, 18:00 and 22:30 PKT.
   */
  papers: 37,
  additionalPapers: 7,
  plannedMocks: 47,
  extensionSeed: 'css-vista-mpt-extension-7-2026-10-03',
  baselineSeries: 'bcc868d124be35cd',
  /** The live papers repaired: Mocks 11–40 of the live series (Mocks 1–10 are held and untouched). */
  firstLivePaper: 11,
  lastLivePaper: 40,
  /**
   * Papers of earlier releases already sat, never reused: release 3 papers 4–6 were sat in
   * Mocks 8–10 (papers 1–3 were never installed; excluded too, to be safe). Releases 4 and 5
   * never reached a mock (the server refused them; fixed in D-58).
   */
  heldReleases: [{ path: 'data-archive/mpt-release-3-series.json', papers: 6 }],
  seed: 'css-vista-mpt-editorial-release-6',
  releaseDate: '2026-10-03',
  /** Time-sensitive Current Affairs must describe developments inside this window. */
  currentWindow: { from: '2025-09-01', to: '2026-09-26' },
}
export const SERIES_PATH = 'src/data/mpt/release/series.json'
/** Kept live questions, verbatim as frozen in the live series. */
export const KEPT_PATH = 'src/data/mpt/release/live-kept.json'
/** Editor's review of kept live questions: { reject: {id: reason}, explain: {id: text} }. */
export const REVIEW_PATH = 'src/data/mpt/release/live-review.json'
export const REPORT_DIR = 'data-archive/mpt-release-reports'
