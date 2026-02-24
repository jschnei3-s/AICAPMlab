/**
 * Stress testing engine: shock scenarios, DSCR, capital ratio, liquidity runway, Monte Carlo VaR, fragility score.
 */

export type ScenarioId =
  | "interest_rate_200bps"
  | "revenue_down_20"
  | "liquidity_freeze"
  | "credit_spread_widening"
  | "volatility_spike";

export type Scenario = {
  id: ScenarioId;
  name: string;
  description: string;
};

export const SCENARIOS: Scenario[] = [
  { id: "interest_rate_200bps", name: "Interest rate +200bps", description: "Rates up 2%; higher interest expense." },
  { id: "revenue_down_20", name: "Revenue -20%", description: "Top line shock; EBITDA and cash flow impact." },
  { id: "liquidity_freeze", name: "Liquidity freeze", description: "No new funding; burn from cash only." },
  { id: "credit_spread_widening", name: "Credit spread widening", description: "Refi cost +150bps; debt servicing pressure." },
  { id: "volatility_spike", name: "Market volatility spike", description: "VaR and capital at risk increase." },
];

export type FinancialInputs = {
  revenue: number | null;
  ebitda: number | null;
  debt: number | null;
  cash: number | null;
  equity: number | null;
  working_capital: number | null;
  /** Optional: current interest rate (decimal, e.g. 0.05). Default 5%. */
  interestRate?: number;
  /** Optional: monthly cash burn (if not derived). */
  monthlyBurn?: number | null;
};

/** Optional overrides for scenario shock parameters (user-defined). */
export type ScenarioOverrides = {
  /** Interest rate increase in bps (e.g. 200 = +2%). Default 200. */
  interestRateBps?: number;
  /** Revenue decline in % (e.g. 20 = -20%). Default 20. */
  revenueDownPct?: number;
  /** Credit spread add in bps (e.g. 150 = +1.5%). Default 150. */
  creditSpreadBps?: number;
  /** Liquidity burn multiplier (e.g. 1.5). Default 1.5. */
  liquidityBurnMultiplier?: number;
  /** Volatility multiplier (e.g. 1.5). Default 1.5. */
  volatilityMultiplier?: number;
};

export type StressResults = {
  scenarioId: ScenarioId;
  scenarioName: string;
  baseline: {
    interestExpense: number;
    dscr: number | null;
    capitalRatio: number | null;
    liquidityRunwayMonths: number | null;
    var95: number | null;
  };
  stressed: {
    interestExpense: number;
    dscr: number | null;
    capitalRatio: number | null;
    liquidityRunwayMonths: number | null;
    var95: number | null;
  };
  /** Capital deterioration over 12 months (month index -> ratio). */
  capitalDeterioration: { month: number; ratio: number }[];
  /** Liquidity burn (month index -> cash). */
  liquidityBurn: { month: number; cash: number }[];
  /** Heatmap data: metric name -> baseline vs stressed. */
  heatmap: { metric: string; baseline: number; stressed: number; unit: string }[];
  fragilityScore: number; // 0-100
};

const DEFAULT_RATE = 0.05;
const MONTHS_PROJECTION = 24;

function nz(x: number | null | undefined): number {
  return x != null && !Number.isNaN(x) ? Number(x) : 0;
}

/** Simple Monte Carlo VaR (95%, 1-year): lognormal returns, 1000 paths. */
function monteCarloVar95(
  initialEquity: number,
  volatility: number,
  drift: number = 0,
  simulations: number = 1000,
  percentile: number = 0.05
): number {
  if (initialEquity <= 0) return 0;
  const rng = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const dt = 1 / 252;
  const paths: number[] = [];
  for (let i = 0; i < simulations; i++) {
    let s = initialEquity;
    for (let t = 0; t < 252; t++) {
      s *= Math.exp((drift - 0.5 * volatility * volatility) * dt + volatility * Math.sqrt(dt) * rng());
    }
    paths.push(s);
  }
  paths.sort((a, b) => a - b);
  const idx = Math.max(0, Math.floor(percentile * simulations));
  const varLevel = paths[idx];
  return Math.max(0, initialEquity - varLevel);
}

const DEFAULT_OVERRIDES: Required<ScenarioOverrides> = {
  interestRateBps: 200,
  revenueDownPct: 20,
  creditSpreadBps: 150,
  liquidityBurnMultiplier: 1.5,
  volatilityMultiplier: 1.5,
};

