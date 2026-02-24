"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function DashboardHeader({ userEmail, isGuest }: { userEmail: string; isGuest?: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/dashboard");
      router.refresh();
    } catch {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900/30 px-6">
      <div className="text-sm text-zinc-500">
        Capital Markets AI Lab
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-zinc-500 truncate max-w-[180px]">
          {userEmail}
        </span>
        {isGuest ? (
          <Link
            href="/login"
            className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            Sign in
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
