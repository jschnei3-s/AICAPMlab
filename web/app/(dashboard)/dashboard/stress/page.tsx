"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  SCENARIOS,
  runStress,
  type ScenarioId,
  type ScenarioOverrides,
} from "@/lib/stress-engine";

type Dataset = {
  id: string;
  name: string | null;
  revenue: number | null;
  ebitda: number | null;
  debt: number | null;
  cash: number | null;
  equity: number | null;
};

type InputMode = "dataset" | "manual";

const DEFAULT_MANUAL = {
  revenue: 100_000_000,
  ebitda: 18_000_000,
  debt: 45_000_000,
  cash: 12_000_000,
  equity: 55_000_000,
  working_capital: "" as number | "",
  interestRatePct: 5,
  monthlyBurn: "" as number | "",
};

const DEFAULT_OVERRIDES: ScenarioOverrides = {
  interestRateBps: 200,
  revenueDownPct: 20,
  creditSpreadBps: 150,
  liquidityBurnMultiplier: 1.5,
  volatilityMultiplier: 1.5,
};

type StressResults = {
  scenarioId: ScenarioId;
  scenarioName: string;
  baseline: Record<string, number | null>;
  stressed: Record<string, number | null>;
  capitalDeterioration: { month: number; ratio: number }[];
  liquidityBurn: { month: number; cash: number }[];
  heatmap: { metric: string; baseline: number; stressed: number; unit: string }[];
  fragilityScore: number;
};

const CHART_COLORS = { baseline: "#94a3b8", stressed: "#e5b84b" };

const DEFAULT_SAMPLE: Dataset = {
  id: "sample-1",
  name: "Sample company (demo)",
  revenue: 100_000_000,
  ebitda: 18_000_000,
  debt: 45_000_000,
  cash: 12_000_000,
  equity: 55_000_000,
};

