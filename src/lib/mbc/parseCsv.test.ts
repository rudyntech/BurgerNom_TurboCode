import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { makeMatchKey, parseMbcCsv, slugifyCategoryKey } from "./parseCsv";
import { MbcSchemaError } from "./types";

const fixturePath = path.join(__dirname, "../../../fixtures/mbc-sample.csv");
const sampleCsv = readFileSync(fixturePath, "utf-8");

describe("parseMbcCsv", () => {
  it("parses restaurant rows preserving source text", () => {
    const result = parseMbcCsv(sampleCsv);
    expect(result.rows).toHaveLength(10);
    expect(result.rows[0].rawLocation).toBe("Bungalow Kitchen, Tiburon");
    expect(result.rows[0].avgRating).toBeCloseTo(4.51);
  });

  it("derives PBASO category columns from the header, ignoring placeholder columns", () => {
    const result = parseMbcCsv(sampleCsv);
    const labels = result.categories.map((c) => c.label);
    expect(labels).toEqual(["Patty", "Bun", "Accoutrements", "Starch", "Overall"]);
    expect(labels).not.toContain("Column 16");
  });

  it("attaches every category score to every restaurant row", () => {
    const result = parseMbcCsv(sampleCsv);
    const first = result.rows[0];
    expect(first.categoryScores).toHaveLength(5);
    expect(first.categoryScores.find((c) => c.label === "Patty")?.score).toBeCloseTo(4.78);
  });

  it("uses the explicit Rank Using Overall column, applying competition-style ties", () => {
    const result = parseMbcCsv(sampleCsv);
    const byLocation = Object.fromEntries(result.rows.map((r) => [r.rawLocation, r.rank]));
    expect(byLocation["Bungalow Kitchen, Tiburon"]).toBe(1);
    expect(byLocation["Inverness Tap Room, Inverness"]).toBe(2);
    expect(byLocation["Insalata's San Anselmo"]).toBe(2);
    expect(byLocation["Picco, Larkspur"]).toBe(4);
  });

  it("computes competition-style ranks from Avg. Rating descending when no rank column is present", () => {
    const minimalCsv = [
      "Location,Avg. Rating,Patty",
      '"A, Town",4.9,4.5',
      '"B, Town",4.9,4.0',
      '"C, Town",4.1,3.5',
    ].join("\n");
    const result = parseMbcCsv(minimalCsv);
    expect(result.rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("throws MbcSchemaError when required columns are missing", () => {
    const broken = "Date,Whatever\n1/1/2024,hello\n";
    expect(() => parseMbcCsv(broken)).toThrow(MbcSchemaError);
  });

  it("throws MbcSchemaError when there are zero usable data rows", () => {
    const headerOnly = "Location,Avg. Rating,Patty\n";
    expect(() => parseMbcCsv(headerOnly)).toThrow(MbcSchemaError);
  });

  it("collapses duplicate restaurants by normalized match key", () => {
    const dup = [
      "Location,Avg. Rating",
      '"Joe\'s Burgers, Novato",4.2',
      '"Joe\'s   Burgers,  Novato",4.2',
    ].join("\n");
    const result = parseMbcCsv(dup);
    expect(result.rows).toHaveLength(1);
  });
});

describe("makeMatchKey", () => {
  it("normalizes whitespace and comma spacing case-insensitively", () => {
    expect(makeMatchKey("  Bungalow Kitchen,   Tiburon ")).toBe(makeMatchKey("bungalow kitchen, tiburon"));
  });
});

describe("slugifyCategoryKey", () => {
  it("produces a stable lowercase snake_case key", () => {
    expect(slugifyCategoryKey("Accoutrements")).toBe("accoutrements");
    expect(slugifyCategoryKey("Avg. Rating")).toBe("avg_rating");
  });
});
