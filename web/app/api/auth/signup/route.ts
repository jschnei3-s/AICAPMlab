import { NextResponse } from "next/server";
import { createUser, getUserByEmail, createSession, hasDb, SESSION_COOKIE_NAME } from "@/lib/auth-neon";

export const dynamic = "force-dynamic";

const SESSION_DAYS = 7;

function setSessionCookie(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export async function POST(req: Request) {
  try {
    if (!hasDb()) {
      return NextResponse.json(
        { error: "Database not configured. Add POSTGRES_URL or DATABASE_URL in Vercel." },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
    const { email, password } = body;
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await getUserByEmail(trimmedEmail);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const user = await createUser(trimmedEmail, password);
    if (!user) {
      return NextResponse.json(
        { error: "Could not create account. In Neon SQL, run the schema that creates the users and sessions tables (see web/lib/db/schema.sql)." },
        { status: 500 }
      );
    }

    const token = await createSession(user.id);
    if (!token) {
      return NextResponse.json(
        { error: "Account created but could not sign in. Ensure the sessions table exists in Neon (see schema.sql)." },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
    res.headers.set("Set-Cookie", setSessionCookie(token));
    return res;
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    const hint = /relation|does not exist|undefined table/i.test(msg)
      ? " Run the users and sessions schema in Neon (web/lib/db/schema.sql)."
      : "";
    return NextResponse.json(
      { error: `Sign up failed.${hint}` },
      { status: 500 }
    );
  }
}
