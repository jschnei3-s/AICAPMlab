"use client";

import { useState, useEffect } from "react";

type PdfUpload = {
  id: string;
  file_name: string;
  created_at: string;
};

type AnalysisResult = {
  id?: string;
  disclosureRiskScore: number;
  sentimentScore: number;
  riskFactorSentiment: string;
  regulatoryKeywordCount: number;
  litigationMentions: string[];
  riskyParagraphs: { excerpt: string; reason: string }[];
  executiveSummary: string;
};

export default function AnalysisPage() {
  const [pdfs, setPdfs] = useState<PdfUpload[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    fetch("/api/uploads?type=pdf")
      .then(async (r) => {
        const data = await r.json();
        return { ok: r.ok, data, status: r.status } as const;
      })
      .then((out) => {
        if (!out.ok) {
          const msg = (out.data?.error as string) || (out.status === 401 ? "Please sign in to view PDFs." : "Failed to load PDFs.");
          setError(msg);
          setPdfs([]);
          return;
        }
        const list = Array.isArray(out.data) ? out.data : [];
        setPdfs(list);
        setError(null);
        if (list.length > 0 && !selectedUploadId) setSelectedUploadId(list[0].id);
      })
      .catch(() => {
        setPdfs([]);
        setError("Failed to load PDF list.");
      });
  }, [selectedUploadId]);

  async function handleRun() {
    if (!selectedUploadId) {
      setError("Select a 10-K PDF.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-10k", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: selectedUploadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">10-K disclosure risk</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Run AI sentiment and risk analysis on uploaded 10-K PDFs.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <div>
          <label className="block text-xs text-zinc-500">10-K PDF</label>
          <select
            value={selectedUploadId}
            onChange={(e) => setSelectedUploadId(e.target.value)}
            className="mt-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 min-w-[200px]"
          >
            <option value="">Select file</option>
            {pdfs.map((p) => (
              <option key={p.id} value={p.id}>{p.file_name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={loading || !selectedUploadId}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Run analysis"}
        </button>
      </div>

      {pdfs.length === 0 && (
        <p className="text-sm text-zinc-500">
          No PDF uploads yet. Upload a 10-K PDF in Upload data first.
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="block text-xs text-zinc-500">Disclosure risk score</span>
              <span
                className={`text-2xl font-semibold ${
                  result.disclosureRiskScore >= 70 ? "text-red-400" : result.disclosureRiskScore >= 50 ? "text-amber-400" : "text-zinc-300"
                }`}
              >
                {result.disclosureRiskScore}/100
              </span>
            </div>
            <div>
              <span className="block text-xs text-zinc-500">Sentiment (risk tone)</span>
              <span className="text-2xl font-semibold text-zinc-300">{result.sentimentScore}/100</span>
            </div>
            <div>
              <span className="block text-xs text-zinc-500">Regulatory keywords</span>
              <span className="text-2xl font-semibold text-zinc-300">{result.regulatoryKeywordCount}</span>
            </div>
          </div>

          {result.executiveSummary && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <h2 className="text-sm font-medium text-zinc-400 mb-2">Executive summary</h2>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{result.executiveSummary}</p>
            </div>
          )}

          {result.riskFactorSentiment && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <h2 className="text-sm font-medium text-zinc-400 mb-2">Risk factor sentiment</h2>
              <p className="text-sm text-zinc-300">{result.riskFactorSentiment}</p>
            </div>
          )}

          {result.litigationMentions.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <h2 className="text-sm font-medium text-zinc-400 mb-2">Litigation mentions</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                {result.litigationMentions.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {result.riskyParagraphs.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <h2 className="text-sm font-medium text-zinc-400 mb-3">Highlighted risky excerpts</h2>
              <ul className="space-y-3">
                {result.riskyParagraphs.map((p, i) => (
                  <li key={i} className="border-l-2 border-amber-500/50 pl-3 py-1">
                    <p className="text-sm text-zinc-300">{p.excerpt}</p>
                    <p className="text-xs text-zinc-500 mt-1">— {p.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
