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
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/60 px-6">
      <div className="text-sm font-medium text-[var(--muted)]">
        Risk Intelligence
      </div>
      <div className="flex items-center gap-4">
        <span className="max-w-[200px] truncate text-xs text-[var(--muted)]" title={userEmail}>
          {userEmail}
        </span>
        {isGuest ? (
          <Link
            href="/login"
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
          >
            Sign in
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
