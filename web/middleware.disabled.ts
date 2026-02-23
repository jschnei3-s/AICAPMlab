// Temporarily disabled: was causing MIDDLEWARE_INVOCATION_FAILED on Vercel Edge.
// Root redirect is handled by app/page.tsx. Re-enable by renaming back to middleware.ts
// if you need auth/session refresh in middleware later.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(_request: NextRequest) {
  try {
    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
