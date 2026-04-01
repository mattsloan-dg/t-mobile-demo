/**
 * T-Mobile Help Center Scraper
 *
 * Fetches article content from T-Mobile's support site and outputs
 * structured JSON suitable for RAG (Retrieval Augmented Generation).
 *
 * Usage:
 *   npx tsx scripts/scrape-help.ts
 *
 * Note: T-Mobile's support site may use bot protection (Cloudflare),
 * so a simple fetch + Cheerio approach may not work. For full
 * rendering, a headless browser (e.g. Playwright) would be needed.
 * This script serves as a best-effort utility and falls back to
 * the manually curated data in data/help-articles.json when the
 * fetched content is insufficient.
 */

import * as cheerio from "cheerio";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HELP_ARTICLE_URLS = [
  "https://www.t-mobile.com/support/new-to-tmobile/activate-a-new-device",
  "https://www.t-mobile.com/support/new-to-tmobile/switch-to-tmobile",
  "https://www.t-mobile.com/support/new-to-tmobile/port-your-number",
  "https://www.t-mobile.com/support/account/manage-your-t-mobile-account",
  "https://www.t-mobile.com/support/account/t-mobile-id",
  "https://www.t-mobile.com/support/account/add-a-line",
  "https://www.t-mobile.com/support/billing/understand-your-bill",
  "https://www.t-mobile.com/support/billing/autopay",
  "https://www.t-mobile.com/support/billing/payment-options",
  "https://www.t-mobile.com/support/network-coverage/5g-coverage",
  "https://www.t-mobile.com/support/network-coverage/wi-fi-calling",
  "https://www.t-mobile.com/support/network-coverage/international-roaming",
  "https://www.t-mobile.com/support/plans-features/go5g-plans",
  "https://www.t-mobile.com/support/plans-features/netflix-on-us",
  "https://www.t-mobile.com/support/plans-features/hotspot",
  "https://www.t-mobile.com/support/devices/iphone-setup",
  "https://www.t-mobile.com/support/devices/android-setup",
  "https://www.t-mobile.com/support/devices/esim-activation",
  "https://www.t-mobile.com/support/devices/device-unlock",
  "https://www.t-mobile.com/support/apps-services/t-mobile-app",
  "https://www.t-mobile.com/support/apps-services/scam-shield",
];

const OUTPUT_PATH = join(__dirname, "..", "data", "help-articles.json");

const CHUNK_SIZE = 500; // target words per chunk

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HelpArticle {
  url: string;
  title: string;
  content: string;
  chunks: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chunkText(text: string, maxWords: number = CHUNK_SIZE): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const currentWordCount = current.split(/\s+/).filter(Boolean).length;
    const sentenceWordCount = trimmed.split(/\s+/).filter(Boolean).length;

    if (currentWordCount + sentenceWordCount > maxWords && current.length > 0) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current += (current ? " " : "") + trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

function titleFromSlug(url: string): string {
  const slug = url.split("/").filter(Boolean).pop() ?? "";
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchArticle(
  url: string
): Promise<{ title: string; content: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      console.warn(`  [WARN] HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const selectors = [
      "article",
      '[role="article"]',
      ".article-content",
      ".support-article",
      "main",
      "#main-content",
    ];

    let articleText = "";
    let title = "";

    title =
      $("h1").first().text().trim() ||
      $("title").text().replace(/ \| T-Mobile.*$/, "").trim();

    for (const selector of selectors) {
      const el = $(selector);
      if (el.length > 0) {
        el.find("script, style, nav, footer, header").remove();
        articleText = el.text().replace(/\s+/g, " ").trim();
        if (articleText.length > 100) break;
      }
    }

    if (!articleText || articleText.length < 50) {
      console.warn(`  [WARN] Insufficient content extracted from ${url}`);
      return null;
    }

    return {
      title: title || titleFromSlug(url),
      content: articleText,
    };
  } catch (error) {
    console.warn(
      `  [WARN] Failed to fetch ${url}:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("T-Mobile Help Center Scraper");
  console.log("=".repeat(40));

  let fallbackArticles: HelpArticle[] = [];
  try {
    const raw = readFileSync(OUTPUT_PATH, "utf-8");
    fallbackArticles = JSON.parse(raw);
    console.log(
      `Loaded ${fallbackArticles.length} fallback articles from ${OUTPUT_PATH}`
    );
  } catch {
    console.log("No existing fallback data found; will scrape only.");
  }

  const fallbackMap = new Map(fallbackArticles.map((a) => [a.url, a]));

  const articles: HelpArticle[] = [];
  let scraped = 0;
  let fallbackUsed = 0;

  for (const url of HELP_ARTICLE_URLS) {
    console.log(`\nProcessing: ${url}`);

    const result = await fetchArticle(url);

    if (result && result.content.length >= 50) {
      console.log(
        `  [OK] Scraped "${result.title}" (${result.content.length} chars)`
      );
      articles.push({
        url,
        title: result.title,
        content: result.content,
        chunks: chunkText(result.content),
      });
      scraped++;
    } else if (fallbackMap.has(url)) {
      const fb = fallbackMap.get(url)!;
      console.log(`  [FALLBACK] Using curated content for "${fb.title}"`);
      articles.push(fb);
      fallbackUsed++;
    } else {
      console.warn(`  [SKIP] No content available for ${url}`);
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(articles, null, 2) + "\n", "utf-8");

  console.log("\n" + "=".repeat(40));
  console.log(`Done. ${articles.length} articles written to ${OUTPUT_PATH}`);
  console.log(`  Scraped:  ${scraped}`);
  console.log(`  Fallback: ${fallbackUsed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
