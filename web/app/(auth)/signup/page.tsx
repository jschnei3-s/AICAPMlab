"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Check your email for the confirmation link.");
    router.refresh();
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
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl"
        >
          <h2 className="text-sm font-medium text-zinc-300">Create account</h2>
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
                minLength={6}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>
          {error && (
            <p className="mt-3 text-xs text-red-400">{error}</p>
          )}
          {message && (
            <p className="mt-3 text-xs text-emerald-400">{message}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded bg-zinc-100 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
          <p className="mt-4 text-center text-xs text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-zinc-300 hover:underline">
              Sign in
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
