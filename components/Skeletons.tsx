export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-3 w-16" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, dense = false }: { count?: number; dense?: boolean }) {
  if (dense) {
    return (
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 sm:gap-2 lg:grid-cols-8">
        {Array.from({ length: count * 2 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="skeleton aspect-square rounded-none" />
            <div className="space-y-1 p-1.5">
              <div className="skeleton h-2.5 w-3/4" />
              <div className="skeleton h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 py-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="skeleton aspect-square" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-16" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    </div>
  );
}
