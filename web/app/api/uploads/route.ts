import { getRequestUserId } from "@/lib/auth-guest";
import { getPdfUploadsByUserId } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getRequestUserId();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    if (type === "pdf") {
      let list;
      try {
        list = await getPdfUploadsByUserId(userId);
      } catch (e) {
        console.error("Uploads API: getPdfUploadsByUserId failed", e);
        return NextResponse.json(
          { error: "Database unavailable. Add POSTGRES_URL or DATABASE_URL in Vercel." },
          { status: 503 }
        );
      }
      return NextResponse.json(list);
    }
    return NextResponse.json([]);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
