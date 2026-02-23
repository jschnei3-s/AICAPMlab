import { getRequestUserId } from "@/lib/auth-guest";
import { insertFinancialDataset } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Insert a sample financial dataset so users can run stress tests without uploading. */
export async function POST() {
  try {
    const userId = await getRequestUserId();

    const dataset = await insertFinancialDataset(userId, {
      upload_id: null,
      name: "Sample company (demo)",
      revenue: 100_000_000,
      ebitda: 18_000_000,
      debt: 45_000_000,
      cash: 12_000_000,
      equity: 55_000_000,
      working_capital: 8_000_000,
    });

    if (!dataset) {
      return NextResponse.json({ error: "Failed to create sample dataset" }, { status: 500 });
    }
    return NextResponse.json(dataset);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
