import { getCityConfig } from "@/lib/cities/getCityConfig";

export async function GET() {
  const config = await getCityConfig();
  return Response.json(
    { live: config.live, comingSoon: config.comingSoon },
    { headers: { "Cache-Control": "no-store" } }
  );
}
