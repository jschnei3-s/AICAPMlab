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
import { SCENARIOS, runStress, type ScenarioId } from "@/lib/stress-engine";

type Dataset = {
  id: string;
  name: string | null;
  revenue: number | null;
  ebitda: number | null;
  debt: number | null;
  cash: number | null;
  equity: number | null;
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

  function handleRun() {
    if (!selectedDatasetId) {
      setError("Select a dataset.");
      return;
    }
    const dataset = datasets.find((d) => d.id === selectedDatasetId);
    if (!dataset) {
      setError("Dataset not found.");
      return;
    }
    setError(null);
    setResults(null);
    setLoading(true);
    try {
      const out = runStress(
        {
          revenue: dataset.revenue,
          ebitda: dataset.ebitda,
          debt: dataset.debt,
          cash: dataset.cash,
          equity: dataset.equity,
          working_capital: null,
        },
        scenarioId
      );
      setResults(out);
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

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
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
        <button
          onClick={handleRun}
          disabled={loading || !selectedDatasetId}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Running…" : "Run stress test"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAddSample}
          className="rounded border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Add sample dataset
        </button>
        <span className="text-xs text-zinc-500">Runs locally without backend</span>
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
