import { getRequestUserId } from "@/lib/auth-guest";
import { getDatasetsByUserId } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getRequestUserId();
    const datasets = await getDatasetsByUserId(userId);
    return NextResponse.json(datasets);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
