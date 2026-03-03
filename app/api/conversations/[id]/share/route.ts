import { NextRequest } from "next/server";

/** Phone sharing removed. Use POST /api/conversations/[id]/share-instagram for Instagram only. */
export async function POST(
  _req: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  return new Response(
    JSON.stringify({
      error: "Use POST /api/conversations/[id]/share-instagram to share Instagram",
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
