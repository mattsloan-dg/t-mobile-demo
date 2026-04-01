import { describe, expect, it } from "vitest";
import { filterArticleMatches, type SearchArticle } from "./SearchBar";

const ARTICLES: SearchArticle[] = [
  { slug: "i-cant-log-in", title: "I can't log in" },
  { slug: "change-your-password", title: "Change your password" },
  { slug: "buy-or-sell-crypto", title: "Buy or sell crypto" },
];

describe("filterArticleMatches", () => {
  it("returns empty results for blank or tiny query", () => {
    expect(filterArticleMatches(ARTICLES, "")).toEqual([]);
    expect(filterArticleMatches(ARTICLES, "lo")).toEqual([]);
  });

  it("finds strong title matches first", () => {
    const results = filterArticleMatches(ARTICLES, "log in");
    expect(results[0]?.slug).toBe("i-cant-log-in");
  });

  it("limits output count", () => {
    const longResults = filterArticleMatches(
      Array.from({ length: 20 }).map((_, idx) => ({
        slug: `slug-${idx}`,
        title: `Article ${idx} password`,
      })),
      "password"
    );
    expect(longResults.length).toBe(8);
  });
});
