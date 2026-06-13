import { describe, expect, it } from "vitest";
import { creditsCover, formatCredits, parseCredits } from "./credits";

describe("parseCredits", () => {
  it("parses bare integers", () => {
    expect(parseCredits("123")).toBe(123n);
    expect(parseCredits("0")).toBe(0n);
  });

  it("parses each in-game suffix", () => {
    expect(parseCredits("10K")).toBe(10_000n);
    expect(parseCredits("1M")).toBe(1_000_000n);
    expect(parseCredits("2B")).toBe(2_000_000_000n);
    expect(parseCredits("3T")).toBe(3_000_000_000_000n);
  });

  it("supports decimals and case-insensitive suffixes", () => {
    expect(parseCredits("10.00K")).toBe(10_000n);
    expect(parseCredits("1.36b")).toBe(1_360_000_000n);
    expect(parseCredits("21.5B")).toBe(21_500_000_000n);
  });

  it("trims whitespace and commas", () => {
    expect(parseCredits(" 1,000 ")).toBe(1_000n);
    expect(parseCredits("325 B")).toBe(325_000_000_000n);
  });

  it("returns 0n on garbage", () => {
    expect(parseCredits("")).toBe(0n);
    expect(parseCredits(undefined)).toBe(0n);
    expect(parseCredits("infinite credits")).toBe(0n);
  });

  it("survives Beskar-tier totals past 2^53", () => {
    // 9.999T is larger than Number.MAX_SAFE_INTEGER (~9.007 quadrillion was OK,
    // but at quadrillion+ we'd lose precision in a number-based parser).
    expect(parseCredits("999.99Q")).toBe(999_990_000_000_000_000n);
  });
});

describe("formatCredits", () => {
  it("renders small numbers raw", () => {
    expect(formatCredits(123n)).toBe("123");
    expect(formatCredits(0n)).toBe("0");
  });

  it("picks the largest applicable suffix", () => {
    expect(formatCredits(10_000n)).toBe("10K");
    expect(formatCredits(1_500_000n)).toBe("1.5M");
    expect(formatCredits(21_000_000_000n)).toBe("21B");
    expect(formatCredits(2_000_000_000_000n)).toBe("2T");
  });

  it("round-trips through parseCredits for game-style values", () => {
    for (const raw of ["10K", "1.5M", "21B", "325B", "2T"]) {
      expect(formatCredits(parseCredits(raw))).toBe(raw);
    }
  });
});

describe("parseIncome", () => {
  it("strips /s suffix and parses flat values", async () => {
    const { parseIncome } = await import("./credits");
    expect(parseIncome("16/s")).toBe(16n);
    expect(parseIncome("1.92k/s")).toBe(1_920n);
    expect(parseIncome("4.08k/s")).toBe(4_080n);
    expect(parseIncome("23.33k/s")).toBe(23_330n);
  });

  it("returns null for percentage incomes", async () => {
    const { parseIncome } = await import("./credits");
    expect(parseIncome("5%/s")).toBe(null);
  });

  it("returns 0n for empty/nullish", async () => {
    const { parseIncome } = await import("./credits");
    expect(parseIncome("")).toBe(0n);
    expect(parseIncome(undefined)).toBe(0n);
  });
});

describe("progressPercent", () => {
  it("returns 100 when required is 0 or already covered", async () => {
    const { progressPercent } = await import("./credits");
    expect(progressPercent("", "0")).toBe(100);
    expect(progressPercent("10K", "10K")).toBe(100);
    expect(progressPercent("10K", "1M")).toBe(100);
  });

  it("scales linearly between 0 and 100", async () => {
    const { progressPercent } = await import("./credits");
    expect(progressPercent("10K", "5K")).toBeCloseTo(50, 0);
    expect(progressPercent("100M", "25M")).toBeCloseTo(25, 0);
  });
});

describe("creditsCover", () => {
  it("returns true when current >= required", () => {
    expect(creditsCover("10K", "10K")).toBe(true);
    expect(creditsCover("10K", "1M")).toBe(true);
  });

  it("returns false when current < required", () => {
    expect(creditsCover("10K", "5K")).toBe(false);
    expect(creditsCover("21B", "999M")).toBe(false);
  });

  it("treats empty current as 0", () => {
    expect(creditsCover("10K", "")).toBe(false);
  });
});
