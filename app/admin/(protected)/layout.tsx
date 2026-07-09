import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { logout } from "@/app/admin/actions";

export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  return (
    <div className="py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-extrabold text-ink">Admin</h1>
          <nav className="flex gap-3 text-sm font-semibold text-brand">
            <Link href="/admin" className="hover:underline">Products</Link>
            <Link href="/admin/import" className="hover:underline">Import CSV</Link>
            <a href="/api/admin/export" className="hover:underline">Export CSV</a>
          </nav>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm font-semibold text-stone-500 hover:text-ink">
            Log out
          </button>
        </form>
      </div>
      {!isSupabaseConfigured() && (
        <p className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-medium text-coral-dark">
          Supabase isn&apos;t connected yet — the site is showing built-in sample data. Add your real
          keys to <code className="font-mono">.env.local</code> and run the migration to enable
          saving products here.
        </p>
      )}
      {children}
    </div>
  );
}
