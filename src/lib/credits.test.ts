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