export function runStress(
  inputs: FinancialInputs,
  scenarioId: ScenarioId,
  overrides?: ScenarioOverrides | null
): StressResults {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const o = { ...DEFAULT_OVERRIDES, ...overrides };
  const rate = inputs.interestRate ?? DEFAULT_RATE;
  const debt = nz(inputs.debt);
  const equity = nz(inputs.equity);
  const cash = nz(inputs.cash);
  const ebitda = nz(inputs.ebitda);
  const revenue = nz(inputs.revenue);

  const baselineInterestExpense = debt * rate;
  const baselineDscr = baselineInterestExpense > 0 ? ebitda / baselineInterestExpense : null;
  const totalAssets = debt + equity;
  const baselineCapitalRatio = totalAssets > 0 ? equity / totalAssets : null;

  const monthlyBurn = inputs.monthlyBurn ?? (revenue > 0 ? (revenue - nz(inputs.ebitda)) / 12 : null);
  const baselineRunway = monthlyBurn != null && monthlyBurn > 0 ? cash / monthlyBurn : null;

  const baseVolatility = 0.2;
  const baselineVar95 = equity > 0 ? monteCarloVar95(equity, baseVolatility) : null;

  let stressedInterestExpense = baselineInterestExpense;
  let stressedEbitda = ebitda;
  let stressedRevenue = revenue;
  let stressedRate = rate;
  let stressedVolatility = baseVolatility;
  let liquidityMultiplier = 1;

  switch (scenarioId) {
    case "interest_rate_200bps": {
      const addBps = Number.isFinite(o.interestRateBps) ? o.interestRateBps : 200;
      stressedRate = rate + addBps / 10000;
      stressedInterestExpense = debt * stressedRate;
      break;
    }
    case "revenue_down_20": {
      const pct = Number.isFinite(o.revenueDownPct) ? Math.min(100, Math.max(0, o.revenueDownPct)) : 20;
      const factor = 1 - pct / 100;
      stressedRevenue = revenue * factor;
      stressedEbitda = ebitda * factor;
      break;
    }
    case "liquidity_freeze":
      liquidityMultiplier = Number.isFinite(o.liquidityBurnMultiplier) && o.liquidityBurnMultiplier > 0 ? o.liquidityBurnMultiplier : 1.5;
      break;
    case "credit_spread_widening": {
      const addBps = Number.isFinite(o.creditSpreadBps) ? o.creditSpreadBps : 150;
      stressedRate = rate + addBps / 10000;
      stressedInterestExpense = debt * stressedRate;
      break;
    }
    case "volatility_spike":
      stressedVolatility = baseVolatility * (Number.isFinite(o.volatilityMultiplier) && o.volatilityMultiplier > 0 ? o.volatilityMultiplier : 1.5);
      break;
  }

  const stressedDscr = stressedInterestExpense > 0 ? stressedEbitda / stressedInterestExpense : null;
  const stressedEquity = equity - (stressedInterestExpense - baselineInterestExpense) * 2; // rough 2yr impact
  const stressedTotalAssets = debt + Math.max(0, stressedEquity);
  const stressedCapitalRatio = stressedTotalAssets > 0 ? Math.max(0, stressedEquity) / stressedTotalAssets : null;
  const stressedMonthlyBurn = monthlyBurn != null ? monthlyBurn * liquidityMultiplier : null;
  const stressedRunway = stressedMonthlyBurn != null && stressedMonthlyBurn > 0 ? cash / stressedMonthlyBurn : null;
  const stressedVar95 = equity > 0 ? monteCarloVar95(equity, stressedVolatility) : null;

  const capitalDeterioration: { month: number; ratio: number }[] = [];
  const decay = stressedCapitalRatio != null && baselineCapitalRatio != null && baselineCapitalRatio > 0
    ? 1 - (stressedCapitalRatio / baselineCapitalRatio)
    : 0.1;
  for (let m = 0; m <= MONTHS_PROJECTION; m++) {
    const ratio = baselineCapitalRatio != null
      ? Math.max(0, baselineCapitalRatio * (1 - (decay * m) / MONTHS_PROJECTION))
      : 0;
    capitalDeterioration.push({ month: m, ratio: Math.min(1, ratio) });
  }

  const liquidityBurn: { month: number; cash: number }[] = [];
  let c = cash;
  const burn = stressedMonthlyBurn ?? (cash / 12);
  for (let m = 0; m <= MONTHS_PROJECTION; m++) {
    liquidityBurn.push({ month: m, cash: Math.max(0, c) });
    c -= burn;
  }

  const heatmap = [
    { metric: "Interest expense", baseline: baselineInterestExpense, stressed: stressedInterestExpense, unit: "$" },
    { metric: "DSCR", baseline: baselineDscr ?? 0, stressed: stressedDscr ?? 0, unit: "x" },
    { metric: "Capital ratio", baseline: (baselineCapitalRatio ?? 0) * 100, stressed: (stressedCapitalRatio ?? 0) * 100, unit: "%" },
    { metric: "Runway (months)", baseline: baselineRunway ?? 0, stressed: stressedRunway ?? 0, unit: "mo" },
    { metric: "VaR (95%)", baseline: baselineVar95 ?? 0, stressed: stressedVar95 ?? 0, unit: "$" },
  ];

  let fragilityScore = 50;
  if (stressedDscr != null && stressedDscr < 1.25) fragilityScore += 15;
  if (stressedDscr != null && stressedDscr < 1) fragilityScore += 15;
  if (stressedCapitalRatio != null && stressedCapitalRatio < 0.2) fragilityScore += 10;
  if (stressedRunway != null && stressedRunway < 6) fragilityScore += 10;
  if (stressedVar95 != null && equity > 0 && stressedVar95 / equity > 0.3) fragilityScore += 5;
  fragilityScore = Math.min(100, Math.max(0, Math.round(fragilityScore)));

  return {
    scenarioId,
    scenarioName: scenario.name,
    baseline: {
      interestExpense: baselineInterestExpense,
      dscr: baselineDscr,
      capitalRatio: baselineCapitalRatio,
      liquidityRunwayMonths: baselineRunway,
      var95: baselineVar95,
    },
    stressed: {
      interestExpense: stressedInterestExpense,
      dscr: stressedDscr,
      capitalRatio: stressedCapitalRatio,
      liquidityRunwayMonths: stressedRunway,
      var95: stressedVar95,
    },
    capitalDeterioration,
    liquidityBurn,
    heatmap,
    fragilityScore,
  };
}
