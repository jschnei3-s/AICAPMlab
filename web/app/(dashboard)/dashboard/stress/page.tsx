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

const CHART_COLORS = { baseline: "#71717a", stressed: "#f43f5e" };

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
        <h1 className="text-lg font-semibold text-zinc-100">Stress tests</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Run interest rate, revenue, and liquidity stress scenarios.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-zinc-500">Input source</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === "dataset"}
              onChange={() => setInputMode("dataset")}
              className="rounded-full border-zinc-600 text-zinc-100"
            />
            <span className="text-sm text-zinc-300">Saved dataset</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === "manual"}
              onChange={() => setInputMode("manual")}
              className="rounded-full border-zinc-600 text-zinc-100"
            />
            <span className="text-sm text-zinc-300">Manual company</span>
          </label>
        </div>

        {inputMode === "dataset" && (
          <div>
            <label className="block text-xs text-zinc-500">Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="mt-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
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
                <label className="block text-xs text-zinc-500">
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
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs text-zinc-500">Scenario</label>
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value as ScenarioId)}
            className="mt-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-zinc-700 pt-3">
          <span className="block text-xs text-zinc-500 mb-2">Scenario parameters (edit to customize)</span>
          <div className="flex flex-wrap gap-4">
            {(scenarioId === "interest_rate_200bps" || scenarioId === "credit_spread_widening") && (
              <div>
                <label className="block text-xs text-zinc-500">
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
                  className="mt-1 w-24 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100"
                />
              </div>
            )}
            {scenarioId === "revenue_down_20" && (
              <div>
                <label className="block text-xs text-zinc-500">Revenue decline (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={overrides.revenueDownPct ?? 20}
                  onChange={(e) => setOverrides((o) => ({ ...o, revenueDownPct: Number(e.target.value) }))}
                  className="mt-1 w-24 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100"
                />
              </div>
            )}
            {scenarioId === "liquidity_freeze" && (
              <div>
                <label className="block text-xs text-zinc-500">Burn multiplier</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={overrides.liquidityBurnMultiplier ?? 1.5}
                  onChange={(e) => setOverrides((o) => ({ ...o, liquidityBurnMultiplier: Number(e.target.value) }))}
                  className="mt-1 w-24 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100"
                />
              </div>
            )}
            {scenarioId === "volatility_spike" && (
              <div>
                <label className="block text-xs text-zinc-500">Volatility multiplier</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={overrides.volatilityMultiplier ?? 1.5}
                  onChange={(e) => setOverrides((o) => ({ ...o, volatilityMultiplier: Number(e.target.value) }))}
                  className="mt-1 w-24 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <button
            onClick={handleRun}
            disabled={loading || (inputMode === "dataset" && !selectedDatasetId)}
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Running…" : "Run stress test"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAddSample}
          className="rounded border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Add sample dataset
        </button>
        <span className="text-xs text-zinc-500">
          {apiDatasets.length > 0
            ? "Datasets from Upload are saved to the database; runs on them are persisted."
            : "Sample datasets run locally. Upload CSV/PDF to create datasets saved to the database."}
        </span>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {results && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">Fragility score</span>
            <span
              className={`text-2xl font-semibold ${
                results.fragilityScore >= 70 ? "text-red-400" : results.fragilityScore >= 50 ? "text-amber-400" : "text-zinc-300"
              }`}
            >
              {results.fragilityScore}/100
            </span>
          </div>

          <div>
            <h2 className="text-sm font-medium text-zinc-400 mb-2">Risk heatmap</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={results.heatmap}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  layout="vertical"
                >
                  <XAxis type="number" stroke="#71717a" fontSize={11} />
                  <YAxis type="category" dataKey="metric" stroke="#71717a" fontSize={11} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b" }}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Bar dataKey="baseline" fill={CHART_COLORS.baseline} name="Baseline" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="stressed" fill={CHART_COLORS.stressed} name="Stressed" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-zinc-400 mb-2">Capital ratio (projected)</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.capitalDeterioration} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b" }}
                    formatter={(v: number | undefined) => [`${((v ?? 0) * 100).toFixed(1)}%`, "Ratio"]}
                    labelFormatter={(m) => `Month ${m}`}
                  />
                  <Line type="monotone" dataKey="ratio" stroke="#a78bfa" strokeWidth={2} dot={false} name="Capital ratio" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-zinc-400 mb-2">Liquidity runway</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.liquidityBurn} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b" }}
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
