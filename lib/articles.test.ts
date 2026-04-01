import { describe, expect, it } from "vitest";
import {
  getAllSlugs,
  getArticleBySlug,
  getCategories,
  searchArticles,
  loadArticles,
} from "./articles";

describe("articles data layer", () => {
  it("loads all scraped help articles", () => {
    const articles = loadArticles();
    expect(articles.length).toBeGreaterThan(100);
    expect(articles[0]?.slug).toBeTruthy();
    expect(articles[0]?.title).toBeTruthy();
    expect(articles[0]?.category).toBeTruthy();
  });

  it("gets an article by slug", () => {
    const article = getArticleBySlug("i-cant-log-in");
    expect(article).toBeDefined();
    expect(article?.title.toLowerCase()).toContain("log in");
  });

  it("groups articles into support categories", () => {
    const categories = getCategories();
    const accountAndLogin = categories.find(
      (category) => category.slug === "my-account-and-login"
    );

    expect(categories.length).toBeGreaterThan(10);
    expect(accountAndLogin).toBeDefined();
    expect(accountAndLogin?.articles.length).toBeGreaterThan(0);
  });

  it("returns global slug list", () => {
    expect(getAllSlugs()).toContain("change-your-password");
  });

  it("searches articles by query terms", () => {
    const results = searchArticles("cant login password reset");
    const resultSlugs = results.map((article) => article.slug);
    expect(resultSlugs).toContain("i-cant-log-in");
  });
});