export default function StressPage() {
  const [inputMode, setInputMode] = useState<InputMode>("dataset");
  const [manual, setManual] = useState(DEFAULT_MANUAL);
  const [overrides, setOverrides] = useState<ScenarioOverrides>({ ...DEFAULT_OVERRIDES });
  const [localDatasets, setLocalDatasets] = useState<Dataset[]>([DEFAULT_SAMPLE]);
  const [apiDatasets, setApiDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(DEFAULT_SAMPLE.id);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("interest_rate_200bps");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StressResults | null>(null);

  const datasets = useMemo(() => [...apiDatasets, ...localDatasets], [apiDatasets, localDatasets]);

  useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setApiDatasets(list);
        if (list.length > 0 && !selectedDatasetId) setSelectedDatasetId(list[0].id);
      })
      .catch(() => setApiDatasets([]));
  }, [selectedDatasetId]);

  useEffect(() => {
    if (datasets.length > 0 && !selectedDatasetId) setSelectedDatasetId(datasets[0].id);
  }, [datasets, selectedDatasetId]);

  const isApiDataset = (id: string) => apiDatasets.some((d) => d.id === id);

  function getInputsFromManual() {
    const num = (x: number | ""): number | null =>
      x === "" ? null : (typeof x === "number" && Number.isFinite(x) ? x : Number.isFinite(Number(x)) ? Number(x) : null);
    const rev = num(manual.revenue);
    const ebitdaVal = num(manual.ebitda);
    const debtVal = num(manual.debt);
    const cashVal = num(manual.cash);
    const equityVal = num(manual.equity);
    const wc = num(manual.working_capital);
    const ir = manual.interestRatePct;
    const burn = manual.monthlyBurn === "" ? undefined : (typeof manual.monthlyBurn === "number" ? manual.monthlyBurn : Number(manual.monthlyBurn));
    return {
      revenue: rev,
      ebitda: ebitdaVal,
      debt: debtVal,
      cash: cashVal,
      equity: equityVal,
      working_capital: wc != null ? wc : null,
      interestRate: typeof ir === "number" && Number.isFinite(ir) ? ir / 100 : undefined,
      monthlyBurn: burn != null && Number.isFinite(burn) ? burn : undefined,
    };
  }

  async function handleRun() {
    setError(null);
    setResults(null);
    setLoading(true);
    try {
      if (inputMode === "manual") {
        const inputs = getInputsFromManual();
        if (
          inputs.revenue == null &&
          inputs.ebitda == null &&
          inputs.debt == null &&
          inputs.cash == null &&
          inputs.equity == null
        ) {
          setError("Enter at least one manual company metric.");
          return;
        }
        const out = runStress(inputs, scenarioId, overrides);
        setResults(out);
        return;
      }
      if (!selectedDatasetId) {
        setError("Select a dataset.");
        return;
      }
      const dataset = datasets.find((d) => d.id === selectedDatasetId);
      if (!dataset) {
        setError("Dataset not found.");
        return;
      }
      const inputs = {
        revenue: dataset.revenue,
        ebitda: dataset.ebitda,
        debt: dataset.debt,
        cash: dataset.cash,
        equity: dataset.equity,
        working_capital: null,
      };
      if (isApiDataset(selectedDatasetId)) {
        const res = await fetch("/api/stress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datasetId: selectedDatasetId, scenarioId, overrides }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Run failed");
        setResults(data);
      } else {
        const out = runStress(inputs, scenarioId, overrides);
        setResults(out);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
    }
  }

  function handleAddSample() {
    const newOne: Dataset = {
      id: `local-${crypto.randomUUID()}`,
      name: "Sample company (demo)",
      revenue: 100_000_000,
      ebitda: 18_000_000,
      debt: 45_000_000,
      cash: 12_000_000,
      equity: 55_000_000,
    };
    setLocalDatasets((prev) => [...prev, newOne]);
    setSelectedDatasetId(newOne.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Stress tests</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Run interest rate, revenue, and liquidity stress scenarios.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-[var(--muted)]">Input source</span>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === "dataset"}
              onChange={() => setInputMode("dataset")}
              className="rounded-full border-[var(--border)] text-[var(--accent)]"
            />
            <span className="text-sm text-[var(--muted)]">Saved dataset</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === "manual"}
              onChange={() => setInputMode("manual")}
              className="rounded-full border-[var(--border)] text-[var(--accent)]"
            />
            <span className="text-sm text-[var(--muted)]">Manual company</span>
          </label>
        </div>

        {inputMode === "dataset" && (
          <div>
            <label className="block text-xs text-[var(--muted)]">Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="">Select dataset</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.id.slice(0, 8)} {d.revenue != null ? `($${(d.revenue / 1e6).toFixed(1)}M rev)` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {inputMode === "manual" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { key: "revenue", label: "Revenue ($)", scale: 1 },
              { key: "ebitda", label: "EBITDA ($)", scale: 1 },
              { key: "debt", label: "Debt ($)", scale: 1 },
              { key: "cash", label: "Cash ($)", scale: 1 },
              { key: "equity", label: "Equity ($)", scale: 1 },
              { key: "working_capital", label: "Working capital ($)", scale: 1, optional: true },
              { key: "interestRatePct", label: "Interest rate (%)", scale: 0.01 },
              { key: "monthlyBurn", label: "Monthly burn ($)", scale: 1, optional: true },
            ].map(({ key, label, scale, optional }) => (
              <div key={key}>
                <label className="block text-xs text-[var(--muted)]">
                  {label}
                  {optional && " (optional)"}
                </label>
                <input
                  type="number"
                  step={scale}
                  value={(manual as Record<string, number | string>)[key] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next = v === "" ? "" : (key === "interestRatePct" ? Number(v) : Number(v));
                    setManual((m) => ({ ...m, [key]: next }));
                  }}
                  placeholder={optional ? "Auto" : undefined}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs text-[var(--muted)]">Scenario</label>
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value as ScenarioId)}
            className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-[var(--border)] pt-3">
          <span className="mb-2 block text-xs text-[var(--muted)]">Scenario parameters (edit to customize)</span>
          <div className="flex flex-wrap gap-4">
            {(scenarioId === "interest_rate_200bps" || scenarioId === "credit_spread_widening") && (
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  {scenarioId === "interest_rate_200bps" ? "Rate increase (bps)" : "Spread add (bps)"}
                </label>
                <input
                  type="number"
                  min={0}
                  step={25}
                  value={scenarioId === "interest_rate_200bps" ? (overrides.interestRateBps ?? 200) : (overrides.creditSpreadBps ?? 150)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (scenarioId === "interest_rate_200bps") setOverrides((o) => ({ ...o, interestRateBps: Number.isFinite(v) ? v : undefined }));
                    else setOverrides((o) => ({ ...o, creditSpreadBps: Number.isFinite(v) ? v : undefined }));
                  }}
                  className="mt-1 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                />
              </div>
            )}
            {scenarioId === "revenue_down_20" && (
              <div>
                <label className="block text-xs text-[var(--muted)]">Revenue decline (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={overrides.revenueDownPct ?? 20}
                  onChange={(e) => setOverrides((o) => ({ ...o, revenueDownPct: Number(e.target.value) }))}
                  className="mt-1 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                />
              </div>
            )}
            {scenarioId === "liquidity_freeze" && (
              <div>
                <label className="block text-xs text-[var(--muted)]">Burn multiplier</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={overrides.liquidityBurnMultiplier ?? 1.5}
                  onChange={(e) => setOverrides((o) => ({ ...o, liquidityBurnMultiplier: Number(e.target.value) }))}
                  className="mt-1 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                />
              </div>
            )}
            {scenarioId === "volatility_spike" && (
              <div>
                <label className="block text-xs text-[var(--muted)]">Volatility multiplier</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={overrides.volatilityMultiplier ?? 1.5}
                  onChange={(e) => setOverrides((o) => ({ ...o, volatilityMultiplier: Number(e.target.value) }))}
                  className="mt-1 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <button
            onClick={handleRun}
            disabled={loading || (inputMode === "dataset" && !selectedDatasetId)}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Running…" : "Run stress test"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAddSample}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
        >
          Add sample dataset
        </button>
        <span className="text-xs text-[var(--muted)]">
          {apiDatasets.length > 0
            ? "Datasets from Upload are saved to the database; runs on them are persisted."
            : "Sample datasets run locally. Upload CSV/PDF to create datasets saved to the database."}
        </span>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {results && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--muted)]">Fragility score</span>
            <span
              className={`text-2xl font-semibold ${
                results.fragilityScore >= 70 ? "text-[var(--danger)]" : results.fragilityScore >= 50 ? "text-[var(--warning)]" : "text-[var(--foreground)]"
              }`}
            >
              {results.fragilityScore}/100
            </span>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-[var(--muted)]">Risk heatmap</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={results.heatmap}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  layout="vertical"
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="metric" stroke="#94a3b8" fontSize={11} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                  <Bar dataKey="baseline" fill={CHART_COLORS.baseline} name="Baseline" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="stressed" fill={CHART_COLORS.stressed} name="Stressed" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-[var(--muted)]">Capital ratio (projected)</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.capitalDeterioration} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                    formatter={(v: number | undefined) => [`${((v ?? 0) * 100).toFixed(1)}%`, "Ratio"]}
                    labelFormatter={(m) => `Month ${m}`}
                  />
                  <Line type="monotone" dataKey="ratio" stroke="#a78bfa" strokeWidth={2} dot={false} name="Capital ratio" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-[var(--muted)]">Liquidity runway</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.liquidityBurn} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                    formatter={(v: number | undefined) => [`$${((v ?? 0) / 1e6).toFixed(2)}M`, "Cash"]}
                    labelFormatter={(m) => `Month ${m}`}
                  />
                  <Line type="monotone" dataKey="cash" stroke="#22c55e" strokeWidth={2} dot={false} name="Cash" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
