// Identity of the current editorial release of the official MPT series.
export const RELEASE = {
  /** Increment when a new editorial standard supersedes earlier papers. */
  editorialRelease: 2,
  /** Papers frozen from any series registered below this release are replaced if their mock has not started. */
  replaceUnstartedBelowRelease: 2,
  papers: 40,
  seed: 'css-vista-mpt-editorial-release-2',
  releaseDate: '2026-09-26',
  /** Time-sensitive Current Affairs must describe developments inside this window. */
  currentWindow: { from: '2025-09-01', to: '2026-09-26' },
}
export const SERIES_PATH = 'src/data/mpt/release/series.json'
export const REPORT_DIR = 'data-archive/mpt-release-reports'
