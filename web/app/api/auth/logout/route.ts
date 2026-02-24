import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE_NAME } from "@/lib/auth-neon";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (token) await deleteSession(token);

    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
