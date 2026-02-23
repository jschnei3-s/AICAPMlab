import { createClient } from "@/lib/supabase/server";
import { getPdfUploadsByUserId } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    if (type === "pdf") {
      const list = await getPdfUploadsByUserId(user.id);
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
