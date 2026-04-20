import { describe, it, expect } from "vitest";
import { formatLocalPrice } from "@/lib/pricing/localCurrency";

describe("formatLocalPrice", () => {
  it("returns null for free events", () => {
    expect(formatLocalPrice(0, "hk")).toBeNull();
    expect(formatLocalPrice(0, "sg")).toBeNull();
  });

  it("returns SGD string for Singapore (same currency)", () => {
    const result = formatLocalPrice(5000, "sg");
    expect(result).not.toBeNull();
    expect(result!.sgd).toBe("S$50.00 SGD");
    expect(result!.local).toBeNull();
    expect(result!.isSameCurrency).toBe(true);
  });

  it("returns HKD estimate for Hong Kong", () => {
    const result = formatLocalPrice(5000, "hk");
    expect(result).not.toBeNull();
    expect(result!.sgd).toBe("S$50.00 SGD");
    expect(result!.local).toContain("HKD");
    expect(result!.isSameCurrency).toBe(false);
  });

  it("returns PHP estimate for Manila", () => {
    const result = formatLocalPrice(3000, "mnl");
    expect(result).not.toBeNull();
    expect(result!.local).toContain("PHP");
  });

  it("returns PHP estimate for Cebu (same as Manila)", () => {
    const result = formatLocalPrice(3000, "ceb");
    expect(result).not.toBeNull();
    expect(result!.local).toContain("PHP");
  });

  it("returns THB estimate for Bangkok", () => {
    const result = formatLocalPrice(4000, "bkk");
    expect(result!.local).toContain("THB");
  });

  it("returns VND estimate for HCMC with thousands formatting", () => {
    const result = formatLocalPrice(5000, "hcmc");
    expect(result!.local).toContain("VND");
    expect(result!.local).toMatch(/₫[\d,]+/);
  });

  it("returns null local for unknown city", () => {
    const result = formatLocalPrice(5000, "xyz");
    expect(result!.local).toBeNull();
  });
});
