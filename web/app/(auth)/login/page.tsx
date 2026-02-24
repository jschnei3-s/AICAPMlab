"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (params.get("error") === "auth") {
      setError("Authentication failed or session expired. Try signing in again.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign-in failed");
        return;
      }
      router.push(data.redirect ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Risk Intelligence Platform
          </p>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Capital Markets AI Lab
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sign in to your workspace
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 shadow-xl"
        >
          <h2 className="text-sm font-medium text-[var(--foreground)]">Sign in</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[var(--muted)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/50 px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--muted)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/50 px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>
          </div>
          {error && (
            <p className="mt-3 max-w-full break-words text-xs text-[var(--danger)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="mt-4 text-center text-xs text-[var(--muted)]">
            No account?{" "}
            <Link href="/signup" className="font-medium text-[var(--accent)] hover:underline">
              Sign up
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            <Link href="/dashboard" className="text-[var(--muted)] hover:text-[var(--foreground)] hover:underline">
              Continue as guest
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
