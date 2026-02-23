import { getRequestUserId } from "@/lib/auth-guest";
import { getDisclosureAnalysesByUserId } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getRequestUserId();
    const analyses = await getDisclosureAnalysesByUserId(userId);
    return NextResponse.json(analyses);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
