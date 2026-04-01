import fs from "fs";
import path from "path";

interface HelpArticle {
  url: string;
  title: string;
  content: string;
  chunks: string[];
}

// Load articles from the JSON file
export function loadHelpArticles(): HelpArticle[] {
  const filePath = path.join(process.cwd(), "data", "help-articles.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as HelpArticle[];
}

// Build a summary of available topics for the system prompt.
// With 199 articles, we can't inject all content - instead we list
// what's available so the LLM knows to call search_help_articles.
export function buildArticleContext(articles: HelpArticle[]): string {
  const topicList = articles
    .map((a) => `- ${a.title}`)
    .join("\n");
  return (
    `You have access to ${articles.length} T-Mobile help center articles. ` +
    `Use the search_help_articles function to look up specific information. ` +
    `Available topics include:\n\n${topicList}`
  );
}

// Simple keyword search for the search_help_articles function
// This is visible in the debug panel and shows RAG in action
export function searchArticles(
  query: string,
  articles: HelpArticle[]
): Array<{ title: string; snippet: string; url: string; relevance: number }> {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = articles.map((article) => {
    const text = (article.title + " " + article.content).toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      // Count occurrences of each query term
      const regex = new RegExp(term, "gi");
      const matches = text.match(regex);
      if (matches) score += matches.length;
      // Bonus for title matches
      if (article.title.toLowerCase().includes(term)) score += 3;
    }
    return { article, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => ({
      title: s.article.title,
      snippet: s.article.content.substring(0, 500) + "...",
      url: s.article.url,
      relevance: s.score,
    }));
}
