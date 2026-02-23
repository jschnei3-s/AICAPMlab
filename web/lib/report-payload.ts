/** Payload for the executive risk brief PDF. */

export type ReportPayload = {
  generatedAt: string; // ISO date
  companyName: string;
  keyMetrics: {
    revenue: number | null;
    ebitda: number | null;
    debt: number | null;
    cash: number | null;
    equity: number | null;
  };
  keyRisks: string[];
  stressSummary: {
    scenarioName: string;
    fragilityScore: number | null;
    baselineDscr: number | null;
    stressedDscr: number | null;
    baselineRunwayMonths: number | null;
    stressedRunwayMonths: number | null;
  } | null;
  disclosureSummary: {
    fileName: string | null;
    disclosureRiskScore: number | null;
    executiveSummary: string;
  } | null;
  recommendations: string[];
};

export function formatCurrency(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
