import { ProductGridSkeleton } from "@/components/Skeletons";

export default function HomeLoading() {
  return (
    <div className="space-y-6 pt-4">
      <div className="skeleton h-72 rounded-3xl sm:h-80" />
      <div className="skeleton h-12 rounded-2xl" />
      <ProductGridSkeleton />
    </div>
  );
}
