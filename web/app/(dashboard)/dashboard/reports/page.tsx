"use client";

import { useState, useEffect } from "react";

type StressRun = {
  id: string;
  scenario_name: string;
  fragility_score: number | null;
  created_at: string;
};

type DisclosureAnalysis = {
  id: string;
  file_name: string | null;
  disclosure_risk_score: number | null;
  created_at: string;
};

export default function ReportsPage() {
  const [stressRuns, setStressRuns] = useState<StressRun[]>([]);
  const [disclosures, setDisclosures] = useState<DisclosureAnalysis[]>([]);
  const [stressRunId, setStressRunId] = useState<string>("");
  const [disclosureId, setDisclosureId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/stress-runs").then((r) => r.json()),
      fetch("/api/disclosure-analyses").then((r) => r.json()),
    ]).then(([runs, analyses]) => {
      const runList = Array.isArray(runs) ? runs : [];
      const analysisList = Array.isArray(analyses) ? analyses : [];
      setStressRuns(runList);
      setDisclosures(analysisList);
      if (runList.length > 0 && !stressRunId) setStressRunId(runList[0].id);
      if (analysisList.length > 0 && !disclosureId) setDisclosureId(analysisList[0].id);
    }).catch(() => {});
  }, [stressRunId, disclosureId]);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stressRunId: stressRunId || undefined,
          disclosureId: disclosureId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate report");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")?.[1]?.replace(/"/g, "") || "Executive-Risk-Brief.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Reports</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Generate an executive-level PDF risk briefing (company overview, stress impact, disclosure analysis, recommendations).
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-zinc-500">Stress test (optional)</label>
            <select
              value={stressRunId}
              onChange={(e) => setStressRunId(e.target.value)}
              className="mt-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 min-w-[220px]"
            >
              <option value="">Use latest</option>
              {stressRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.scenario_name} {r.fragility_score != null ? `(${r.fragility_score})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500">10-K analysis (optional)</label>
            <select
              value={disclosureId}
              onChange={(e) => setDisclosureId(e.target.value)}
              className="mt-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 min-w-[220px]"
            >
              <option value="">Use latest</option>
              {disclosures.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.file_name || d.id.slice(0, 8)} {d.disclosure_risk_score != null ? `(${d.disclosure_risk_score})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate PDF report"}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Uses latest stress run and 10-K analysis if none selected. Without backend, generates a demo PDF.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-4 text-sm text-zinc-500">
        <strong className="text-zinc-400">Report contents:</strong> Company overview (metrics), key financial risks, stress test impact summary, disclosure sentiment analysis, and recommended risk mitigation actions. Professional, board-level tone.
      </div>
    </div>
  );
}
