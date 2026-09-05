const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being below
   between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each
   few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers
   herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more
   most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same
   shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them
   themselves then there there's these they they'd they'll they're they've this those through to too under
   until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's
   which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours
   yourself yourselves it's really pretty just very quite also got get one place burger food really
  `
    .split(/\s+/)
    .filter(Boolean),
);

/** Lowercase alphabetic tokens of length >= 3, stopwords removed. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z']+/g) ?? [])
    .map((word) => word.replace(/^'+|'+$/g, ""))
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

export interface KeywordSignal {
  word: string;
  highRatedCount: number;
  lowRatedCount: number;
}

/**
 * Surfaces words that recur disproportionately in comments left on
 * highly-rated vs poorly-rated restaurants -- a lightweight, free
 * alternative to sending comment text to a paid LLM for sentiment/topic
 * extraction. Good enough to power simple "you often mention X" statements.
 */
export function extractRecurringWords(
  entries: { comment: string | null; overallRating: number | null }[],
  options: { minMentions?: number; limit?: number } = {},
): KeywordSignal[] {
  const minMentions = options.minMentions ?? 2;
  const limit = options.limit ?? 5;

  const counts = new Map<string, KeywordSignal>();
  for (const entry of entries) {
    if (!entry.comment) continue;
    const isHighRated = (entry.overallRating ?? 0) >= 4;
    const isLowRated = entry.overallRating !== null && entry.overallRating < 3;
    const seenInThisComment = new Set(tokenize(entry.comment));
    for (const word of seenInThisComment) {
      const existing = counts.get(word) ?? { word, highRatedCount: 0, lowRatedCount: 0 };
      if (isHighRated) existing.highRatedCount += 1;
      if (isLowRated) existing.lowRatedCount += 1;
      counts.set(word, existing);
    }
  }

  return [...counts.values()]
    .filter((c) => c.highRatedCount + c.lowRatedCount >= minMentions)
    .sort((a, b) => b.highRatedCount - b.lowRatedCount - (a.highRatedCount - a.lowRatedCount))
    .slice(0, limit);
}
