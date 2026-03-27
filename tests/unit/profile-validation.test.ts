import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isAtLeast21,
  parseDateOfBirth,
  validateDob21Plus,
  normalizeGender,
  getDobDateInputBounds,
  AGE_ERROR_MESSAGE,
  MIN_AGE,
} from "@/lib/profile-validation";

// ─── isAtLeast21 ──────────────────────────────────────────────────────────────

describe("isAtLeast21", () => {
  // Pin "today" to 2026-03-27 so tests don't drift
  const TODAY = new Date("2026-03-27");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for someone who turned 21 today", () => {
    expect(isAtLeast21("2005-03-27")).toBe(true);
  });

  it("returns true for someone well over 21", () => {
    expect(isAtLeast21("1990-01-01")).toBe(true);
  });

  it("returns false for someone who turns 21 tomorrow", () => {
    expect(isAtLeast21("2005-03-28")).toBe(false);
  });

  it("returns false for someone who turned 21 yesterday (still 20 until their birthday)", () => {
    // Born 2005-03-28; today (2026-03-27) they are still 20
    expect(isAtLeast21("2005-03-28")).toBe(false);
  });

  it("returns false for a minor", () => {
    expect(isAtLeast21("2010-06-15")).toBe(false);
  });

  it("accepts a Date object", () => {
    expect(isAtLeast21(new Date("1995-06-15"))).toBe(true);
  });

  it("returns false for an invalid date string", () => {
    expect(isAtLeast21("not-a-date")).toBe(false);
  });

  it("handles leap-year birthday (Feb 29) correctly", () => {
    // Born 2004-02-29 (leap year); today 2026-03-27 → age 22
    expect(isAtLeast21("2004-02-29")).toBe(true);
  });

  it("returns true exactly on 21st birthday (month/day boundary)", () => {
    // Born exactly 21 years ago today
    expect(isAtLeast21("2005-03-27")).toBe(true);
  });
});

// ─── parseDateOfBirth ─────────────────────────────────────────────────────────

describe("parseDateOfBirth", () => {
  it("parses ISO format yyyy-mm-dd", () => {
    expect(parseDateOfBirth("1995-06-15")).toBe("1995-06-15");
  });

  it("zero-pads month and day in ISO output", () => {
    expect(parseDateOfBirth("1995-6-5")).toBe("1995-06-05");
  });

  it("parses dd/mm/yyyy format", () => {
    expect(parseDateOfBirth("15/06/1995")).toBe("1995-06-15");
  });

  it("parses dd-mm-yyyy format", () => {
    expect(parseDateOfBirth("15-06-1995")).toBe("1995-06-15");
  });

  it("parses single-digit day and month in dd/mm/yyyy", () => {
    expect(parseDateOfBirth("5/6/1995")).toBe("1995-06-05");
  });

  it("returns null for empty string", () => {
    expect(parseDateOfBirth("")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(parseDateOfBirth(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseDateOfBirth(undefined)).toBeNull();
  });

  it("returns null for completely invalid input", () => {
    expect(parseDateOfBirth("not-a-date-at-all!!")).toBeNull();
  });

  it("rejects invalid month (13) in ISO format", () => {
    // Month 13 is invalid; should fall through to Date parse which also fails
    const result = parseDateOfBirth("1995-13-01");
    // The regex accepts it but Date("1995-13-01") is invalid — should return null
    expect(result).toBeNull();
  });

  it("rejects invalid day (0) in ISO format", () => {
    const result = parseDateOfBirth("1995-06-00");
    expect(result).toBeNull();
  });
});

// ─── validateDob21Plus ────────────────────────────────────────────────────────

describe("validateDob21Plus", () => {
  const TODAY = new Date("2026-03-27");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for a valid 21+ DOB", () => {
    expect(validateDob21Plus("1990-01-01")).toBeNull();
  });

  it("returns age error message for a minor", () => {
    expect(validateDob21Plus("2010-06-15")).toBe(AGE_ERROR_MESSAGE);
  });

  it("returns required error for empty string", () => {
    expect(validateDob21Plus("")).toMatch(/required/i);
  });

  it("returns required error for null", () => {
    expect(validateDob21Plus(null)).toMatch(/required/i);
  });

  it("returns format error for unparseable date", () => {
    expect(validateDob21Plus("banana")).toMatch(/valid date/i);
  });

  it("accepts dd/mm/yyyy format and validates correctly", () => {
    expect(validateDob21Plus("15/06/1990")).toBeNull();
  });

  it("rejects dd/mm/yyyy for someone under 21", () => {
    expect(validateDob21Plus("15/06/2010")).toBe(AGE_ERROR_MESSAGE);
  });
});

// ─── normalizeGender ─────────────────────────────────────────────────────────

describe("normalizeGender", () => {
  it("normalizes 'male' to 'male'", () => {
    expect(normalizeGender("male")).toBe("male");
  });

  it("normalizes 'Male' (uppercase) to 'male'", () => {
    expect(normalizeGender("Male")).toBe("male");
  });

  it("normalizes 'm' shorthand to 'male'", () => {
    expect(normalizeGender("m")).toBe("male");
  });

  it("normalizes 'female' to 'female'", () => {
    expect(normalizeGender("female")).toBe("female");
  });

  it("normalizes 'Female' (uppercase) to 'female'", () => {
    expect(normalizeGender("Female")).toBe("female");
  });

  it("normalizes 'f' shorthand to 'female'", () => {
    expect(normalizeGender("f")).toBe("female");
  });

  it("normalizes 'other' to 'other'", () => {
    expect(normalizeGender("other")).toBe("other");
  });

  it("normalizes 'others' to 'other'", () => {
    expect(normalizeGender("others")).toBe("other");
  });

  it("normalizes 'non-binary' to 'other'", () => {
    expect(normalizeGender("non-binary")).toBe("other");
  });

  it("returns null for unknown value", () => {
    expect(normalizeGender("alien")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeGender("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(normalizeGender(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeGender(undefined)).toBeNull();
  });

  it("trims whitespace before normalizing", () => {
    expect(normalizeGender("  male  ")).toBe("male");
  });
});

// ─── getDobDateInputBounds ────────────────────────────────────────────────────

describe("getDobDateInputBounds", () => {
  const TODAY = new Date("2026-03-27");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("min is always 1900-01-01", () => {
    expect(getDobDateInputBounds().min).toBe("1900-01-01");
  });

  it(`max is exactly ${MIN_AGE} years before today`, () => {
    // With today = 2026-03-27, max should be 2005-03-27
    expect(getDobDateInputBounds().max).toBe("2005-03-27");
  });

  it("max is in YYYY-MM-DD format", () => {
    expect(getDobDateInputBounds().max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
