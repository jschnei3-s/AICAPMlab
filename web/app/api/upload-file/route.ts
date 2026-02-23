import { put } from "@vercel/blob";
import { getRequestUserId } from "@/lib/auth-guest";
import { insertUpload, insertFinancialDataset } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST multipart/formData with "file" and optional "name".
 * Stores file in Vercel Blob (public) and saves metadata to Neon Postgres.
 * Use this when Supabase is not configured (Neon-only).
 */
export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "File storage not configured. Add BLOB_READ_WRITE_TOKEN in Vercel (Storage → Blob)." },
        { status: 503 }
      );
    }

    const userId = await getRequestUserId();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const nameOverride = formData.get("name") as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const ext = isPdf ? "pdf" : "csv";
    const pathname = `${userId}/${crypto.randomUUID()}_${file.name}`;

    const blob = await put(pathname, file, { access: "public", addRandomSuffix: false });
    const storage_path = blob.url; // store URL for public blob so we can fetch in analyze-10k

    const upload = await insertUpload(
      userId,
      file.name,
      ext,
      storage_path,
      file.size
    );
    if (!upload) {
      return NextResponse.json({ error: "Failed to save upload" }, { status: 500 });
    }

    let metrics: Record<string, number | null> = {};
    if (!isPdf && file.type.includes("csv")) {
      const text = await file.text();
      metrics = parseCsvMetrics(text);
    }

    const dataset = await insertFinancialDataset(userId, {
      upload_id: upload.id,
      name: nameOverride ?? file.name.replace(/\.(csv|pdf)$/i, ""),
      revenue: metrics.revenue ?? null,
      ebitda: metrics.ebitda ?? null,
      debt: metrics.debt ?? null,
      cash: metrics.cash ?? null,
      equity: metrics.equity ?? null,
      working_capital: metrics.working_capital ?? null,
    });

    return NextResponse.json({ upload, dataset });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
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
