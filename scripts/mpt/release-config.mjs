// Identity of the current editorial release of the official MPT series.
export const RELEASE = {
  /** Increment when a new editorial standard supersedes earlier papers. */
  editorialRelease: 3,
  /** Papers frozen from any series registered below this release are replaced if their mock has not started. */
  replaceUnstartedBelowRelease: 3,
  /**
   * Only the papers the remaining schedule needs, repaired from the live papers already
   * frozen for those mocks (keep what is sound, replace what is defective). The running series is 40 mocks
   * (CSSV_MPT_PLANNED_MOCKS, two a day at 15:00 and 22:30 PKT from 25 Sep 2026, mock 40
   * on 15 Oct 2026). Mocks 1–4 had been held by 27 Sep 2026 19:00 PKT, so 36 remain
   * (5–40). Every bank item not used here stays in the bank as reserve for any mock
   * the owner adds later; nothing is deleted.
   */
  papers: 36,
  /** The live papers repaired: Mocks 5–40 of the live series (Mocks 1–4 are held and untouched). */
  firstLivePaper: 5,
  lastLivePaper: 40,
  seed: 'css-vista-mpt-editorial-release-3',
  releaseDate: '2026-09-27',
  /** Time-sensitive Current Affairs must describe developments inside this window. */
  currentWindow: { from: '2025-09-01', to: '2026-09-26' },
}
export const SERIES_PATH = 'src/data/mpt/release/series.json'
/** Kept live questions, verbatim as frozen in the live series. */
export const KEPT_PATH = 'src/data/mpt/release/live-kept.json'
export const REPORT_DIR = 'data-archive/mpt-release-reports'
