"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const isConfigured = SUPABASE_URL && SUPABASE_URL !== "https://placeholder.supabase.co";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const msg = signInError.message;
        setError(
          /invalid|api key|configuration|fetch|network/i.test(msg)
            ? "Sign-in failed. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, and add this site’s URL in Supabase → Authentication → URL Configuration."
            : msg
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed.";
      setError(message);
      // Hint for common deployment misconfiguration
      if (/invalid|api key|fetch|network|failed to fetch/i.test(message)) {
        setError(
          "Sign-in failed. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, and add this site’s URL in Supabase → Authentication → URL Configuration."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c0d] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Capital Markets AI Lab
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Risk intelligence platform
          </p>
        </div>
        {!isConfigured && (
          <div className="mb-4 rounded-lg border border-zinc-600 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-300">
            <p className="font-medium text-zinc-100">Using Neon (no Supabase)</p>
            <p className="mt-1">You can use the app as a guest. Data is stored in Vercel Postgres/Neon. Use the link below to go to the dashboard.</p>
            <Link href="/dashboard" className="mt-3 inline-block rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
              Go to dashboard
            </Link>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl"
        >
          <h2 className="text-sm font-medium text-zinc-300">Sign in</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs text-zinc-500">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs text-zinc-500">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>
          {error && (
            <p className="mt-3 max-w-full break-words text-xs text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded bg-zinc-100 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="mt-4 text-center text-xs text-zinc-500">
            No account?{" "}
            <Link href="/signup" className="text-zinc-300 hover:underline">
              Sign up
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-zinc-500">
            <Link href="/dashboard" className="text-zinc-400 hover:underline">
              Continue as guest
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
