import Link from "next/link";

interface Props {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ title, message, actionLabel, actionHref }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
      <span className="text-5xl" aria-hidden="true">📱</span>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="max-w-md text-sm text-stone-500">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
