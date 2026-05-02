import { describe, expect, it } from "vitest";
import { evaluatePassword, isPasswordValid, passwordsMatch } from "../../lib/password";

describe("password helper", () => {
  it("rejects passwords shorter than 8 chars", () => {
    expect(isPasswordValid("Ab1xyz")).toBe(false);
  });

  it("rejects passwords without a digit", () => {
    expect(isPasswordValid("Abcdefgh")).toBe(false);
  });

  it("rejects passwords without an uppercase letter", () => {
    expect(isPasswordValid("abcdefg1")).toBe(false);
  });

  it("accepts passwords meeting every rule", () => {
    expect(isPasswordValid("Abcdefg1")).toBe(true);
  });

  it("evaluatePassword returns one entry per rule with pass flags", () => {
    const result = evaluatePassword("Abc1");
    expect(result.map((r) => r.id)).toEqual(["length", "digit", "uppercase"]);
    expect(result.find((r) => r.id === "length")?.pass).toBe(false);
    expect(result.find((r) => r.id === "digit")?.pass).toBe(true);
    expect(result.find((r) => r.id === "uppercase")?.pass).toBe(true);
  });

  it("passwordsMatch is false when either side is empty", () => {
    expect(passwordsMatch("", "")).toBe(false);
    expect(passwordsMatch("Abcdefg1", "")).toBe(false);
  });

  it("passwordsMatch is true only on exact, non-empty match", () => {
    expect(passwordsMatch("Abcdefg1", "Abcdefg1")).toBe(true);
    expect(passwordsMatch("Abcdefg1", "Abcdefg2")).toBe(false);
  });
});
