"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

export interface SearchArticle {
  slug: string;
  title: string;
}

export function filterArticleMatches(
  articles: SearchArticle[],
  query: string
): SearchArticle[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 3) return [];

  const terms = normalized.split(/\s+/).filter((term) => term.length > 1);
  if (terms.length === 0) return [];

  return articles
    .map((article) => {
      const title = article.title.toLowerCase();
      let score = 0;

      if (title.includes(normalized)) score += 50;
      for (const term of terms) {
        if (title.includes(term)) score += 10;
      }

      return { article, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((result) => result.article);
}

interface SearchBarProps {
  articles: SearchArticle[];
}

export default function SearchBar({ articles }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => filterArticleMatches(articles, query),
    [articles, query]
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-[500px]">
      <label htmlFor="support-search" className="sr-only">
        Search T-Mobile help articles
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#7d8794]" />
      <input
        id="support-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search help articles"
        className="h-9 w-full rounded-full border border-[#e2e5e9] bg-[#eaedf1] pl-10 pr-4 text-[13px] text-[#1d2329] focus:outline-none focus-visible:ring-2 focus-visible:ring-tm-magenta focus-visible:border-transparent transition"
      />

      {results.length > 0 && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#d9dde3] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          {results.map((article) => (
            <Link
              key={article.slug}
              href={`/support/articles/${article.slug}`}
              onClick={() => setQuery("")}
              className="block border-b border-[#e8ebef] px-4 py-2 text-[12px] text-[#303944] transition last:border-b-0 hover:bg-[#f6f8fa] hover:text-black"
            >
              {article.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
