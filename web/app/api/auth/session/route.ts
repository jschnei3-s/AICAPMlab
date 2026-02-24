import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-neon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ user: null });
  }
}
