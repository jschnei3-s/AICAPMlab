import { getRequestUserId } from "@/lib/auth-guest";
import { getDatasetById, insertStressRun } from "@/lib/db";
import { runStress, type ScenarioId } from "@/lib/stress-engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId();
    const body = await req.json().catch(() => ({})) as { datasetId?: string; scenarioId?: ScenarioId };
    const { datasetId, scenarioId } = body;

    if (!datasetId || !scenarioId) {
      return NextResponse.json(
        { error: "datasetId and scenarioId required" },
        { status: 400 }
      );
    }

    const validScenarioIds: ScenarioId[] = [
      "interest_rate_200bps",
      "revenue_down_20",
      "liquidity_freeze",
      "credit_spread_widening",
      "volatility_spike",
    ];
    if (!validScenarioIds.includes(scenarioId)) {
      return NextResponse.json({ error: "Invalid scenarioId" }, { status: 400 });
    }

    const dataset = await getDatasetById(datasetId, userId);
    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const inputs = {
      revenue: dataset.revenue,
      ebitda: dataset.ebitda,
      debt: dataset.debt,
      cash: dataset.cash,
      equity: dataset.equity,
      working_capital: dataset.working_capital,
    };
    const results = runStress(inputs, scenarioId);

    await insertStressRun(
      userId,
      datasetId,
      results.scenarioName,
      { scenarioId },
      results as unknown as Record<string, unknown>,
      results.fragilityScore
    );

    return NextResponse.json(results);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stress run failed" },
      { status: 500 }
    );
  }
}
