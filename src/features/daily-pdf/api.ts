export interface Edition {
  id: string;
  date: string;
  title: string;
  description: string;
  topics: string[];
  status: string;
  source: "admin" | "github";
  size: number;
  pageCount: number | null;
  version: number;
  revision: number;
  publishedAt: string;
  pdfUrl: string;
  downloadUrl: string;
  coverUrl?: string;
}
export interface Catalogue {
  items: Edition[];
  latest: Edition | null;
  total: number;
  page: number;
  dates: string[];
}
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(new Date(date + "T12:00:00+05:00"));
export const pakistanToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export async function getCatalogue(
  params = new URLSearchParams(),
  signal?: AbortSignal,
): Promise<Catalogue> {
  const response = await fetch("/api/daily-pdf.php?" + params, {
    signal,
    cache: "no-store",
  });
  if (!response.ok)
    throw Error(
      "The publication service is temporarily unavailable. Please retry.",
    );
  return response.json();
}
export const editionPath = (e: Edition) => "/current-affairs-daily/" + e.date;
export function savedPage(id: string): number {
  try {
    return Number(localStorage.getItem("cssv-daily-page-" + id)) || 1;
  } catch {
    return 1;
  }
}
