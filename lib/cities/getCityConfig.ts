import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import {
  SEED_LIVE_CITIES,
  SEED_COMING_SOON_CITIES,
  SEED_ALL_CITIES,
  type CityOption,
} from "@/lib/constants/cities";

export type CityConfig = {
  live: CityOption[];
  comingSoon: CityOption[];
  all: CityOption[];
};

export async function getCityConfig(): Promise<CityConfig> {
  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("city_config")
      .select("value, label, status")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return fallback();
    }

    const live = data
      .filter((r: { status: string }) => r.status === "live")
      .map((r: { value: string; label: string; status: string }) => ({
        value: r.value,
        label: r.label,
        status: "live" as const,
      }));

    const comingSoon = data
      .filter((r: { status: string }) => r.status === "coming_soon")
      .map((r: { value: string; label: string; status: string }) => ({
        value: r.value,
        label: r.label,
        status: "coming_soon" as const,
      }));

    return { live, comingSoon, all: [...live, ...comingSoon] };
  } catch {
    return fallback();
  }
}

function fallback(): CityConfig {
  return {
    live: SEED_LIVE_CITIES,
    comingSoon: SEED_COMING_SOON_CITIES,
    all: SEED_ALL_CITIES,
  };
}
