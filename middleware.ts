import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (entire tree: static, image, Turbopack chunks, etc.)
     * - favicon.ico
     * - static assets (images, js, css, etc.)
     * Excluding .js avoids middleware running on Next dev chunks (e.g. main-app.js, app-pages-internals.js).
     */
    "/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|ico)$).*)",
  ],
};
