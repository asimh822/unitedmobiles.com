export default function HomeLoading() {
  return (
    <div className="space-y-6 pt-4">
      <div className="skeleton min-h-[240px] rounded-3xl sm:h-[33vh]" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="skeleton w-10 rounded-xl" />
          <div className="grid flex-1 grid-cols-3 gap-2 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="skeleton aspect-[3/4]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
