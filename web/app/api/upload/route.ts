import { getRequestUserId } from "@/lib/auth-guest";
import { insertUpload, insertFinancialDataset } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId();

    const body = await req.json();
    const {
      file_name,
      file_type,
      storage_path,
      file_size_bytes,
      name,
      revenue,
      ebitda,
      debt,
      cash,
      equity,
      working_capital,
    } = body as {
      file_name: string;
      file_type: string;
      storage_path: string;
      file_size_bytes?: number | null;
      name?: string | null;
      revenue?: number | null;
      ebitda?: number | null;
      debt?: number | null;
      cash?: number | null;
      equity?: number | null;
      working_capital?: number | null;
    };

    if (!file_name || !file_type || !storage_path) {
      return NextResponse.json(
        { error: "file_name, file_type, storage_path required" },
        { status: 400 }
      );
    }

    const upload = await insertUpload(
      userId,
      file_name,
      file_type,
      storage_path,
      file_size_bytes ?? null
    );
    if (!upload) {
      return NextResponse.json({ error: "Failed to save upload" }, { status: 500 });
    }

    const dataset = await insertFinancialDataset(userId, {
      upload_id: upload.id,
      name: name ?? file_name,
      revenue: revenue ?? null,
      ebitda: ebitda ?? null,
      debt: debt ?? null,
      cash: cash ?? null,
      equity: equity ?? null,
      working_capital: working_capital ?? null,
    });

    return NextResponse.json({ upload, dataset });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
