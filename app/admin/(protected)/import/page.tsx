import CsvImport from "@/components/admin/CsvImport";

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-ink">Bulk CSV Import</h2>
      <p className="max-w-2xl text-sm text-stone-500">
        Upload a CSV exported from your desktop inventory app. Columns are matched automatically
        (Brand, Model, Price, RAM, Storage, Color, Condition…) — adjust any mapping below before
        importing. Rows with the same Brand + Model + Condition merge into one product, and each
        distinct color becomes a variant.
      </p>
      <CsvImport />
    </div>
  );
}
