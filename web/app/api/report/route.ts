import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  getDatasetById,
  getStressRunById,
  getDisclosureAnalysisById,
  getStressRunsByUserId,
  getDisclosureAnalysesByUserId,
} from "@/lib/db";
import type { ReportPayload } from "@/lib/report-payload";
import ExecutiveReportDocument from "@/lib/ExecutiveReportDocument";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function buildPayload(
  companyName: string,
  keyMetrics: { revenue: number | null; ebitda: number | null; debt: number | null; cash: number | null; equity: number | null },
  stressRun: { scenario_name: string; fragility_score: number | null; results: Record<string, unknown> } | null,
  disclosure: { file_name: string | null; disclosure_risk_score: number | null; results: Record<string, unknown> } | null
): ReportPayload {
  const keyRisks: string[] = [];
  if (stressRun) {
    if (stressRun.fragility_score != null && stressRun.fragility_score >= 50) {
      keyRisks.push(`Stress scenario "${stressRun.scenario_name}" yields fragility score ${stressRun.fragility_score}/100.`);
    }
    const stressed = stressRun.results?.stressed as Record<string, unknown> | undefined;
    const dscr = stressed?.dscr as number | undefined;
    if (dscr != null && dscr < 1.5) {
      keyRisks.push(`Debt service coverage (DSCR) under stress is ${dscr.toFixed(2)}x; refinancing and covenant risk elevated.`);
    }
  }
  if (disclosure) {
    const score = disclosure.disclosure_risk_score ?? 0;
    if (score >= 60) {
      keyRisks.push(`10-K disclosure risk score is ${score}/100; regulatory and litigation language warrants review.`);
    }
  }
  if (keyRisks.length === 0) {
    keyRisks.push("Run stress tests and 10-K analysis to quantify key risks.");
  }

  const recommendations: string[] = [
    "Monitor liquidity runway and maintain contingency funding plans.",
    "Review debt maturities and refinancing options under rate stress.",
    "Track disclosure and regulatory developments; update risk factor disclosures as needed.",
  ];
  if (stressRun && stressRun.fragility_score != null && stressRun.fragility_score >= 60) {
    recommendations.unshift("Consider de-risking balance sheet (e.g. term out debt, increase cash) given stress test results.");
  }
  if (disclosure?.disclosure_risk_score != null && disclosure.disclosure_risk_score >= 60) {
    recommendations.unshift("Strengthen risk factor and legal/regulatory disclosures; consider legal review of sensitive language.");
  }

  const stressSummary = stressRun
    ? {
        scenarioName: stressRun.scenario_name,
        fragilityScore: stressRun.fragility_score,
        baselineDscr: (stressRun.results?.baseline as Record<string, unknown>)?.dscr as number | null ?? null,
        stressedDscr: (stressRun.results?.stressed as Record<string, unknown>)?.dscr as number | null ?? null,
        baselineRunwayMonths: (stressRun.results?.baseline as Record<string, unknown>)?.liquidityRunwayMonths as number | null ?? null,
        stressedRunwayMonths: (stressRun.results?.stressed as Record<string, unknown>)?.liquidityRunwayMonths as number | null ?? null,
      }
    : null;

  const disclosureSummary = disclosure
    ? {
        fileName: disclosure.file_name,
        disclosureRiskScore: disclosure.disclosure_risk_score,
        executiveSummary: (disclosure.results?.executiveSummary as string) || "",
      }
    : null;

  return {
    generatedAt: new Date().toISOString(),
    companyName,
    keyMetrics,
    keyRisks,
    stressSummary,
    disclosureSummary,
    recommendations,
  };
}

const DEMO_PAYLOAD: ReportPayload = {
  generatedAt: new Date().toISOString(),
  companyName: "Sample Company (demo)",
  keyMetrics: {
    revenue: 100_000_000,
    ebitda: 18_000_000,
    debt: 45_000_000,
    cash: 12_000_000,
    equity: 55_000_000,
  },
  keyRisks: [
    "Stress scenario \"Interest rate +200bps\" yields fragility score 58/100.",
    "Debt service coverage (DSCR) under stress is 1.24x; refinancing and covenant risk elevated.",
  ],
  stressSummary: {
    scenarioName: "Interest rate +200bps",
    fragilityScore: 58,
    baselineDscr: 1.45,
    stressedDscr: 1.24,
    baselineRunwayMonths: 14,
    stressedRunwayMonths: 12,
  },
  disclosureSummary: {
    fileName: "10-K-sample.pdf",
    disclosureRiskScore: 55,
    executiveSummary: "Disclosure risk is moderate. Key areas include regulatory references and litigation mentions in risk factors. Recommend periodic review of risk factor language.",
  },
  recommendations: [
    "Monitor liquidity runway and maintain contingency funding plans.",
    "Review debt maturities and refinancing options under rate stress.",
    "Track disclosure and regulatory developments; update risk factor disclosures as needed.",
  ],
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { payload?: ReportPayload; stressRunId?: string; disclosureId?: string };

    if (body.payload) {
      const payload = body.payload as ReportPayload;
      const element = React.createElement(ExecutiveReportDocument, { data: payload });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await renderToBuffer(element as any);
      const filename = `Executive-Risk-Brief-${payload.companyName.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdfBytes = new Uint8Array(buffer as ArrayLike<number>);
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(pdfBytes.length),
        },
      });
    }

    const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    if (!hasSupabase) {
      const element = React.createElement(ExecutiveReportDocument, { data: DEMO_PAYLOAD });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await renderToBuffer(element as any);
      const filename = `Executive-Risk-Brief-Demo-${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdfBytes = new Uint8Array(buffer as ArrayLike<number>);
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(pdfBytes.length),
        },
      });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const { stressRunId, disclosureId } = body;

    let stressRun = null;
    let disclosure = null;
    let dataset = null;
    let companyName = "Company";

    if (stressRunId) {
      stressRun = await getStressRunById(stressRunId, user.id);
      if (stressRun?.dataset_id) {
        dataset = await getDatasetById(stressRun.dataset_id, user.id);
      }
    }
    if (!dataset && stressRun?.dataset_id) {
      dataset = await getDatasetById(stressRun.dataset_id, user.id);
    }
    if (!dataset) {
      const runs = await getStressRunsByUserId(user.id);
      if (runs[0]?.dataset_id) {
        dataset = await getDatasetById(runs[0].dataset_id, user.id);
        if (!stressRun && runs[0]) stressRun = await getStressRunById(runs[0].id, user.id);
      }
    }
    if (dataset) {
      companyName = dataset.name || "Company";
    }

    if (disclosureId) {
      disclosure = await getDisclosureAnalysisById(disclosureId, user.id);
    }
    if (!disclosure) {
      const analyses = await getDisclosureAnalysesByUserId(user.id);
      if (analyses[0]) {
        disclosure = await getDisclosureAnalysisById(analyses[0].id, user.id);
      }
    }

    const keyMetrics = dataset
      ? {
          revenue: dataset.revenue,
          ebitda: dataset.ebitda,
          debt: dataset.debt,
          cash: dataset.cash,
          equity: dataset.equity,
        }
      : { revenue: null, ebitda: null, debt: null, cash: null, equity: null };

    const payload = buildPayload(companyName, keyMetrics, stressRun, disclosure);
    const element = React.createElement(ExecutiveReportDocument, { data: payload });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any);

    const filename = `Executive-Risk-Brief-${companyName.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const pdfBytes = new Uint8Array(buffer as ArrayLike<number>);
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Report generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
