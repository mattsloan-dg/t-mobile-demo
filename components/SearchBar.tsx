"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
  variant?: "default" | "hero";
}

export default function SearchBar({ articles, variant = "default" }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => filterArticleMatches(articles, query),
    [articles, query]
  );

  const isHero = variant === "hero";

  return (
    <div ref={containerRef} className={cn("relative w-full", isHero ? "max-w-[600px]" : "max-w-[500px]")}>
      <label htmlFor="support-search" className="sr-only">
        Search T-Mobile help articles
      </label>
      <Search
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2",
          isHero ? "size-5 text-gray-400" : "size-4 text-[#7d8794]"
        )}
      />
      <input
        id="support-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search help articles"
        className={cn(
          "w-full transition focus:outline-none",
          isHero
            ? "h-14 rounded-full bg-white pl-12 pr-6 text-[16px] text-gray-900 shadow-xl shadow-black/10 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-white/50"
            : "h-9 rounded-full border border-[#e2e5e9] bg-[#eaedf1] pl-10 pr-4 text-[13px] text-[#1d2329] focus-visible:ring-2 focus-visible:ring-tm-magenta focus-visible:border-transparent"
        )}
      />

      {results.length > 0 && (
        <div className={cn(
          "absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg",
          isHero ? "border-gray-200 shadow-black/10" : "border-[#d9dde3] shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
        )}>
          {results.map((article) => (
            <Link
              key={article.slug}
              href={`/support/articles/${article.slug}`}
              onClick={() => setQuery("")}
              className={cn(
                "block border-b border-gray-100 px-5 py-3 transition last:border-b-0 hover:bg-gray-50",
                isHero
                  ? "text-[15px] text-gray-700 hover:text-black"
                  : "text-[12px] text-[#303944] hover:text-black"
              )}
            >
              {article.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
