import fs from "node:fs";
import path from "node:path";

export interface Article {
  slug: string;
  url: string;
  title: string;
  content: string;
  category: string;
}

export interface Category {
  name: string;
  slug: string;
  articles: Article[];
}

export const CATEGORY_NAMES: Record<string, string> = {
  "getting-started": "Getting Started",
  "account-and-billing": "Account & Billing",
  "network-and-coverage": "Network & Coverage",
  "plans-and-features": "Plans & Features",
  devices: "Devices",
  "apps-and-services": "Apps & Services",
  "general-questions": "General questions",
};

let articleCache: Article[] | null = null;

interface RawArticle {
  url: string;
  title: string;
  content: string;
}

export function loadArticles(): Article[] {
  if (articleCache) return articleCache;

  const filePath = path.join(process.cwd(), "data", "help-articles-full.json");
  const rawArticles = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  ) as RawArticle[];

  articleCache = rawArticles.map((article) => {
    const slug = parseSlug(article.url);
    const category = inferCategory(article);

    return {
      slug,
      url: article.url,
      title: article.title,
      content: article.content,
      category,
    };
  });

  return articleCache;
}

export function getArticleBySlug(slug: string): Article | undefined {
  return loadArticles().find((article) => article.slug === slug);
}

export function getCategories(): Category[] {
  const articlesByCategory = new Map<string, Article[]>();
  for (const article of loadArticles()) {
    const list = articlesByCategory.get(article.category) ?? [];
    list.push(article);
    articlesByCategory.set(article.category, list);
  }

  const predefined = Object.entries(CATEGORY_NAMES).map(([slug, name]) => ({
    slug,
    name,
    articles: sortArticles(articlesByCategory.get(slug) ?? []),
  }));

  const unknownCategories = [...articlesByCategory.keys()]
    .filter((slug) => !(slug in CATEGORY_NAMES))
    .sort((a, b) => a.localeCompare(b))
    .map((slug) => ({
      slug,
      name: humanizeSlug(slug),
      articles: sortArticles(articlesByCategory.get(slug) ?? []),
    }));

  return [...predefined, ...unknownCategories];
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return getCategories().find((category) => category.slug === slug);
}

export function getAllSlugs(): string[] {
  return loadArticles().map((article) => article.slug);
}

export function searchArticles(query: string): Article[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);

  if (terms.length === 0) return [];

  return loadArticles()
    .map((article) => {
      const title = article.title.toLowerCase();
      const text = `${article.title} ${article.content}`.toLowerCase();
      let score = 0;

      for (const term of terms) {
        if (title.includes(term)) score += 8;
        const matches = text.match(new RegExp(escapeRegex(term), "g"));
        if (matches) score += matches.length;
      }

      return { article, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((result) => result.article);
}

function sortArticles(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => a.title.localeCompare(b.title));
}

function parseSlug(url: string): string {
  return url.replace(/\/$/, "").split("/").pop() ?? "";
}

function inferCategory(article: RawArticle): string {
  const fromBreadcrumb = inferCategoryFromBreadcrumb(article.content);
  if (fromBreadcrumb) return fromBreadcrumb;

  const fromKeywords = inferCategoryFromKeywords(article.title, article.content);
  if (fromKeywords) return fromKeywords;

  return "general-questions";
}

function inferCategoryFromBreadcrumb(content: string): string | null {
  const matches = content.matchAll(/\/support\/([a-z0-9-]+)\//g);

  for (const match of matches) {
    const slug = match[1];
    if (slug && slug in CATEGORY_NAMES) {
      return slug;
    }
  }

  return null;
}

function inferCategoryFromKeywords(
  title: string,
  content: string
): string | null {
  const text = `${title} ${content}`.toLowerCase();
  const rules: Array<[string, string[]]> = [
    ["getting-started", ["getting started", "new customer", "setup", "activate", "first time", "switch", "sprint"]],
    ["account-and-billing", ["bill", "payment", "charge", "invoice", "account", "pin", "password", "autopay", "credit", "log in", "sign in", "2fa", "two-factor", "verify"]],
    ["network-and-coverage", ["coverage", "signal", "network", "5g", "tower", "outage", "roaming", "international", "wi-fi calling", "dead zone"]],
    ["plans-and-features", ["plan", "go5g", "essentials", "magenta", "hotspot", "netflix", "add-on", "voicemail", "upgrade", "prepaid"]],
    ["devices", ["device", "phone", "sim", "esim", "iphone", "samsung", "android", "troubleshoot", "restart", "update", "tablet", "unlock"]],
    ["apps-and-services", ["app", "t-mobile app", "t-life", "scam shield", "digits", "nameid", "familywhere", "money"]],
  ];

  for (const [category, keywords] of rules) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }

  return null;
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
