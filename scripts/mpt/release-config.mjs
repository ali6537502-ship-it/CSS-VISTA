// Identity of the current editorial release of the official MPT series.
export const RELEASE = {
  /** Increment when a new editorial standard supersedes earlier papers. */
  editorialRelease: 4,
  /** Papers frozen from any series registered below this release are replaced if their mock has not started. */
  replaceUnstartedBelowRelease: 4,
  /**
   * Only the papers the remaining schedule needs, repaired from the live papers already
   * frozen for those mocks (keep what is sound, replace what is defective). The running series is 40 mocks
   * (CSSV_MPT_PLANNED_MOCKS, two a day at 15:00 and 22:30 PKT, mock 40 on 15 Oct 2026).
   * Release 4 (28 Sep 2026): Mocks 1–8 have been held, so 32 remain (9–40); every kept
   * live question has been read by an editor (src/data/mpt/release/live-review.json).
   * Every bank item not used here stays in the bank as reserve for any mock the owner
   * adds later; nothing is deleted.
   */
  papers: 32,
  /** The live papers repaired: Mocks 9–40 of the live series (Mocks 1–8 are held and untouched). */
  firstLivePaper: 9,
  lastLivePaper: 40,
  /** Papers of earlier releases already sat (release 3 papers 1–4 = Mocks 5–8): never reused. */
  heldReleases: [{ path: 'data-archive/mpt-release-3-series.json', papers: 4 }],
  seed: 'css-vista-mpt-editorial-release-4',
  releaseDate: '2026-09-28',
  /** Time-sensitive Current Affairs must describe developments inside this window. */
  currentWindow: { from: '2025-09-01', to: '2026-09-26' },
}
export const SERIES_PATH = 'src/data/mpt/release/series.json'
/** Kept live questions, verbatim as frozen in the live series. */
export const KEPT_PATH = 'src/data/mpt/release/live-kept.json'
/** Editor's review of kept live questions: { reject: {id: reason}, explain: {id: text} }. */
export const REVIEW_PATH = 'src/data/mpt/release/live-review.json'
export const REPORT_DIR = 'data-archive/mpt-release-reports'
