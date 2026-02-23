"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_CSV = "text/csv,application/csv,.csv";
const ALLOWED_PDF = "application/pdf,.pdf";

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const accept = `${ALLOWED_CSV},${ALLOWED_PDF}`;

  const validateFile = useCallback((f: File) => {
    const isCsv = f.type === "text/csv" || f.type === "application/csv" || f.name.toLowerCase().endsWith(".csv");
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isCsv && !isPdf) return "Only CSV and PDF files are allowed.";
    if (f.size > 50 * 1024 * 1024) return "File must be under 50MB.";
    return null;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      setError(null);
      setSuccess(false);
      const f = e.dataTransfer.files[0];
      if (!f) return;
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
      setFile(f);
    },
    [validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setSuccess(false);
      const f = e.target.files?.[0];
      if (!f) return;
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
      setFile(f);
    },
    [validateFile]
  );

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      const ext = isPdf ? "pdf" : "csv";
      const path = `${user.id}/${crypto.randomUUID()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      let metrics: Record<string, number | null> = {};
      if (!isPdf && file.type.includes("csv")) {
        const text = await file.text();
        metrics = parseCsvMetrics(text);
      }
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: file.name,
          file_type: ext,
          storage_path: path,
          file_size_bytes: file.size,
          name: file.name.replace(/\.(csv|pdf)$/i, ""),
          ...metrics,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register dataset");
      setSuccess(true);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function parseCsvMetrics(csvText: string): Record<string, number | null> {
    const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return {};
    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
    const row = lines[1].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (keys: string[]) => {
      for (const k of keys) {
        const i = headers.findIndex((h) => h.includes(k));
        if (i >= 0 && row[i]) {
          const n = parseFloat(row[i].replace(/[,$]/g, ""));
          if (!Number.isNaN(n)) return n;
        }
      }
      return null;
    };
    return {
      revenue: get(["revenue", "revenues", "sales"]) ?? null,
      ebitda: get(["ebitda"]) ?? null,
      debt: get(["debt", "total debt", "long-term debt"]) ?? null,
      cash: get(["cash", "cash and equivalents"]) ?? null,
      equity: get(["equity", "shareholders equity", "stockholders equity"]) ?? null,
      working_capital: get(["working capital", "net working capital"]) ?? null,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Upload data</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload CSV financial statements or 10-K PDFs. Drag and drop or select a file.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          dragActive
            ? "border-zinc-500 bg-zinc-800/50"
            : "border-zinc-700 bg-zinc-900/30 hover:border-zinc-600"
        }`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-300"
        >
          {file ? (
            <span className="font-medium text-zinc-200">{file.name}</span>
          ) : (
            "Drop a file here or click to browse"
          )}
        </label>
        <p className="mt-2 text-xs text-zinc-500">
          CSV or PDF, max 50MB
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-sm text-emerald-400">File uploaded successfully.</p>
      )}

      {file && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <button
            type="button"
            onClick={() => { setFile(null); setError(null); setSuccess(false); }}
            className="rounded border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Clear
          </button>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-4 text-sm text-zinc-500">
        <strong className="text-zinc-400">Supported:</strong> Balance sheet, income statement, cash flow (CSV), or 10-K annual report (PDF). Parsing and metric extraction will be wired in a later step.
      </div>
    </div>
  );
}
