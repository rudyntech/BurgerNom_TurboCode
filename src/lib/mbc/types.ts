export interface ParsedCategoryDefinition {
  key: string;
  label: string;
  order: number;
}

export interface ParsedCategoryScore {
  key: string;
  label: string;
  order: number;
  score: number | null;
}

export interface ParsedRestaurantRow {
  rawLocation: string;
  matchKey: string;
  rank: number;
  avgRating: number | null;
  numRatings: number | null;
  averageSansOverall: number | null;
  delta: number | null;
  rankSansOverall: number | null;
  rankBurgerOnly: number | null;
  averageBurgerOnly: number | null;
  lastRatedDate: string | null;
  categoryScores: ParsedCategoryScore[];
}

export interface ParsedMbcCsv {
  rows: ParsedRestaurantRow[];
  categories: ParsedCategoryDefinition[];
  warnings: string[];
}

/**
 * Thrown when the CSV no longer looks like an MBC export we understand
 * (required columns missing/renamed). Callers must treat this as a signal to
 * abort the import without touching any stored data.
 */
export class MbcSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MbcSchemaError";
  }
}
