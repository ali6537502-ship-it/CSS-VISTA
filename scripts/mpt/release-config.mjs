// Identity of the current editorial release of the official MPT series.
export const RELEASE = {
  /** Increment when a new editorial standard supersedes earlier papers. */
  editorialRelease: 6,
  /** Papers frozen from any series registered below this release are replaced if their mock has not started. */
  replaceUnstartedBelowRelease: 6,
  /**
   * Only the papers the remaining schedule needs, repaired from the live papers already
   * frozen for those mocks (keep what is sound, replace what is defective). The running series is 40 mocks
   * (CSSV_MPT_PLANNED_MOCKS, two a day at 15:00 and 22:30 PKT, mock 40 on 15 Oct 2026).
   * Release 6 (29 Sep 2026): Mocks 1–10 have been held, so 30 remain (11–40); every kept
   * live question has been read by an editor (src/data/mpt/release/live-review.json).
   * Every bank item not used here stays in the bank as reserve for any mock the owner
   * adds later; nothing is deleted.
   */
  papers: 30,
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
  releaseDate: '2026-09-29',
  /** Time-sensitive Current Affairs must describe developments inside this window. */
  currentWindow: { from: '2025-09-01', to: '2026-09-26' },
}
export const SERIES_PATH = 'src/data/mpt/release/series.json'
/** Kept live questions, verbatim as frozen in the live series. */
export const KEPT_PATH = 'src/data/mpt/release/live-kept.json'
/** Editor's review of kept live questions: { reject: {id: reason}, explain: {id: text} }. */
export const REVIEW_PATH = 'src/data/mpt/release/live-review.json'
export const REPORT_DIR = 'data-archive/mpt-release-reports'
