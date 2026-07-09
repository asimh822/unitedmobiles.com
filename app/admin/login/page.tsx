"use client";

import { useActionState } from "react";
import { login, type ActionState } from "@/app/admin/actions";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, {});

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-1 text-2xl font-extrabold text-ink">Admin Login</h1>
      <p className="mb-6 text-sm text-stone-500">United Mobiles staff only.</p>
      <form action={action} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-bold text-ink">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {state.error && <p className="text-sm font-semibold text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
