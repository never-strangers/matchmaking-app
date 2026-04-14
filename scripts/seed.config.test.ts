import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  validateConfig,
  mergeWithDefaults,
  type SeedConfig,
} from "./seed/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadConfig(filename: string): SeedConfig {
  const filePath = join(__dirname, "seed/configs", filename);
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  return mergeWithDefaults(raw) as SeedConfig;
}

// ─── bali-dating-imbalance-20f10m ─────────────────────────────────────────────

describe("bali-dating-imbalance-20f10m.json", () => {
  let cfg: SeedConfig;

  it("parses without error", () => {
    expect(() => {
      cfg = loadConfig("bali-dating-imbalance-20f10m.json");
    }).not.toThrow();
  });

  it("has the correct label", () => {
    cfg = loadConfig("bali-dating-imbalance-20f10m.json");
    expect(cfg.label).toBe("bali-dating-imbalance-20f10m");
  });

  it("city is Bali", () => {
    cfg = loadConfig("bali-dating-imbalance-20f10m.json");
    expect(cfg.city).toBe("Bali");
  });

  it("gender split sums to total (20+10=30)", () => {
    cfg = loadConfig("bali-dating-imbalance-20f10m.json");
    const { genderSplit, total } = cfg.users;
    expect(genderSplit).toBeDefined();
    const sum = (genderSplit!.female ?? 0) + (genderSplit!.male ?? 0);
    expect(sum).toBe(30);
    expect(sum).toBe(total);
  });

  it("all required fields are present", () => {
    cfg = loadConfig("bali-dating-imbalance-20f10m.json");
    expect(cfg.label).toBeTruthy();
    expect(cfg.city).toBeTruthy();
    expect(cfg.event?.category).toBe("dating");
    expect(cfg.event?.startAt).toBeTruthy();
    expect(cfg.event?.payment).toBeDefined();
    expect(cfg.users.total).toBeGreaterThan(0);
    expect(cfg.users.statuses).toBeDefined();
  });

  it("passes validateConfig with no errors", () => {
    cfg = loadConfig("bali-dating-imbalance-20f10m.json");
    const errors = validateConfig(cfg);
    expect(errors).toHaveLength(0);
  });

  it("attendees questionnaire questionsCount is in valid range", () => {
    cfg = loadConfig("bali-dating-imbalance-20f10m.json");
    const qc = cfg.attendees?.questionnaire?.questionsCount;
    expect(qc).toBeGreaterThanOrEqual(1);
    expect(qc).toBeLessThanOrEqual(50);
  });
});

// ─── bali-dating-imbalance-40f10m ─────────────────────────────────────────────

describe("bali-dating-imbalance-40f10m.json", () => {
  let cfg: SeedConfig;

  it("parses without error", () => {
    expect(() => {
      cfg = loadConfig("bali-dating-imbalance-40f10m.json");
    }).not.toThrow();
  });

  it("has the correct label", () => {
    cfg = loadConfig("bali-dating-imbalance-40f10m.json");
    expect(cfg.label).toBe("bali-dating-imbalance-40f10m");
  });

  it("gender split sums to total (40+10=50)", () => {
    cfg = loadConfig("bali-dating-imbalance-40f10m.json");
    const { genderSplit, total } = cfg.users;
    expect(genderSplit).toBeDefined();
    const sum = (genderSplit!.female ?? 0) + (genderSplit!.male ?? 0);
    expect(sum).toBe(50);
    expect(sum).toBe(total);
  });

  it("passes validateConfig with no errors", () => {
    cfg = loadConfig("bali-dating-imbalance-40f10m.json");
    const errors = validateConfig(cfg);
    expect(errors).toHaveLength(0);
  });
});
