import { getRequestUserId } from "@/lib/auth-guest";
import { getStressRunsByUserId } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getRequestUserId();
    const runs = await getStressRunsByUserId(userId);
    return NextResponse.json(runs);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
