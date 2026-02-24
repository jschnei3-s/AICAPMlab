import { createClient } from "@/lib/supabase/server";
import { getRequestUserId } from "@/lib/auth-guest";
import { getUploadById, insertDisclosureAnalysis } from "@/lib/db";
import { analyze10kWithOpenAI } from "@/lib/analyze-10k";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

function isBlobUrl(path: string): boolean {
  return path.startsWith("http") && path.includes("blob.vercel-storage.com");
}

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { uploadId } = body as { uploadId: string };
    if (!uploadId) {
      return Response.json({ error: "uploadId required" }, { status: 400 });
    }

    const upload = await getUploadById(uploadId, userId);
    if (!upload || upload.file_type !== "pdf") {
      return Response.json({ error: "PDF upload not found" }, { status: 404 });
    }

    let buffer: Uint8Array;
    if (isBlobUrl(upload.storage_path)) {
      const res = await fetch(upload.storage_path);
      if (!res.ok) {
        return Response.json(
          { error: "Failed to download file from storage" },
          { status: 400 }
        );
      }
      const ab = await res.arrayBuffer();
      buffer = new Uint8Array(ab);
    } else {
      try {
        const supabase = await createClient();
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("uploads")
          .download(upload.storage_path);

        if (downloadError || !fileData) {
          return Response.json(
            { error: downloadError?.message ?? "Failed to download file" },
            { status: 400 }
          );
        }
        buffer = new Uint8Array(await fileData.arrayBuffer());
      } catch {
        return Response.json(
          { error: "This file was uploaded with Supabase storage. Configure Supabase or re-upload the file." },
          { status: 400 }
        );
      }
    }

    // pdf-parse (pdf.js) expects DOMMatrix in Node; polyfill for serverless
    if (typeof globalThis.DOMMatrix === "undefined") {
      (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = class DOMMatrix {
        a = 1;
        b = 0;
        c = 0;
        d = 1;
        e = 0;
        f = 0;
        constructor(init?: string | number[]) {
          if (typeof init === "string" && init.startsWith("matrix(")) {
            const m = init.replace(/matrix\(|\)/g, "").split(/,\s*/).map(Number);
            if (m.length >= 6) {
              this.a = m[0]; this.b = m[1]; this.c = m[2]; this.d = m[3]; this.e = m[4]; this.f = m[5];
            }
          } else if (Array.isArray(init) && init.length >= 6) {
            this.a = init[0]; this.b = init[1]; this.c = init[2]; this.d = init[3]; this.e = init[4]; this.f = init[5];
          }
        }
        toString() {
          return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`;
        }
        multiply() {
          return this;
        }
        translate() {
          return this;
        }
        scale() {
          return this;
        }
        invertSelf() {
          return this;
        }
      };
    }

    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const text = textResult.text ?? "";
    await parser.destroy();

    if (!text || text.trim().length < 100) {
      return Response.json(
        { error: "PDF has no extractable text or is too short" },
        { status: 400 }
      );
    }

    const result = await analyze10kWithOpenAI(text, apiKey);

    const saved = await insertDisclosureAnalysis(
      userId,
      uploadId,
      upload.file_name,
      result.disclosureRiskScore,
      result.sentimentScore,
      {
        riskFactorSentiment: result.riskFactorSentiment,
        regulatoryKeywordCount: result.regulatoryKeywordCount,
        litigationMentions: result.litigationMentions,
        riskyParagraphs: result.riskyParagraphs,
        executiveSummary: result.executiveSummary,
      }
    );

    return Response.json({
      id: saved?.id,
      disclosureRiskScore: result.disclosureRiskScore,
      sentimentScore: result.sentimentScore,
      riskFactorSentiment: result.riskFactorSentiment,
      regulatoryKeywordCount: result.regulatoryKeywordCount,
      litigationMentions: result.litigationMentions,
      riskyParagraphs: result.riskyParagraphs,
      executiveSummary: result.executiveSummary,
    });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
