"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

export function usePageControl() {
  const router = useRouter();
  const pathname = usePathname();

  const navigateToArticle = useCallback(
    (slug: string) => {
      if (!slug) return false;
      router.push(`/support/articles/${slug}`);
      return true;
    },
    [router]
  );

  const highlightSection = useCallback((heading: string) => {
    const target = findHeadingByText(heading);
    if (!target) return false;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("highlight-glow");
    window.setTimeout(() => {
      target.classList.remove("highlight-glow");
    }, 3000);
    return true;
  }, []);

  const currentArticleSlug = pathname.startsWith("/support/articles/")
    ? pathname.split("/").at(-1) ?? null
    : null;

  return {
    navigateToArticle,
    highlightSection,
    currentArticleSlug,
    pathname,
  };
}

function findHeadingByText(heading: string): HTMLElement | null {
  if (!heading) return null;
  const targetText = heading.toLowerCase().trim();
  const headings = document.querySelectorAll<HTMLElement>(
    "h1, h2, h3, h4, h5, h6"
  );

  for (const element of headings) {
    const value = element.textContent?.toLowerCase().trim() ?? "";
    if (value.includes(targetText)) {
      return element;
    }
  }

  return null;
}
