import Papa from "papaparse";
import {
  MbcSchemaError,
  type ParsedCategoryDefinition,
  type ParsedMbcCsv,
  type ParsedRestaurantRow,
} from "./types";

/** Known aliases (lowercased, trimmed) for the fixed metadata columns MBC publishes. */
const COLUMN_ALIASES = {
  date: ["date"],
  location: ["location", "restaurant", "restaurant / location", "name"],
  avgRating: ["avg. rating", "avg rating", "average rating"],
  numRatings: ["# of ratings", "number of ratings", "num ratings", "num. of ratings"],
  averageSansOverall: ["average sans overall"],
  delta: ["delta"],
  rank: ["rank using overall", "rank"],
  rankSansOverall: ["rank sans overall"],
  rankBurgerOnly: ["rank burger only"],
  averageBurgerOnly: ["average burger only"],
} as const;

type ColumnKey = keyof typeof COLUMN_ALIASES;

const PLACEHOLDER_HEADER = /^column\s*\d+$/i;

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumn(headers: string[], aliases: readonly string[]): string | null {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const header of headers) {
    if (normalizedAliases.includes(normalizeHeader(header))) {
      return header;
    }
  }
  return null;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === "") return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function toNullableInt(value: unknown): number | null {
  const num = toNullableNumber(value);
  return num === null ? null : Math.round(num);
}

function parseUsDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, m, d, y] = match;
  const month = m.padStart(2, "0");
  const day = d.padStart(2, "0");
  return `${y}-${month}-${day}`;
}

export function makeMatchKey(rawLocation: string): string {
  return rawLocation
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ");
}

export function slugifyCategoryKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Parses the raw MBC rankings CSV text into a normalized, database-agnostic
 * shape. Pure function -- no network or database access -- so it can be unit
 * tested against a saved fixture file.
 *
 * Throws {@link MbcSchemaError} if the columns this app depends on
 * (restaurant/location text, overall average rating) are missing, since
 * importing without them would either crash or silently corrupt rankings.
 */
export function parseMbcCsv(csvText: string): ParsedMbcCsv {
  const warnings: string[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
  });

  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.filter((e) => e.type !== "FieldMismatch");
    if (fatal.length > 0) {
      throw new MbcSchemaError(
        `CSV parse error: ${fatal.map((e) => e.message).join("; ")}`,
      );
    }
    warnings.push(`${parsed.errors.length} row(s) had an unexpected number of fields.`);
  }

  const headers = parsed.meta.fields ?? [];
  if (headers.length === 0) {
    throw new MbcSchemaError("CSV has no header row / no columns detected.");
  }

  const columnMap: Partial<Record<ColumnKey, string>> = {};
  const missing: string[] = [];
  for (const key of Object.keys(COLUMN_ALIASES) as ColumnKey[]) {
    const found = findColumn(headers, COLUMN_ALIASES[key]);
    if (found) {
      columnMap[key] = found;
    }
  }

  // These two columns are the minimum required to trust the source at all.
  if (!columnMap.location) missing.push("Location");
  if (!columnMap.avgRating) missing.push("Avg. Rating");
  if (missing.length > 0) {
    throw new MbcSchemaError(
      `MBC CSV is missing required column(s): ${missing.join(", ")}. Refusing to import to avoid corrupting existing data.`,
    );
  }
  if (!columnMap.rank) {
    warnings.push('No "Rank Using Overall" column found; ranks will be computed from Avg. Rating order.');
  }

  const knownHeaders = new Set(Object.values(columnMap));
  const categoryHeaders = headers.filter((header) => {
    if (knownHeaders.has(header)) return false;
    const trimmed = header.trim();
    if (trimmed === "") return false;
    if (PLACEHOLDER_HEADER.test(trimmed)) return false;
    return true;
  });

  const categories: ParsedCategoryDefinition[] = categoryHeaders.map((header, index) => ({
    key: slugifyCategoryKey(header),
    label: header.trim(),
    order: index,
  }));

  const rawRows = parsed.data.filter((row) => {
    const locationValue = row[columnMap.location as string];
    return typeof locationValue === "string" && locationValue.trim() !== "";
  });

  if (rawRows.length === 0) {
    throw new MbcSchemaError("MBC CSV contained a header but zero usable data rows.");
  }

  // Competition ranking fallback (1,2,2,4,...) computed from Avg. Rating desc,
  // used for any row missing an explicit/parseable rank.
  const sortedByAvgDesc = [...rawRows]
    .map((row, index) => ({ index, avg: toNullableNumber(row[columnMap.avgRating as string]) }))
    .sort((a, b) => (b.avg ?? -Infinity) - (a.avg ?? -Infinity));

  const computedRankByRowIndex = new Map<number, number>();
  let lastAvg: number | null | undefined = undefined;
  let lastRank = 0;
  sortedByAvgDesc.forEach((entry, position) => {
    if (entry.avg !== lastAvg) {
      lastRank = position + 1;
      lastAvg = entry.avg;
    }
    computedRankByRowIndex.set(entry.index, lastRank);
  });

  const rows: ParsedRestaurantRow[] = rawRows.map((row, index) => {
    const rawLocation = (row[columnMap.location as string] ?? "").trim();
    const explicitRank = columnMap.rank ? toNullableInt(row[columnMap.rank]) : null;
    const rank = explicitRank ?? computedRankByRowIndex.get(index) ?? index + 1;

    const categoryScores = categories.map((category) => ({
      ...category,
      score: toNullableNumber(row[category.label]),
    }));

    return {
      rawLocation,
      matchKey: makeMatchKey(rawLocation),
      rank,
      avgRating: toNullableNumber(row[columnMap.avgRating as string]),
      numRatings: columnMap.numRatings ? toNullableInt(row[columnMap.numRatings]) : null,
      averageSansOverall: columnMap.averageSansOverall
        ? toNullableNumber(row[columnMap.averageSansOverall])
        : null,
      delta: columnMap.delta ? toNullableNumber(row[columnMap.delta]) : null,
      rankSansOverall: columnMap.rankSansOverall ? toNullableInt(row[columnMap.rankSansOverall]) : null,
      rankBurgerOnly: columnMap.rankBurgerOnly ? toNullableInt(row[columnMap.rankBurgerOnly]) : null,
      averageBurgerOnly: columnMap.averageBurgerOnly
        ? toNullableNumber(row[columnMap.averageBurgerOnly])
        : null,
      lastRatedDate: columnMap.date ? parseUsDate(row[columnMap.date]) : null,
      categoryScores,
    };
  });

  // De-duplicate by match key, keeping the best-ranked (lowest rank number)
  // occurrence -- defensive against the source accidentally listing a
  // restaurant twice.
  const byMatchKey = new Map<string, ParsedRestaurantRow>();
  for (const row of rows) {
    const existing = byMatchKey.get(row.matchKey);
    if (!existing || row.rank < existing.rank) {
      byMatchKey.set(row.matchKey, row);
    }
  }
  if (byMatchKey.size !== rows.length) {
    warnings.push(
      `${rows.length - byMatchKey.size} duplicate restaurant row(s) collapsed by matching name/location.`,
    );
  }

  return {
    rows: [...byMatchKey.values()].sort((a, b) => a.rank - b.rank),
    categories,
    warnings,
  };
}
