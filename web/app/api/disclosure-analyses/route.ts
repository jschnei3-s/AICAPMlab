import { createClient } from "@/lib/supabase/server";
import { getDisclosureAnalysesByUserId } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const analyses = await getDisclosureAnalysesByUserId(user.id);
    return NextResponse.json(analyses);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
