import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
  basePath?: string;
}

function pageHref(
  searchParams: Record<string, string | undefined>,
  page: number,
  basePath: string,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page") params.set(k, v);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function Pagination({ page, totalPages, searchParams, basePath = "/" }: Props) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  const linkClass =
    "grid h-9 min-w-9 place-items-center rounded-lg border border-stone-200 bg-white px-2 text-sm font-semibold text-ink hover:border-brand";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={pageHref(searchParams, page - 1, basePath)} className={linkClass} aria-label="Previous page">
          ‹
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="text-stone-400">…</span>}
          {p === page ? (
            <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-brand px-2 text-sm font-bold text-white">
              {p}
            </span>
          ) : (
            <Link href={pageHref(searchParams, p, basePath)} className={linkClass}>
              {p}
            </Link>
          )}
        </span>
      ))}
      {page < totalPages && (
        <Link href={pageHref(searchParams, page + 1, basePath)} className={linkClass} aria-label="Next page">
          ›
        </Link>
      )}
    </nav>
  );
}
