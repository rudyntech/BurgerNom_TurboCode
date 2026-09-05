import { describe, expect, it } from "vitest";
import { extractRecurringWords, tokenize } from "./keywords";

describe("tokenize", () => {
  it("lowercases, strips punctuation, and removes short/stop words", () => {
    expect(tokenize("The Patty was SO juicy and crispy!")).toEqual(["patty", "juicy", "crispy"]);
  });
});

describe("extractRecurringWords", () => {
  it("surfaces words that recur across high-rated comments", () => {
    const entries = [
      { comment: "so juicy and crispy bun", overallRating: 5 },
      { comment: "incredibly juicy patty", overallRating: 4.5 },
      { comment: "kind of dry, disappointing", overallRating: 2 },
    ];
    const result = extractRecurringWords(entries, { minMentions: 2 });
    expect(result.map((r) => r.word)).toContain("juicy");
  });

  it("ignores comments below the minimum mention threshold", () => {
    const entries = [{ comment: "one-off word soup", overallRating: 5 }];
    expect(extractRecurringWords(entries, { minMentions: 2 })).toHaveLength(0);
  });

  it("handles restaurants with no comments gracefully", () => {
    const entries = [{ comment: null, overallRating: 4 }];
    expect(extractRecurringWords(entries)).toHaveLength(0);
  });
});
