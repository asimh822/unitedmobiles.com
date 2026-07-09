import EmptyState from "@/components/EmptyState";

export default function NotFound() {
  return (
    <div className="py-16">
      <EmptyState
        title="Page not found"
        message="The page you're looking for doesn't exist or the phone may no longer be available."
        actionLabel="Browse all phones"
        actionHref="/"
      />
    </div>
  );
}
