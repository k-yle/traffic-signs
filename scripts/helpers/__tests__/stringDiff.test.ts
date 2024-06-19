import { expect, describe, it } from "vitest";
import { stringDiff } from "../stringDiff.js";

describe("stringDiff", () => {
  it("works", () => {
    expect(
      stringDiff(["a_1_b", "a_2_b", "a_123_b", "a_123123123123_b", "a__b"]),
    ).toStrictEqual({
      "": "a__b",
      "1": "a_1_b",
      "123": "a_123_b",
      "123123123123": "a_123123123123_b",
      "2": "a_2_b",
    });
  });

  it("handles nothing in common", () => {
    expect(stringDiff(["abc", "xyz"])).toStrictEqual({ "": "xyz" });
  });

  it("handles a single value", () => {
    expect(stringDiff(["abc"])).toStrictEqual({ "": "abc" });
  });

  it("handles an empty array", () => {
    expect(stringDiff([])).toStrictEqual({});
  });
});
