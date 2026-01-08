import { NextResponse } from "next/server";

export async function POST() {
  // This endpoint confirms demo mode is enabled
  // Actual localStorage clearing must happen in browser context
  return NextResponse.json({ 
    ok: true, 
    message: "Demo mode active. Use browser context to clear localStorage." 
  });
}




