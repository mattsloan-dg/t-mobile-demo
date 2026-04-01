import { NextResponse } from "next/server";
import { loadHelpArticles, buildArticleContext } from "@/lib/rag";

export async function GET() {
  const articles = loadHelpArticles();
  const context = buildArticleContext(articles);
  return NextResponse.json({ articles, context });
}
