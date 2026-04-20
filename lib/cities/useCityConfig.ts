"use client";

import { useState, useEffect } from "react";
import {
  SEED_LIVE_CITIES,
  SEED_COMING_SOON_CITIES,
  type CityOption,
} from "@/lib/constants/cities";

type CityConfig = { live: CityOption[]; comingSoon: CityOption[] };

const SEED: CityConfig = { live: SEED_LIVE_CITIES, comingSoon: SEED_COMING_SOON_CITIES };

export function useCityConfig(): CityConfig {
  const [config, setConfig] = useState<CityConfig>(SEED);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((data: CityConfig) => {
        if (Array.isArray(data.live) && Array.isArray(data.comingSoon)) {
          setConfig(data);
        }
      })
      .catch(() => {});
  }, []);

  return config;
}
