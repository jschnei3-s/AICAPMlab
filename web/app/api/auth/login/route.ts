import { NextResponse } from "next/server";
import { verifyLogin, createSession, SESSION_COOKIE_NAME } from "@/lib/auth-neon";

export const dynamic = "force-dynamic";

const SESSION_DAYS = 7;

function setSessionCookie(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
    const { email, password } = body;
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const userId = await verifyLogin(email.trim(), password);
    if (!userId) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSession(userId);
    if (!token) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
    res.headers.set("Set-Cookie", setSessionCookie(token));
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
